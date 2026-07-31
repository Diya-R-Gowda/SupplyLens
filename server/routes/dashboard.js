const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Supplier = require('../models/Supplier');
const { listDemoSuppliers } = require('../services/demoStore');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const isDemoMode = () => mongoose.connection.readyState !== 1;

const DAY_MS = 24 * 60 * 60 * 1000;

const roundToOneDecimal = (value) => Math.round(value * 10) / 10;

const dateKey = (date) => date.toISOString().slice(0, 10);

// Always returns exactly 30 entries (oldest to newest, today last), zero-filled
// for days with no new suppliers, so the chart's x-axis is a continuous range
// rather than only the days something happened to be created.
const buildEmptyGrowthSeries = () => {
  const series = [];
  for (let i = 29; i >= 0; i -= 1) {
    series.push({ date: dateKey(new Date(Date.now() - i * DAY_MS)), count: 0 });
  }
  return series;
};

const mergeGrowthCounts = (countsByDate) => {
  const series = buildEmptyGrowthSeries();
  for (const entry of series) {
    if (countsByDate.has(entry.date)) entry.count = countsByDate.get(entry.date);
  }
  return series;
};

// Shared shape builder for demo mode - mirrors what the Mongo aggregation
// below computes, so the frontend sees an identical response shape either way.
const computeStatsFromList = (suppliers) => {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * DAY_MS;
  const thirtyDaysAgo = now - 30 * DAY_MS;

  const totalSuppliers = suppliers.length;
  const averageRiskScore = totalSuppliers
    ? roundToOneDecimal(suppliers.reduce((sum, s) => sum + (s.riskScore || 0), 0) / totalSuppliers)
    : 0;

  const categoryCounts = new Map();
  for (const supplier of suppliers) {
    const key = supplier.category || 'uncategorized';
    categoryCounts.set(key, (categoryCounts.get(key) || 0) + 1);
  }
  const byCategory = [...categoryCounts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const last7Days = suppliers.filter((s) => new Date(s.createdAt).getTime() >= sevenDaysAgo).length;
  const last30Days = suppliers.filter((s) => new Date(s.createdAt).getTime() >= thirtyDaysAgo).length;

  const countsByDate = new Map();
  for (const supplier of suppliers) {
    const key = dateKey(new Date(supplier.createdAt));
    countsByDate.set(key, (countsByDate.get(key) || 0) + 1);
  }
  const growthSeries = mergeGrowthCounts(countsByDate);

  return {
    totalSuppliers,
    averageRiskScore,
    byCategory,
    newSuppliers: { last7Days, last30Days },
    growthSeries,
  };
};

router.get('/stats', auth, asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    const suppliers = listDemoSuppliers(req.user.orgId);
    return sendSuccess(res, computeStatsFromList(suppliers));
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS);
  const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS);

  const [result] = await Supplier.aggregate([
    { $match: { orgId: new mongoose.Types.ObjectId(req.user.orgId) } },
    {
      $facet: {
        totals: [
          { $group: { _id: null, totalSuppliers: { $sum: 1 }, averageRiskScore: { $avg: '$riskScore' } } },
        ],
        byCategory: [
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        last7Days: [
          { $match: { createdAt: { $gte: sevenDaysAgo } } },
          { $count: 'count' },
        ],
        last30Days: [
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          { $count: 'count' },
        ],
        growthByDay: [
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        ],
      },
    },
  ]);

  const totals = result.totals[0] || { totalSuppliers: 0, averageRiskScore: 0 };
  const countsByDate = new Map(result.growthByDay.map((entry) => [entry._id, entry.count]));

  return sendSuccess(res, {
    totalSuppliers: totals.totalSuppliers,
    averageRiskScore: totals.averageRiskScore != null ? roundToOneDecimal(totals.averageRiskScore) : 0,
    byCategory: result.byCategory.map((c) => ({ category: c._id || 'uncategorized', count: c.count })),
    newSuppliers: {
      last7Days: result.last7Days[0]?.count || 0,
      last30Days: result.last30Days[0]?.count || 0,
    },
    growthSeries: mergeGrowthCounts(countsByDate),
  });
}));

module.exports = router;
