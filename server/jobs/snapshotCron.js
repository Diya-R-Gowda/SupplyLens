const cron = require('node-cron');
const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const CronRunLog = require('../models/CronRunLog');
const { takeSnapshot } = require('../services/snapshotService');
const logger = require('../config/logger');

// Daily, not hourly/6-hourly like newsCron - a full twin-state snapshot is
// for historical comparison/auditing ("what did this supplier look like a
// week ago"), not for freshness, so a coarser cadence is intentional. At
// this rate the 100-snapshot retention cap (snapshotService.js) covers
// ~3+ months of scheduled history per supplier, in addition to whatever
// manual snapshots get taken. Revisit if a different cadence turns out to
// matter more in practice (see TODO.md).
const SCHEDULE = '0 2 * * *';
const JOB_NAME = 'snapshotCron';

// Buffer above the 24h cadence itself, so a normal on-time run followed by a
// same-day restart doesn't trigger a spurious duplicate catch-up run.
const CATCH_UP_WINDOW_MS = 25 * 60 * 60 * 1000;

const runScheduledSnapshots = async () => {
  if (mongoose.connection.readyState !== 1) {
    logger.info('snapshotCron: skipping run, MongoDB not connected (demo mode)');
    return;
  }

  logger.info('snapshotCron: starting scheduled snapshots...');
  const suppliers = await Supplier.find({});

  for (const supplier of suppliers) {
    await takeSnapshot(supplier, 'scheduled');
  }
  await CronRunLog.findOneAndUpdate(
    { jobName: JOB_NAME },
    { lastRunAt: new Date() },
    { upsert: true }
  );
  logger.info({ supplierCount: suppliers.length }, 'snapshotCron: snapshot complete');
};

// node-cron's scheduler is a single in-process setTimeout heartbeat - if the
// process is down, suspended, or otherwise unable to fire across an entire
// scheduled slot (a prod deploy or crash-restart landing on 2am, or - as
// observed in dev - the host machine sleeping overnight), node-cron logs
// that slot as "missed" and moves on; it never retroactively runs it. Left
// alone, that silently starves the daily cadence Phase 6's forecasting
// depends on for evenly-spaced data. This boot-time check closes that gap:
// if the last completed run is missing or older than the cadence (plus a
// buffer), run once immediately before arming the regular schedule.
const catchUpIfMissed = async () => {
  if (mongoose.connection.readyState !== 1) return;
  const lastRun = await CronRunLog.findOne({ jobName: JOB_NAME });
  const isOverdue = !lastRun || (Date.now() - lastRun.lastRunAt.getTime()) > CATCH_UP_WINDOW_MS;
  if (isOverdue) {
    logger.info('snapshotCron: last scheduled run is overdue (or none found) - running a catch-up pass now.');
    await runScheduledSnapshots();
  }
};

const start = () => {
  cron.schedule(SCHEDULE, runScheduledSnapshots);
  logger.info({ schedule: SCHEDULE }, 'snapshotCron: scheduled');
  catchUpIfMissed().catch((err) => logger.error({ err }, 'snapshotCron: catch-up check failed'));
};

module.exports = { start, runScheduledSnapshots };
