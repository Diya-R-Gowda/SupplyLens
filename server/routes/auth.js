const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Supplier = require('../models/Supplier');
const Organisation = require('../models/Organisation');
const { ensureDemoUser } = require('../services/demoStore');

const router = express.Router();

const signToken = (user) => jwt.sign(
	{ id: String(user._id), orgId: String(user.orgId) },
	process.env.JWT_SECRET,
	{ expiresIn: '7d' }
);

router.post('/login', async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ msg: 'Email and password are required' });
	}

	try {
		if (mongoose.connection.readyState === 1) {
			let user = await User.findOne({ email });

			if (user) {
				const isMatch = await bcrypt.compare(password, user.password);
				if (!isMatch) {
					return res.status(401).json({ msg: 'Invalid credentials' });
				}
			} else {
				const org = await Organisation.create({ name: `${email.split('@')[0]}'s Organisation` });
				const hashedPassword = await bcrypt.hash(password, 10);
				user = await User.create({
					email,
					password: hashedPassword,
					role: 'admin',
					orgId: org._id,
				});
				org.owner = user._id;
				await org.save();

				const orgId = org._id;
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
			}

			return res.json({
				token: signToken(user),
				user: {
					email: user.email,
					role: user.role,
					orgId: String(user.orgId),
				},
			});
		}

		const demoUser = ensureDemoUser(email, password);
		if (!demoUser) {
			return res.status(401).json({ msg: 'Invalid credentials' });
		}

		return res.json({
			token: signToken(demoUser),
			user: {
				email: demoUser.email,
				role: demoUser.role,
				orgId: String(demoUser.orgId),
			},
		});
	} catch (error) {
		console.error(error);
		return res.status(500).send('Server Error');
	}
});

module.exports = router;
