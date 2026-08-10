const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');
const RiskConfig = require('../models/RiskConfig');
const User = require('../models/User');
const {
  getOrgConfig,
  upsertOrgConfig,
  validateRiskWeights,
  validateHealthWeights,
  validateAlertThresholds,
} = require('../services/riskConfigService');
const { recordAuditLog } = require('../services/auditLogService');

// A real bug this closes: validateAlertThresholds does `'riskThreshold' in
// thresholds` - the `in` operator throws a TypeError if the right-hand side
// isn't an object at all (e.g. a client sending `"alertThresholds": "x"`),
// which would have reached the client as an uncaught 500 instead of a clean
// 400. isObject() here rejects non-object values before any of the three
// custom weight/threshold validators ever run.
const riskConfigValidation = [
  body('riskWeights').optional().isObject().withMessage('riskWeights must be an object'),
  body('healthWeights').optional().isObject().withMessage('healthWeights must be an object'),
  body('alertThresholds').optional().isObject().withMessage('alertThresholds must be an object'),
];

const isDemoMode = () => mongoose.connection.readyState !== 1;

// All three required outright (not `.optional()`, unlike auth.js's
// register/login) - this is a brand-new endpoint with no prior manual
// missing-field check to stay backward-compatible with, so a clean
// VALIDATION_ERROR for a missing field is the right default from the start.
const inviteUserValidation = [
  body('email').trim().isEmail().withMessage('Must be a valid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['admin', 'viewer']).withMessage('role must be "admin" or "viewer"'),
];

/**
 * @swagger
 * /org/risk-config:
 *   get:
 *     summary: Get the caller's org risk/health scoring weight and alert threshold configuration
 *     description: >
 *       Any authenticated user in the org can view the current config. If the org has never
 *       edited its config, this returns the same hardcoded defaults riskScoreService.js and
 *       healthScoreService.js used before Phase 5, plus Phase 5 Step 5's default alert
 *       thresholds (`isDefault: true`) - no document is created just by reading.
 *     tags: [Config]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current configuration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data:
 *                 riskWeights: { newsScore: 0.4, expiryScore: 0.3, docScore: 0.2, countryScore: 0.1 }
 *                 healthWeights: { esgScore: 0.25, logisticsScore: 0.2, docCompletenessScore: 0.15, contractHealthScore: 0.15, riskComponent: 0.25 }
 *                 alertThresholds: { riskThreshold: 70, healthThreshold: 30, enabled: true }
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
      alertThresholds: RiskConfig.DEFAULT_ALERT_THRESHOLDS,
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
 *     summary: Update the caller's org risk/health scoring weights and/or alert thresholds
 *     description: >
 *       Admin-only. Each weight object (riskWeights/healthWeights), if provided, must include
 *       every field for that formula and sum to 1 (+/- 0.005 floating-point tolerance) - a
 *       partial or non-summing set of weights is rejected outright (400) rather than silently
 *       normalized, so a misconfigured org never silently gets nonsense scores. alertThresholds
 *       has no sum constraint and accepts a partial object (e.g. just `{"enabled": false}`).
 *       Any of the three top-level fields may be omitted to leave it unchanged. Not available
 *       in demo mode.
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
 *               alertThresholds:
 *                 type: object
 *                 properties:
 *                   riskThreshold: { type: number, description: 'Alert when riskScore >= this value' }
 *                   healthThreshold: { type: number, description: 'Alert when healthScore <= this value' }
 *                   enabled: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated configuration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       400:
 *         description: Invalid weights/thresholds, or nothing provided to update
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
router.patch('/risk-config', auth, requireRole('admin'), validate(riskConfigValidation), asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    throw new ApiError('Risk config editing is not available in demo mode', 400, 'DEMO_MODE_UNSUPPORTED');
  }

  const { riskWeights, healthWeights, alertThresholds } = req.body;

  if (!riskWeights && !healthWeights && !alertThresholds) {
    throw new ApiError('Provide riskWeights, healthWeights, and/or alertThresholds to update', 400, 'NO_CONFIG_PROVIDED');
  }

  const problems = [
    ...(riskWeights ? validateRiskWeights(riskWeights) : []),
    ...(healthWeights ? validateHealthWeights(healthWeights) : []),
    ...(alertThresholds ? validateAlertThresholds(alertThresholds) : []),
  ];
  if (problems.length) {
    throw new ApiError('Invalid configuration', 400, 'INVALID_CONFIG', { problems });
  }

  const config = await upsertOrgConfig(req.user.orgId, { riskWeights, healthWeights, alertThresholds });

  await recordAuditLog({
    orgId: req.user.orgId,
    userId: req.user.id,
    action: 'riskConfig.updated',
    targetType: 'RiskConfig',
    targetId: config._id,
    detail: { fieldsChanged: Object.keys(req.body) },
  });

  return sendSuccess(res, config);
}));

/**
 * @swagger
 * /org/invite-user:
 *   post:
 *     summary: Create a new user in the caller's org, with an explicit role (admin only)
 *     description: >
 *       Closes a real gap found during the Phase 10 audit/build: `POST /auth/register` always
 *       creates a brand-new organisation with the caller as its admin - there was previously no
 *       way for an existing org to ever gain a second member at all, let alone a `viewer`. This is
 *       the minimal real fix: an admin directly provisions a teammate's account (email + password
 *       + role) into their own org. It is NOT an email-invite-link flow (no email is sent, no
 *       pending/accept state) - the created account is real and immediately usable, the admin is
 *       just responsible for sharing the password out of band. A real invite-link UX is a
 *       reasonable future enhancement (see TODO.md), not required for the role to be genuinely
 *       reachable today. Not available in demo mode.
 *     tags: [Config]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, role]
 *             properties:
 *               email: { type: string, format: email, example: teammate@acme.com }
 *               password: { type: string, format: password, example: secret123 }
 *               role: { type: string, enum: [admin, viewer], example: viewer }
 *     responses:
 *       201:
 *         description: User created in the caller's org
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data: { email: teammate@acme.com, role: viewer, orgId: 6a6cf137f857b1ef1c7001d5 }
 *       400:
 *         description: A field failed validation, or unavailable in demo mode
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
 *       409:
 *         description: An account with this email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: An account with this email already exists, code: EMAIL_TAKEN }
 */
router.post('/invite-user', auth, requireRole('admin'), validate(inviteUserValidation), asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    throw new ApiError('Inviting users is not available in demo mode', 400, 'DEMO_MODE_UNSUPPORTED');
  }

  const { email, password, role } = req.body;

  // Email is globally unique (User.email's schema index), not just
  // per-org - same constraint /auth/register already enforces.
  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError('An account with this email already exists', 409, 'EMAIL_TAKEN');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    email, password: hashedPassword, role, orgId: req.user.orgId,
  });

  await recordAuditLog({
    orgId: req.user.orgId,
    userId: req.user.id,
    action: 'user.invited',
    targetType: 'User',
    targetId: user._id,
    detail: { email: user.email, role: user.role },
  });

  return sendSuccess(res, { email: user.email, role: user.role, orgId: String(user.orgId) }, { status: 201 });
}));

module.exports = router;
