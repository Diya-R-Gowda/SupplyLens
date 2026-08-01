const cron = require('node-cron');
const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const { fetchAndSentimentTagNews } = require('../services/newsService');
const { computeRiskScore } = require('../services/riskScoreService');

// Every 6 hours - frequent enough that news stays reasonably fresh, without
// hammering NewsAPI's free-tier daily request quota (100/day) across every
// supplier in every org.
const SCHEDULE = '0 */6 * * *';

const runNewsAndRiskUpdate = async () => {
  if (mongoose.connection.readyState !== 1) {
    console.log('newsCron: skipping run, MongoDB not connected (demo mode)');
    return;
  }

  console.log('newsCron: starting news + risk update...');
  const suppliers = await Supplier.find({});

  for (const supplier of suppliers) {
    await fetchAndSentimentTagNews(supplier);
    await computeRiskScore(supplier, 'scheduled_news_update');
  }
  console.log(`newsCron: update complete for ${suppliers.length} supplier(s).`);
};

const start = () => {
  cron.schedule(SCHEDULE, runNewsAndRiskUpdate);
  console.log(`newsCron: scheduled (${SCHEDULE})`);
};

module.exports = { start, runNewsAndRiskUpdate };
