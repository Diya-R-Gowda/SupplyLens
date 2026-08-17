const nodemailer = require('nodemailer');
const logger = require('../config/logger');

// Nodemailer + SMTP, not a transactional email API - deliberately: this is
// the zero-new-account option (any SMTP-capable mailbox/relay works), same
// "no new signup where a keyless/no-account path exists" bias already
// applied to Nominatim geocoding. Kept as its own module (not inlined in
// alertCron.js) so the cron job's dedup/iteration logic can be tested
// without a real SMTP server - see jobs/alertCron.js's injectable sendFn.
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
};

// Never throws - a misconfigured/unreachable SMTP server must not take down
// the cron run for every other supplier. Returns whether the send actually
// succeeded so the caller (alertCron.js) only marks a breach as "notified"
// once a real send went out, not merely attempted - an SMTP outage should
// mean "keep retrying next tick," not "silently give up forever."
exports.sendAlertBreachEmail = async (user, supplier, breach) => {
  const t = getTransporter();
  if (!t) {
    logger.warn('Skipping alert email: SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS)');
    return false;
  }

  const direction = breach.type === 'risk' ? 'risen to' : 'fallen to';
  const linkBase = process.env.APP_URL ? `${process.env.APP_URL}/dashboard/suppliers/${supplier._id}` : null;

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: `SupplyLens alert: ${supplier.name}'s ${breach.type} score crossed your threshold`,
      text: [
        `${supplier.name}'s ${breach.type} score has ${direction} ${breach.score} (your org's threshold: ${breach.threshold}).`,
        linkBase ? `View this supplier: ${linkBase}` : null,
        `You're receiving this because alert notifications are enabled for your account. Turn them off in Settings if you'd rather not get these.`,
      ].filter(Boolean).join('\n\n'),
    });
    return true;
  } catch (err) {
    logger.error({ message: err.message, supplier: supplier.name, user: user.email }, 'Alert email send failed');
    return false;
  }
};
