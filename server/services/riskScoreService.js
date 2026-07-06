const NewsCache = require('../models/NewsCache');
const Document = require('../models/Document');
const countryRiskMap = require('../data/countryRisk.json');

exports.computeRiskScore = async (supplier) => {
  // 1. News Sentiment (40%)
  const news = await NewsCache.find({ supplierId: supplier._id });
  const negativeArticles = news.filter(n => n.sentiment === 'negative').length;
  let newsScore = negativeArticles >= 2 ? 100 : (negativeArticles === 1 ? 50 : 0);

  // 2. Contract Expiry (30%)
  let expiryScore = 0;
  if (supplier.contractExpiry) {
    const daysToExpiry = (new Date(supplier.contractExpiry) - new Date()) / (1000 * 60 * 60 * 24);
    if (daysToExpiry <= 30) expiryScore = 100;
    else if (daysToExpiry <= 90) expiryScore = 50;
  } else {
    expiryScore = 75; // Unknown is risky
  }

  // 3. Missing Documents (20%)
  const docCount = await Document.countDocuments({ supplierId: supplier._id });
  let docScore = docCount >= 3 ? 0 : (docCount >= 1 ? 50 : 100);

  // 4. Country Risk (10%)
  let countryScore = countryRiskMap[supplier.country] || 50;

  // Final Weighted Calculation
  const totalScore = (newsScore * 0.4) + (expiryScore * 0.3) + (docScore * 0.2) + (countryScore * 0.1);
  
  supplier.riskScore = Math.round(totalScore);
  await supplier.save();
};