const cron = require('node-cron');
const Supplier = require('../models/Supplier');
const { fetchAndSentimentTagNews } = require('../services/newsService');
const { computeRiskScore } = require('../services/riskScoreService');

// Runs every night at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running nightly Risk & News update...');
  const suppliers = await Supplier.find({});
  
  for (const supplier of suppliers) {
    // 1. Get new news
    await fetchAndSentimentTagNews(supplier);
    // 2. Recompute score based on new news + dates
    await computeRiskScore(supplier);
  }
  console.log('Update complete.');
});