const cron = require('node-cron');
const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const CronRunLog = require('../models/CronRunLog');
const { fetchAndSentimentTagNews } = require('../services/newsService');
const { syncScoresAfterChange } = require('../services/twinSyncService');
const logger = require('../config/logger');

// Every 6 hours - frequent enough that news stays reasonably fresh, without
// hammering NewsAPI's free-tier daily request quota (100/day) across every
// supplier in every org.
const SCHEDULE = '0 */6 * * *';
const JOB_NAME = 'newsCron';

// Buffer above the 6h cadence itself, so a normal on-time run followed by a
// same-window restart doesn't trigger a spurious duplicate catch-up run.
const CATCH_UP_WINDOW_MS = 7 * 60 * 60 * 1000;

const runNewsAndRiskUpdate = async () => {
  if (mongoose.connection.readyState !== 1) {
    logger.info('newsCron: skipping run, MongoDB not connected (demo mode)');
    return;
  }

  logger.info('newsCron: starting news + risk update...');
  const suppliers = await Supplier.find({});

  for (const supplier of suppliers) {
    await fetchAndSentimentTagNews(supplier);
    await syncScoresAfterChange(supplier, 'scheduled_news_update');
  }
  await CronRunLog.findOneAndUpdate(
    { jobName: JOB_NAME },
    { lastRunAt: new Date() },
    { upsert: true }
  );
  logger.info({ supplierCount: suppliers.length }, 'newsCron: update complete');
};

// See snapshotCron.js for the fuller reasoning - node-cron logs a missed
// slot and moves on, it never re-runs it. Inferring "did this run" from
// RiskHistory would be wrong here specifically: a clean news-fetch pass that
// found nothing negative enough to move any score writes zero RiskHistory
// rows, which would look identical to the job never having run at all.
// CronRunLog records completion independent of whether anything changed.
const catchUpIfMissed = async () => {
  if (mongoose.connection.readyState !== 1) return;
  const lastRun = await CronRunLog.findOne({ jobName: JOB_NAME });
  const isOverdue = !lastRun || (Date.now() - lastRun.lastRunAt.getTime()) > CATCH_UP_WINDOW_MS;
  if (isOverdue) {
    logger.info('newsCron: last scheduled run is overdue (or none found) - running a catch-up pass now.');
    await runNewsAndRiskUpdate();
  }
};

const start = () => {
  cron.schedule(SCHEDULE, runNewsAndRiskUpdate);
  logger.info({ schedule: SCHEDULE }, 'newsCron: scheduled');
  catchUpIfMissed().catch((err) => logger.error({ err }, 'newsCron: catch-up check failed'));
};

module.exports = { start, runNewsAndRiskUpdate };
