const mongoose = require('mongoose');
const RiskHistory = require('../models/RiskHistory');
const HealthHistory = require('../models/HealthHistory');
const SupplierSnapshot = require('../models/SupplierSnapshot');
const { forecastFromPoints } = require('./forecastService');

// Per-supplier series: each RiskHistory/HealthHistory row already records a
// real observed score at a real timestamp (the score right after that
// change), so the rows themselves are the point series - no extra
// aggregation needed, unlike the portfolio case below.
const supplierPoints = async (Model, supplierId) => {
  const rows = await Model.find({ supplierId }).select('createdAt newScore').sort({ createdAt: 1 }).lean();
  return rows.map((row) => ({ timestamp: row.createdAt, score: row.newScore }));
};

exports.getSupplierForecast = async (supplier) => {
  const [riskPoints, healthPoints] = await Promise.all([
    supplierPoints(RiskHistory, supplier._id),
    supplierPoints(HealthHistory, supplier._id),
  ]);

  return {
    risk: forecastFromPoints(riskPoints),
    health: forecastFromPoints(healthPoints),
  };
};

// Portfolio series for FITTING the regression: every SupplierSnapshot row
// across every supplier in the org, as its own raw {timestamp, score}
// point - not filtered to a single reason, so 'scheduled'/'manual'/
// 'significant_change'/'threshold_breach' snapshots all contribute. This is
// the actual "pools more data points" mechanism the audit recommended:
// pooling across suppliers multiplies the point count directly (an org with
// 20 suppliers snapshotted twice has 40 raw points, not 2), and ordinary
// least squares handles the resulting cross-supplier scatter honestly - if
// suppliers vary a lot at a given moment, the residual (and so the
// confidence interval) widens accordingly, which is the correct behavior,
// not a defect. MIN_SPAN_HOURS still does its usual job here too: if every
// supplier's snapshot came from the same cron run a few seconds apart, the
// raw min/max span is still ~0 and sufficiency correctly fails regardless
// of how many suppliers contributed a point.
//
// A day-bucketed AVERAGE (portfolioDailySeries below) is computed
// separately, only for display (the dashboard trend chart, Step 5) - if
// fitting used day-buckets instead of raw points, an org with real activity
// spread across only 2-3 calendar days (the common case right now, even
// for orgs with a healthy raw point count) would be collapsed down to 2-3
// points and wrongly fail MIN_POINTS, understating exactly the data this
// pooling is supposed to take advantage of.
const portfolioRawPoints = async (orgId, scoreField) => {
  const rows = await SupplierSnapshot.aggregate([
    { $match: { orgId: new mongoose.Types.ObjectId(orgId) } },
    { $project: { createdAt: 1, score: `$state.${scoreField}.score` } },
    { $match: { score: { $ne: null } } },
    { $sort: { createdAt: 1 } },
  ]);

  return rows.map((row) => ({ timestamp: row.createdAt, score: row.score }));
};

// Day-bucketed average, display-only - a scatter of every supplier's raw
// snapshot score makes for a noisy, hard-to-read line; the daily average is
// the honest "portfolio trend" a human actually wants to look at. Not used
// for the regression fit itself (see portfolioRawPoints above). Caveat
// worth carrying into the API response and UI: a day's average reflects
// only the suppliers that HAD a snapshot that day, not a guaranteed
// full-portfolio average (that needs every supplier snapshotted every day
// without fail, which the daily cron aims for but can't guarantee
// retroactively for days before it existed or before its catch-up fix).
const portfolioDailySeries = async (orgId, scoreField) => {
  const rows = await SupplierSnapshot.aggregate([
    { $match: { orgId: new mongoose.Types.ObjectId(orgId) } },
    {
      $project: {
        day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        score: `$state.${scoreField}.score`,
      },
    },
    { $match: { score: { $ne: null } } },
    { $group: { _id: '$day', avgScore: { $avg: '$score' }, sampleCount: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((row) => ({
    date: row._id,
    avgScore: Math.round(row.avgScore * 10) / 10,
    sampleCount: row.sampleCount,
  }));
};

exports.getPortfolioForecast = async (orgId) => {
  const [riskPoints, healthPoints, riskDaily, healthDaily] = await Promise.all([
    portfolioRawPoints(orgId, 'risk'),
    portfolioRawPoints(orgId, 'health'),
    portfolioDailySeries(orgId, 'risk'),
    portfolioDailySeries(orgId, 'health'),
  ]);

  return {
    risk: { ...forecastFromPoints(riskPoints), historical: riskDaily },
    health: { ...forecastFromPoints(healthPoints), historical: healthDaily },
  };
};
