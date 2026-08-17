const db = require('./db');
const { app, request, registerUser } = require('./helpers');
const User = require('../models/User');
const AlertNotificationLog = require('../models/AlertNotificationLog');
const { runAlertCheck } = require('../jobs/alertCron');

beforeAll(async () => { await db.connect(); });
afterEach(async () => { await db.clearDatabase(); });
afterAll(async () => { await db.disconnect(); });

// runAlertCheck's sendFn is injected here (a plain function, not a module
// mock) so these tests exercise the real dedup/DB logic - real Supplier,
// real User, real AlertNotificationLog documents against the real in-memory
// Mongo instance - without needing a real SMTP server. Default alert
// thresholds (RiskConfig.js): riskThreshold 70, healthThreshold 30, enabled.
describe('alertCron: breach-notification dedup', () => {
  const setup = async () => {
    const org = await registerUser('alertorg');
    await User.findOneAndUpdate({ email: org.email }, { notifyOnAlert: true });

    const createRes = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ name: 'Breaching Supplier', country: 'US', category: 'raw_material', riskScore: 80 });

    return { org, supplierId: createRes.body.data._id };
  };

  test('a fresh breach sends exactly once and creates a dedup log row', async () => {
    const { supplierId } = await setup();
    const sendFn = jest.fn().mockResolvedValue(true);

    await runAlertCheck(sendFn);

    expect(sendFn).toHaveBeenCalledTimes(1);
    const [, sentSupplier, breach] = sendFn.mock.calls[0];
    expect(String(sentSupplier._id)).toBe(supplierId);
    expect(breach).toEqual({ type: 'risk', score: 80, threshold: 70 });

    const logRow = await AlertNotificationLog.findOne({ supplierId, alertType: 'risk' });
    expect(logRow).not.toBeNull();
  });

  test('a repeat tick on the same still-breached supplier does not re-send', async () => {
    const { supplierId } = await setup();
    const sendFn = jest.fn().mockResolvedValue(true);

    await runAlertCheck(sendFn);
    await runAlertCheck(sendFn);

    expect(sendFn).toHaveBeenCalledTimes(1);
    const rows = await AlertNotificationLog.find({ supplierId, alertType: 'risk' });
    expect(rows).toHaveLength(1);
  });

  test('once the breach clears, the dedup row is removed and a later re-breach sends again', async () => {
    const { org, supplierId } = await setup();
    const sendFn = jest.fn().mockResolvedValue(true);

    await runAlertCheck(sendFn);
    expect(sendFn).toHaveBeenCalledTimes(1);

    // Clear the breach.
    await request(app)
      .patch(`/api/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ riskScore: 10 });

    await runAlertCheck(sendFn);
    expect(sendFn).toHaveBeenCalledTimes(1); // still no new send
    expect(await AlertNotificationLog.findOne({ supplierId, alertType: 'risk' })).toBeNull();

    // Re-breach.
    await request(app)
      .patch(`/api/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ riskScore: 90 });

    await runAlertCheck(sendFn);
    expect(sendFn).toHaveBeenCalledTimes(2); // sends again
    expect(await AlertNotificationLog.findOne({ supplierId, alertType: 'risk' })).not.toBeNull();
  });

  test('a send failure does not create a dedup row, so the next tick retries', async () => {
    const { supplierId } = await setup();
    const sendFn = jest.fn().mockResolvedValue(false); // simulates an SMTP failure

    await runAlertCheck(sendFn);
    expect(sendFn).toHaveBeenCalledTimes(1);
    expect(await AlertNotificationLog.findOne({ supplierId, alertType: 'risk' })).toBeNull();

    await runAlertCheck(sendFn);
    expect(sendFn).toHaveBeenCalledTimes(2); // retried, not silently dropped
  });

  test('a supplier with no opted-in users in its org is skipped without error', async () => {
    const org = await registerUser('noopt');
    const createRes = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${org.accessToken}`)
      .send({ name: 'Nobody Watching', country: 'US', category: 'raw_material', riskScore: 95 });

    const sendFn = jest.fn().mockResolvedValue(true);
    await expect(runAlertCheck(sendFn)).resolves.not.toThrow();
    expect(sendFn).not.toHaveBeenCalled();
    expect(await AlertNotificationLog.findOne({ supplierId: createRes.body.data._id, alertType: 'risk' })).toBeNull();
  });

  // Explicitly clears real SMTP env vars first so this test's behavior is
  // deterministic regardless of what a developer's local .env happens to
  // have set - runAlertCheck() with no sendFn argument goes through the
  // real notificationService.sendAlertBreachEmail.
  test('with no SMTP configured, the real send path degrades gracefully (no throw, no false-positive dedup)', async () => {
    const originalHost = process.env.SMTP_HOST;
    const originalUser = process.env.SMTP_USER;
    const originalPass = process.env.SMTP_PASS;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    try {
      const { supplierId } = await setup();
      await expect(runAlertCheck()).resolves.not.toThrow();
      expect(await AlertNotificationLog.findOne({ supplierId, alertType: 'risk' })).toBeNull();
    } finally {
      if (originalHost !== undefined) process.env.SMTP_HOST = originalHost;
      if (originalUser !== undefined) process.env.SMTP_USER = originalUser;
      if (originalPass !== undefined) process.env.SMTP_PASS = originalPass;
    }
  });
});
