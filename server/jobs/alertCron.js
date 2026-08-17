const cron = require('node-cron');
const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const User = require('../models/User');
const CronRunLog = require('../models/CronRunLog');
const AlertNotificationLog = require('../models/AlertNotificationLog');
const { getOrgAlertThresholds } = require('../services/riskConfigService');
const { evaluateAlerts } = require('../services/alertService');
const { sendAlertBreachEmail } = require('../services/notificationService');
const logger = require('../config/logger');

// 15 minutes, tighter than newsCron (6h) or snapshotCron (24h) - unlike
// those, a breach notification is genuinely time-sensitive: the whole point
// of this cron existing (see TODO.md) is to close the gap between "a
// breach is detected" (compute-on-read, alertService.js) and "someone who
// can act on it actually finds out."
const SCHEDULE = '*/15 * * * *';
const JOB_NAME = 'alertCron';

// Buffer above the 15-minute cadence itself, same reasoning as
// newsCron/snapshotCron's own buffers.
const CATCH_UP_WINDOW_MS = 20 * 60 * 1000;

// sendFn is injectable (defaults to the real notificationService call) so
// tests can exercise the real dedup/DB logic below against a real in-memory
// Mongo instance without a real SMTP server - not a mock of this module,
// just a plain parameter, same as any other dependency-injected function.
exports.runAlertCheck = async (sendFn = sendAlertBreachEmail) => {
  if (mongoose.connection.readyState !== 1) {
    logger.info('alertCron: skipping run, MongoDB not connected (demo mode)');
    return;
  }

  logger.info('alertCron: checking for alert-threshold breaches...');
  const suppliers = await Supplier.find({});
  const thresholdsByOrg = new Map();
  let notified = 0;

  for (const supplier of suppliers) {
    const orgKey = String(supplier.orgId);
    if (!thresholdsByOrg.has(orgKey)) {
      thresholdsByOrg.set(orgKey, await getOrgAlertThresholds(supplier.orgId));
    }
    const thresholds = thresholdsByOrg.get(orgKey);
    if (!thresholds.enabled) continue;

    const { risk, health } = evaluateAlerts(supplier, thresholds);

    for (const [alertType, breach] of [['risk', risk], ['health', health]]) {
      const existing = await AlertNotificationLog.findOne({ supplierId: supplier._id, alertType });

      if (!breach.breached) {
        // Breach cleared (or was never active) - drop any stale dedup row
        // so a future re-breach notifies again instead of being silently
        // suppressed forever.
        if (existing) await AlertNotificationLog.deleteOne({ _id: existing._id });
        continue;
      }

      if (existing) continue; // still breached, already notified - skip

      const users = await User.find({ orgId: supplier.orgId, notifyOnAlert: true });
      let anySent = false;
      for (const user of users) {
        const sent = await sendFn(user, supplier, { type: alertType, score: breach.score, threshold: breach.threshold });
        anySent = anySent || sent;
      }

      // Only record "notified" once a send genuinely succeeded. Deliberately
      // NOT recorded when there were zero opted-in users either - if nobody
      // was opted in yet when this breach started, and someone opts in
      // later while it's still ongoing, they should still get notified for
      // it; marking it "handled" with nobody actually told would silently
      // swallow that. Same "keep retrying, don't silently give up" posture
      // as an SMTP send failure - both just mean the next tick tries again.
      if (anySent) {
        await AlertNotificationLog.findOneAndUpdate(
          { supplierId: supplier._id, alertType },
          { lastNotifiedAt: new Date() },
          { upsert: true }
        );
        notified++;
      }
    }
  }

  await CronRunLog.findOneAndUpdate(
    { jobName: JOB_NAME },
    { lastRunAt: new Date() },
    { upsert: true }
  );
  logger.info({ supplierCount: suppliers.length, notified }, 'alertCron: check complete');
};

// Same reasoning as newsCron.js/snapshotCron.js's own catch-up check -
// node-cron never retroactively runs a slot the process was down for.
const catchUpIfMissed = async () => {
  if (mongoose.connection.readyState !== 1) return;
  const lastRun = await CronRunLog.findOne({ jobName: JOB_NAME });
  const isOverdue = !lastRun || (Date.now() - lastRun.lastRunAt.getTime()) > CATCH_UP_WINDOW_MS;
  if (isOverdue) {
    logger.info('alertCron: last scheduled run is overdue (or none found) - running a catch-up pass now.');
    await exports.runAlertCheck();
  }
};

exports.start = () => {
  cron.schedule(SCHEDULE, () => exports.runAlertCheck());
  logger.info({ schedule: SCHEDULE }, 'alertCron: scheduled');
  catchUpIfMissed().catch((err) => logger.error({ err }, 'alertCron: catch-up check failed'));
};
