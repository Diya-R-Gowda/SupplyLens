const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const mongoose = require('mongoose');
const NewsCache = require('../models/NewsCache');
const { listDemoNews } = require('../services/demoStore');

router.get('/:supplierId', auth, async (req, res) => {
	try {
		if (mongoose.connection.readyState !== 1) {
			return res.json(listDemoNews(req.params.supplierId));
		}

		const news = await NewsCache.find({ supplierId: req.params.supplierId })
			.sort({ publishedAt: -1 })
			.limit(5)
			.lean();

		return res.json(news);
	} catch (err) {
		console.error(err);
		return res.status(500).send('Error loading news');
	}
});

module.exports = router;
