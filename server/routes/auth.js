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

router.post('/logout', asyncHandler(async (req, res) => {
	const { refreshToken } = req.body;
	if (!refreshToken) {
		throw new ApiError('Refresh token is required', 400, 'REFRESH_TOKEN_REQUIRED');
	}

	await revokeRefreshToken(refreshToken, { demo: isDemoMode() });
	return sendSuccess(res, null, { message: 'Logged out' });
}));

module.exports = router;
