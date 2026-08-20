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
const Organisation = require('../models/Organisation');
const Conversation = require('../models/Conversation');
const RefreshToken = require('../models/RefreshToken');
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

const updateRoleValidation = [
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

  // Keep Organisation.adminCount correct at every site that can change how
  // many admins an org has - this is the "gains a new admin" site. A plain
  // atomic $inc is sufficient here (no transaction needed): unlike the
  // demote-an-existing-admin path in the role-management route below,
  // there's no invariant to protect against racing down past zero - adding
  // an admin can never make the count invalid.
  if (role === 'admin') {
    await Organisation.updateOne({ _id: req.user.orgId }, { $inc: { adminCount: 1 } });
  }

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

/**
 * @swagger
 * /org/users:
 *   get:
 *     summary: List the caller's org members (admin only)
 *     description: >
 *       Backs the role-management UI - lists every user in the caller's org (email + role only,
 *       never the password hash). Not available in demo mode (returns an empty list rather than
 *       erroring, matching the read-side degrade-gracefully convention every other GET in this
 *       file/orgAnalytics.js already uses).
 *     tags: [Config]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Org members
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       403:
 *         description: Caller is not an org admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
router.get('/users', auth, requireRole('admin'), asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    return sendSuccess(res, []);
  }

  const users = await User.find({ orgId: req.user.orgId }).sort({ email: 1 });
  return sendSuccess(res, users.map((u) => ({ _id: String(u._id), email: u.email, role: u.role })));
}));

/**
 * @swagger
 * /org/users/{userId}/role:
 *   patch:
 *     summary: Change an existing org member's role (admin only)
 *     description: >
 *       Closes the other half of the gap invite-user opened: an org could gain a viewer, but had no
 *       way to ever change anyone's role afterward. The target user lookup is scoped by orgId, not
 *       a bare findById - an admin can only ever see or change a 404 (not a 403) for a user ID
 *       outside their own org, never confirming via status code whether that ID exists at all.
 *       Two rejections, both 400: an admin can't change their own role (sidesteps lockout logic
 *       entirely - ask another admin), and the last remaining admin in an org can't be demoted
 *       (would leave the org with zero admins, permanently locking out risk-config/invite/role
 *       management). Not available in demo mode.
 *     tags: [Config]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [admin, viewer] }
 *     responses:
 *       200:
 *         description: Updated user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       400:
 *         description: Invalid role, self-role-change, last-admin rejection, or unavailable in demo mode
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
 *       404:
 *         description: No user with that ID in the caller's org
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
router.patch('/users/:userId/role', auth, requireRole('admin'), validate(updateRoleValidation), asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    throw new ApiError('Changing roles is not available in demo mode', 400, 'DEMO_MODE_UNSUPPORTED');
  }

  const { userId } = req.params;
  const { role } = req.body;

  // A plain read-then-write count check here has a real TOCTOU race: two
  // admins demoting each other at once can both read adminCount=2, both
  // pass, and the org ends up with zero admins. Wrapping that same
  // read-then-write in a session transaction does NOT close it either -
  // confirmed empirically, not just reasoned about, before this landed.
  // MongoDB transactions give snapshot isolation, not full serializability:
  // the two concurrent requests each read both users' roles (overlapping
  // reads) but write to two DIFFERENT User documents (disjoint writes), so
  // there's no document-level conflict for MongoDB to detect and force a
  // retry on - a textbook "write skew" anomaly. The real fix needs both
  // concurrent requests to contend for a write on the SAME document:
  // Organisation.adminCount is that document, and the demote path below
  // uses a single atomic, guarded findOneAndUpdate ({adminCount: {$gt: 1}})
  // to decrement it - a real MongoDB document-level compare-and-swap, which
  // MongoDB always serializes correctly even across two racing
  // transactions. See server/tests/orgConfig.test.js's concurrency test,
  // which reproduces the original race and confirms this fix closes it
  // (one request now genuinely gets LAST_ADMIN, not both silently
  // succeeding), and TODO.md for the fuller writeup of why the bare
  // transaction attempt wasn't enough.
  const session = await mongoose.startSession();
  let updatedUser;
  let oldRole;

  try {
    await session.withTransaction(async () => {
      // Org-scoped lookup, not User.findById(userId) - an admin must never
      // be able to look up or change a user outside their own org, even by
      // guessing/obtaining a valid-looking ID. 404 (not 403) so the
      // response never confirms whether that ID exists somewhere else.
      const targetUser = await User.findOne({ _id: userId, orgId: req.user.orgId }).session(session);
      if (!targetUser) {
        throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (String(targetUser._id) === String(req.user.id)) {
        throw new ApiError('You cannot change your own role', 400, 'SELF_ROLE_CHANGE');
      }

      if (targetUser.role === 'admin' && role !== 'admin') {
        // Atomic, guarded decrement - the query condition (adminCount > 1)
        // and the $inc happen as one document operation, so two concurrent
        // demotions racing against the same org can never both succeed:
        // MongoDB serializes writes to the same document, and whichever
        // loses the race sees a null result here (its guard condition no
        // longer matches once the other's decrement has landed) rather than
        // a stale, pre-race count.
        const org = await Organisation.findOneAndUpdate(
          { _id: req.user.orgId, adminCount: { $gt: 1 } },
          { $inc: { adminCount: -1 } },
          { session },
        );
        if (!org) {
          throw new ApiError('Cannot remove the last admin from the organisation', 400, 'LAST_ADMIN');
        }
      } else if (targetUser.role !== 'admin' && role === 'admin') {
        await Organisation.updateOne({ _id: req.user.orgId }, { $inc: { adminCount: 1 } }, { session });
      }

      oldRole = targetUser.role;
      targetUser.role = role;
      await targetUser.save({ session });
      updatedUser = targetUser;
    }, { readConcern: 'snapshot', writeConcern: { w: 'majority' } });
  } finally {
    await session.endSession();
  }

  await recordAuditLog({
    orgId: req.user.orgId,
    userId: req.user.id,
    action: 'user.role_updated',
    targetType: 'User',
    targetId: updatedUser._id,
    detail: { email: updatedUser.email, oldRole, newRole: role },
  });

  return sendSuccess(res, { _id: String(updatedUser._id), email: updatedUser.email, role: updatedUser.role });
}));

/**
 * @swagger
 * /org/users/{userId}:
 *   delete:
 *     summary: Remove a member from the caller's org (admin only)
 *     description: >
 *       Closes the gap flagged during the role-management work: Organisation.adminCount must
 *       decrement when an admin is deleted, and no deletion endpoint existed to do that before
 *       this. Reuses the exact same guards as PATCH .../role - org-scoped lookup (404, not 403,
 *       for a userId outside the caller's org), a self-delete rejection (400 SELF_DELETE - ask
 *       another admin instead), and the same atomic, session-guarded Organisation.adminCount
 *       decrement (400 LAST_ADMIN) if the target is an admin - all inside one transaction so the
 *       count and the deletion can never drift apart if either write fails. Also cleans up the
 *       departing user's own Conversation history and RefreshTokens (both required refs to User,
 *       and neither should outlive the account), and clears Organisation.owner if the deleted
 *       user held it (owner is informational only - RBAC is purely role-based - so this is a safe
 *       default, not a design risk). AuditLog rows are deliberately left alone: the frontend
 *       already renders a missing/deleted actor as "unknown user", so the audit trail correctly
 *       survives past the actor's own deletion. Not available in demo mode.
 *     tags: [Config]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       400:
 *         description: Self-delete, last-admin rejection, or unavailable in demo mode
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
 *       404:
 *         description: No user with that ID in the caller's org
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */
router.delete('/users/:userId', auth, requireRole('admin'), asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    throw new ApiError('Deleting users is not available in demo mode', 400, 'DEMO_MODE_UNSUPPORTED');
  }

  const { userId } = req.params;

  const session = await mongoose.startSession();
  let deletedUser;

  try {
    await session.withTransaction(async () => {
      const targetUser = await User.findOne({ _id: userId, orgId: req.user.orgId }).session(session);
      if (!targetUser) {
        throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (String(targetUser._id) === String(req.user.id)) {
        throw new ApiError('You cannot delete your own account', 400, 'SELF_DELETE');
      }

      if (targetUser.role === 'admin') {
        // Same atomic, guarded compare-and-swap proven against the exact
        // same race in PATCH .../role above - see that route's comment for
        // why a bare transaction alone isn't enough.
        const org = await Organisation.findOneAndUpdate(
          { _id: req.user.orgId, adminCount: { $gt: 1 } },
          { $inc: { adminCount: -1 } },
          { session },
        );
        if (!org) {
          throw new ApiError('Cannot remove the last admin from the organisation', 400, 'LAST_ADMIN');
        }
      }

      await Conversation.deleteMany({ userId: targetUser._id }).session(session);
      await RefreshToken.deleteMany({ user: targetUser._id }).session(session);
      await Organisation.updateOne(
        { _id: req.user.orgId, owner: targetUser._id },
        { $unset: { owner: 1 } },
        { session },
      );
      await User.deleteOne({ _id: targetUser._id }).session(session);

      deletedUser = targetUser;
    }, { readConcern: 'snapshot', writeConcern: { w: 'majority' } });
  } finally {
    await session.endSession();
  }

  await recordAuditLog({
    orgId: req.user.orgId,
    userId: req.user.id,
    action: 'user.deleted',
    targetType: 'User',
    targetId: deletedUser._id,
    detail: { email: deletedUser.email, role: deletedUser.role },
  });

  return sendSuccess(res, { _id: String(deletedUser._id), email: deletedUser.email });
}));

module.exports = router;
