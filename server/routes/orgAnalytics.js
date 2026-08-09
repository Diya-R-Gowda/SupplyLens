const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { getPortfolioForecast } = require('../services/predictiveAnalyticsService');
const { getPortfolioTimeline } = require('../services/portfolioTimelineService');
const { getSupplierLocations } = require('../services/geoLocationService');
const { getRiskHeatmap } = require('../services/riskHeatmapService');

const isDemoMode = () => mongoose.connection.readyState !== 1;

const DEFAULT_TIMELINE_LIMIT = 150;
const MAX_TIMELINE_LIMIT = 500;

/**
 * @swagger
 * /org/forecast:
 *   get:
 *     summary: Portfolio-level risk/health forecast, pooled across every supplier in the org
 *     description: >
 *       The audit-recommended primary forecasting feature (over per-supplier forecasts) precisely
 *       because it pools more data points: the regression is fit through every SupplierSnapshot row
 *       across every supplier in the org (org-wide, not filtered to one supplier), so an org with 20
 *       suppliers snapshotted twice contributes 40 real points, not 2. The response's `historical`
 *       field is a separate, day-bucketed daily average of the same data - display-only (reused by
 *       the dashboard's trend chart, Phase 6 Step 5), not what the regression is actually fit
 *       against. Same insufficient_data gating and honesty requirement as the per-supplier endpoint
 *       - today's portfolio data is itself still clustered around test sessions rather than
 *       organically spread, and `dataQuality`/`status` say so plainly rather than hiding it behind a
 *       confident-looking number. Not available in demo mode.
 *     tags: [Forecasting]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Forecast (or an explicit insufficient_data result) for both risk and health, plus the historical series each was fit from
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
router.get('/forecast', auth, asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    const insufficient = { status: 'insufficient_data', dataQuality: { pointCount: 0, spanHours: 0, minPointsRequired: 5, minSpanHoursRequired: 24, reason: 'no_history' }, projections: [], historical: [] };
    return sendSuccess(res, { risk: insufficient, health: insufficient });
  }

  const forecast = await getPortfolioForecast(req.user.orgId);
  return sendSuccess(res, forecast);
}));

/**
 * @swagger
 * /org/timeline:
 *   get:
 *     summary: Phase 9 Step 1 - portfolio-wide timeline, merging every supplier's real events into one chronological feed
 *     description: >
 *       Genuinely new, not a restatement of `GET /suppliers/{id}/timeline` (Phase 4, still the
 *       right place for a single supplier's history) - this pools the same 5 real event types
 *       (created/updated, document uploaded, news mentioned, risk changed, health changed) across
 *       every supplier in the org into one merged, supplier-tagged, most-recent-first feed, the same
 *       "pool across suppliers for a real portfolio view" precedent as Phase 6's `GET /org/forecast`.
 *       No true pagination across the merged multi-collection result - `days` bounds the underlying
 *       queries, `limit` caps the response, and `truncated`/`totalEvents` say honestly whether more
 *       real events exist beyond what's returned. Not available in demo mode.
 *     tags: [Visualization]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: supplierId
 *         schema: { type: string }
 *         description: Optional - restrict to one supplier's events (still via this portfolio endpoint, for a consistent shape). A supplierId outside the caller's org returns an honestly-empty result, not an error.
 *       - in: query
 *         name: days
 *         schema: { type: integer }
 *         description: Only include events from the last N days (applied before merging).
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 150, maximum: 500 }
 *         description: Max events returned after merging and sorting, most recent first.
 *     responses:
 *       200:
 *         description: Merged, supplier-tagged event feed plus totalEvents/truncated so the caller knows if more exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
router.get('/timeline', auth, asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    return sendSuccess(res, {
      events: [], totalEvents: 0, suppliersIncluded: 0, truncated: false,
    });
  }

  const days = parseInt(req.query.days, 10);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || DEFAULT_TIMELINE_LIMIT, 1), MAX_TIMELINE_LIMIT);

  const result = await getPortfolioTimeline(req.user.orgId, {
    supplierId: req.query.supplierId || undefined,
    days: Number.isFinite(days) && days > 0 ? days : undefined,
    limit,
  });
  return sendSuccess(res, result);
}));

/**
 * @swagger
 * /org/supplier-locations:
 *   get:
 *     summary: Phase 9 Step 2 - supplier locations at COUNTRY-LEVEL approximation, for the Geographic Map
 *     description: >
 *       No lat/long or address exists anywhere in this schema - `country` (a 2-letter ISO code) is
 *       the only location data any supplier has. Each supplier is mapped to its country's
 *       approximate capital-city coordinate (`server/data/countryCentroids.json`, a static lookup
 *       table, no geocoding API/key). **This is a country-level approximation, not a precise
 *       supplier location** - every supplier from the same country renders at the same point.
 *       `locatable: false` (and null lat/lng) for the rare case of a country code not in the lookup
 *       table, reported honestly rather than dropped or placed at a made-up point. Not available in
 *       demo mode.
 *     tags: [Visualization]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Per-supplier country-centroid coordinates plus risk/health scores for map markers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
router.get('/supplier-locations', auth, asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    return sendSuccess(res, {
      suppliers: [], totalSuppliers: 0, countriesRepresented: 0, unlocatableCount: 0, granularity: 'country_centroid',
    });
  }

  const result = await getSupplierLocations(req.user.orgId);
  return sendSuccess(res, result);
}));

/**
 * @swagger
 * /org/risk-heatmap:
 *   get:
 *     summary: Phase 9 Step 3 - average risk/health score per country, at COUNTRY-LEVEL granularity
 *     description: >
 *       Aggregates `GET /org/supplier-locations` by country - same country-centroid data, same
 *       honesty ceiling: this can only ever be as granular as the underlying location data, which is
 *       country-level only (no per-supplier coordinates exist anywhere in this schema). Correctly
 *       reflects the current sparse-data reality rather than hiding it - an org with suppliers in
 *       only 1-2 countries will honestly show only 1-2 entries, not a fabricated fuller picture. Not
 *       available in demo mode.
 *     tags: [Visualization]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Per-country average risk/health score and supplier count, sorted highest risk first
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
router.get('/risk-heatmap', auth, asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    return sendSuccess(res, { countries: [], countriesRepresented: 0, granularity: 'country_centroid' });
  }

  const result = await getRiskHeatmap(req.user.orgId);
  return sendSuccess(res, result);
}));

module.exports = router;
