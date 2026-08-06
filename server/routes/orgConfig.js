const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');
const RiskConfig = require('../models/RiskConfig');
const {
  getOrgConfig,
  upsertOrgConfig,
  validateRiskWeights,
  validateHealthWeights,
} = require('../services/riskConfigService');

const isDemoMode = () => mongoose.connection.readyState !== 1;

/**
 * @swagger
 * /org/risk-config:
 *   get:
 *     summary: Get the caller's org risk/health scoring weight configuration
 *     description: >
 *       Any authenticated user in the org can view the current weights. If the org has never
 *       edited its config, this returns the same hardcoded defaults riskScoreService.js and
 *       healthScoreService.js used before Phase 5 (`isDefault: true`) - no document is created
 *       just by reading.
 *     tags: [Config]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current weight configuration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data:
 *                 riskWeights: { newsScore: 0.4, expiryScore: 0.3, docScore: 0.2, countryScore: 0.1 }
 *                 healthWeights: { esgScore: 0.25, logisticsScore: 0.2, docCompletenessScore: 0.15, contractHealthScore: 0.15, riskComponent: 0.25 }
 *                 isDefault: true
 */
router.get('/risk-config', auth, asyncHandler(async (req, res) => {
  // No DB dependency for the read side - always safe to answer with the
  // hardcoded defaults, in or out of demo mode, matching timeline/twin's
  // precedent of degrading gracefully rather than erroring in demo mode.
  if (isDemoMode()) {
    return sendSuccess(res, {
      riskWeights: RiskConfig.RISK_DEFAULT_WEIGHTS,
      healthWeights: RiskConfig.HEALTH_DEFAULT_WEIGHTS,
      isDefault: true,
    });
  }

  const config = await getOrgConfig(req.user.orgId);
  return sendSuccess(res, config);
}));

/**
 * @swagger
 * /org/risk-config:
 *   patch:
 *     summary: Update the caller's org risk/health scoring weight configuration
 *     description: >
 *       Admin-only. Each weight object (riskWeights/healthWeights), if provided, must include
 *       every field for that formula and sum to 1 (+/- 0.005 floating-point tolerance) - a
 *       partial or non-summing set of weights is rejected outright (400) rather than silently
 *       normalized, so a misconfigured org never silently gets nonsense scores. Either object
 *       may be omitted to leave that formula's weights unchanged. Not available in demo mode.
 *     tags: [Config]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               riskWeights:
 *                 type: object
 *                 properties:
 *                   newsScore: { type: number }
 *                   expiryScore: { type: number }
 *                   docScore: { type: number }
 *                   countryScore: { type: number }
 *               healthWeights:
 *                 type: object
 *                 properties:
 *                   esgScore: { type: number }
 *                   logisticsScore: { type: number }
 *                   docCompletenessScore: { type: number }
 *                   contractHealthScore: { type: number }
 *                   riskComponent: { type: number }
 *     responses:
 *       200:
 *         description: Updated weight configuration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       400:
 *         description: Weights missing a field or not summing to 1
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *       403:
 *         description: Caller is not an org admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
router.patch('/risk-config', auth, requireRole('admin'), asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    throw new ApiError('Risk config editing is not available in demo mode', 400, 'DEMO_MODE_UNSUPPORTED');
  }

  const { riskWeights, healthWeights } = req.body;

  if (!riskWeights && !healthWeights) {
    throw new ApiError('Provide riskWeights and/or healthWeights to update', 400, 'NO_WEIGHTS_PROVIDED');
  }

  const problems = [
    ...(riskWeights ? validateRiskWeights(riskWeights) : []),
    ...(healthWeights ? validateHealthWeights(healthWeights) : []),
  ];
  if (problems.length) {
    throw new ApiError('Invalid weight configuration', 400, 'INVALID_WEIGHTS', { problems });
  }

  const config = await upsertOrgConfig(req.user.orgId, { riskWeights, healthWeights });
  return sendSuccess(res, config);
}));

module.exports = router;
