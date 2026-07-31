const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Supplier = require('../models/Supplier');
const Organisation = require('../models/Organisation');
const { registerDemoUser, findDemoUser, getDemoUserById } = require('../services/demoStore');
const { issueTokenPair, consumeRefreshToken, revokeRefreshToken } = require('../services/tokenService');

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

const authResponse = async (res, status, user, demo) => {
	const tokens = await issueTokenPair(user, { demo });
	return res.status(status).json({
		...tokens,
		user: {
			email: user.email,
			role: user.role,
			orgId: String(user.orgId),
		},
	});
};

router.post('/register', async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ msg: 'Email and password are required' });
	}

	try {
		const demo = isDemoMode();

		if (!demo) {
			const existing = await User.findOne({ email });
			if (existing) {
				return res.status(409).json({ msg: 'An account with this email already exists' });
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

			return authResponse(res, 201, user, demo);
		}

		const demoUser = registerDemoUser(email, password);
		if (!demoUser) {
			return res.status(409).json({ msg: 'An account with this email already exists' });
		}

		return authResponse(res, 201, demoUser, demo);
	} catch (error) {
		console.error(error);
		return res.status(500).send('Server Error');
	}
});

router.post('/login', async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ msg: 'Email and password are required' });
	}

	try {
		const demo = isDemoMode();

		if (!demo) {
			const user = await User.findOne({ email });
			if (!user) {
				return res.status(401).json({ msg: 'Invalid credentials' });
			}

			const isMatch = await bcrypt.compare(password, user.password);
			if (!isMatch) {
				return res.status(401).json({ msg: 'Invalid credentials' });
			}

			return authResponse(res, 200, user, demo);
		}

		const demoUser = findDemoUser(email, password);
		if (!demoUser) {
			return res.status(401).json({ msg: 'Invalid credentials' });
		}

		return authResponse(res, 200, demoUser, demo);
	} catch (error) {
		console.error(error);
		return res.status(500).send('Server Error');
	}
});

router.post('/refresh', async (req, res) => {
	const { refreshToken } = req.body;

	if (!refreshToken) {
		return res.status(400).json({ msg: 'Refresh token is required' });
	}

	try {
		const demo = isDemoMode();
		const userId = await consumeRefreshToken(refreshToken, { demo });
		if (!userId) {
			return res.status(401).json({ msg: 'Invalid or expired refresh token', code: 'REFRESH_TOKEN_INVALID' });
		}

		const user = demo ? getDemoUserById(userId) : await User.findById(userId);
		if (!user) {
			return res.status(401).json({ msg: 'Invalid or expired refresh token', code: 'REFRESH_TOKEN_INVALID' });
		}

		return authResponse(res, 200, user, demo);
	} catch (error) {
		console.error(error);
		return res.status(500).send('Server Error');
	}
});

router.post('/logout', async (req, res) => {
	const { refreshToken } = req.body;

	if (!refreshToken) {
		return res.status(400).json({ msg: 'Refresh token is required' });
	}

	try {
		await revokeRefreshToken(refreshToken, { demo: isDemoMode() });
		return res.json({ msg: 'Logged out' });
	} catch (error) {
		console.error(error);
		return res.status(500).send('Server Error');
	}
});

module.exports = router;
