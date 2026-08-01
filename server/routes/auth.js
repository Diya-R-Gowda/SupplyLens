const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Supplier = require('../models/Supplier');
const Organisation = require('../models/Organisation');
const { registerDemoUser, findDemoUser, getDemoUserById } = require('../services/demoStore');
const { issueTokenPair, consumeRefreshToken, revokeRefreshToken } = require('../services/tokenService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const router = express.Router();

const isDemoMode = () => mongoose.connection.readyState !== 1;

const seedOrgSupplier = async (orgId) => {
	const supplierCount = await Supplier.countDocuments({ orgId });
	if (supplierCount === 0) {
		await Supplier.create({
			name: 'Northwind Logistics',
			category: 'logistics',
			country: 'US',
			riskScore: 34,
			contractExpiry: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
			paymentTerms: 'Net 30',
			orgId,
		});
	}
};

const buildAuthPayload = async (user, demo) => {
	const tokens = await issueTokenPair(user, { demo });
	return {
		...tokens,
		user: {
			email: user.email,
			role: user.role,
			orgId: String(user.orgId),
		},
	};
};

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new account and organisation
 *     description: >
 *       Creates a brand-new organisation and an admin user for it, seeds one starter supplier
 *       for the org, and returns a token pair. There is no invite-into-an-existing-org flow -
 *       every registration creates its own organisation, and the caller becomes its admin.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: jane@acme.com }
 *               password: { type: string, format: password, example: secret123 }
 *     responses:
 *       201:
 *         description: Account, organisation, and token pair created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data:
 *                 accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhNmNmMTM3Zjg1N2IxZWYxYzcwMDFkNiJ9.abc123
 *                 refreshToken: 88e81757626218e3997bad81c4666003e7d7a2ac9e3a2f1c1c571ca8f75f5f4b76d8f103485d9b52
 *                 user: { email: jane@acme.com, role: admin, orgId: 6a6cf137f857b1ef1c7001d5 }
 *       400:
 *         description: Email or password missing from the request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Email and password are required, code: CREDENTIALS_REQUIRED }
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
router.post('/register', asyncHandler(async (req, res) => {
	const { email, password } = req.body;
	if (!email || !password) {
		throw new ApiError('Email and password are required', 400, 'CREDENTIALS_REQUIRED');
	}

	const demo = isDemoMode();

	if (!demo) {
		const existing = await User.findOne({ email });
		if (existing) {
			throw new ApiError('An account with this email already exists', 409, 'EMAIL_TAKEN');
		}

		const org = await Organisation.create({ name: `${email.split('@')[0]}'s Organisation` });
		const hashedPassword = await bcrypt.hash(password, 10);
		const user = await User.create({
			email,
			password: hashedPassword,
			role: 'admin',
			orgId: org._id,
		});
		org.owner = user._id;
		await org.save();

		await seedOrgSupplier(org._id);

		return sendSuccess(res, await buildAuthPayload(user, demo), { status: 201 });
	}

	const demoUser = registerDemoUser(email, password);
	if (!demoUser) {
		throw new ApiError('An account with this email already exists', 409, 'EMAIL_TAKEN');
	}

	return sendSuccess(res, await buildAuthPayload(demoUser, demo), { status: 201 });
}));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Sign in with an existing email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: jane@acme.com }
 *               password: { type: string, format: password, example: secret123 }
 *     responses:
 *       200:
 *         description: Signed in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data:
 *                 accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhNmNmMTM3Zjg1N2IxZWYxYzcwMDFkNiJ9.abc123
 *                 refreshToken: 88e81757626218e3997bad81c4666003e7d7a2ac9e3a2f1c1c571ca8f75f5f4b76d8f103485d9b52
 *                 user: { email: jane@acme.com, role: admin, orgId: 6a6cf137f857b1ef1c7001d5 }
 *       400:
 *         description: Email or password missing from the request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Email and password are required, code: CREDENTIALS_REQUIRED }
 *       401:
 *         description: Email not found, or password does not match
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Invalid credentials, code: INVALID_CREDENTIALS }
 */
router.post('/login', asyncHandler(async (req, res) => {
	const { email, password } = req.body;
	if (!email || !password) {
		throw new ApiError('Email and password are required', 400, 'CREDENTIALS_REQUIRED');
	}

	const demo = isDemoMode();

	if (!demo) {
		const user = await User.findOne({ email });
		if (!user) {
			throw new ApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
		}

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			throw new ApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
		}

		return sendSuccess(res, await buildAuthPayload(user, demo));
	}

	const demoUser = findDemoUser(email, password);
	if (!demoUser) {
		throw new ApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
	}

	return sendSuccess(res, await buildAuthPayload(demoUser, demo));
}));

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Exchange a refresh token for a new token pair
 *     description: >
 *       Rotates on use: the refresh token supplied here is consumed and immediately invalidated,
 *       and a brand-new access/refresh pair is returned. Reusing an already-consumed or expired
 *       refresh token fails with REFRESH_TOKEN_INVALID.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string, example: 88e81757626218e3997bad81c4666003e7d7a2ac9e3a2f1c1c571ca8f75f5f4b76d8f103485d9b52 }
 *     responses:
 *       200:
 *         description: New token pair issued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data:
 *                 accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhNmNmMTM3Zjg1N2IxZWYxYzcwMDFkNiJ9.def456
 *                 refreshToken: 3a2b1c9d8e7f6051423344556677889900aabbccddeeff00112233445566778
 *                 user: { email: jane@acme.com, role: admin, orgId: 6a6cf137f857b1ef1c7001d5 }
 *       400:
 *         description: refreshToken missing from the request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Refresh token is required, code: REFRESH_TOKEN_REQUIRED }
 *       401:
 *         description: The refresh token is invalid, expired, or has already been used
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Invalid or expired refresh token, code: REFRESH_TOKEN_INVALID }
 */
router.post('/refresh', asyncHandler(async (req, res) => {
	const { refreshToken } = req.body;
	if (!refreshToken) {
		throw new ApiError('Refresh token is required', 400, 'REFRESH_TOKEN_REQUIRED');
	}

	const demo = isDemoMode();
	const userId = await consumeRefreshToken(refreshToken, { demo });
	if (!userId) {
		throw new ApiError('Invalid or expired refresh token', 401, 'REFRESH_TOKEN_INVALID');
	}

	const user = demo ? getDemoUserById(userId) : await User.findById(userId);
	if (!user) {
		throw new ApiError('Invalid or expired refresh token', 401, 'REFRESH_TOKEN_INVALID');
	}

	return sendSuccess(res, await buildAuthPayload(user, demo));
}));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Revoke a refresh token
 *     description: >
 *       Revokes the given refresh token so it can no longer be used with /auth/refresh. Does not
 *       require a Bearer access token - only the refresh token itself, since this may be called
 *       after the access token has already expired.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string, example: 88e81757626218e3997bad81c4666003e7d7a2ac9e3a2f1c1c571ca8f75f5f4b76d8f103485d9b52 }
 *     responses:
 *       200:
 *         description: Refresh token revoked (or was already invalid - this endpoint is idempotent)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data: null
 *               message: Logged out
 *       400:
 *         description: refreshToken missing from the request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Refresh token is required, code: REFRESH_TOKEN_REQUIRED }
 */
router.post('/logout', asyncHandler(async (req, res) => {
	const { refreshToken } = req.body;
	if (!refreshToken) {
		throw new ApiError('Refresh token is required', 400, 'REFRESH_TOKEN_REQUIRED');
	}

	await revokeRefreshToken(refreshToken, { demo: isDemoMode() });
	return sendSuccess(res, null, { message: 'Logged out' });
}));

module.exports = router;
