const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');

// Always called AFTER the real mutation has already succeeded, never
// before and never inside the same transaction-shaped flow as the
// mutation - a logging failure must never block or roll back a real user
// action. If the write itself fails, that's logged (not thrown) so a
// flaky audit-log write can't turn into a 500 on an otherwise-successful
// supplier delete/update/etc.
exports.recordAuditLog = async ({
  orgId, userId, action, targetType, targetId, detail,
}) => {
  try {
    await AuditLog.create({
      orgId, userId, action, targetType, targetId, detail,
    });
  } catch (err) {
    logger.error({ err, action, targetType, targetId }, 'Failed to record audit log');
  }
};
