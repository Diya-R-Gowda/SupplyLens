const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { getPortfolioForecast } = require('../services/predictiveAnalyticsService');

const isDemoMode = () => mongoose.connection.readyState !== 1;

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

module.exports = router;
