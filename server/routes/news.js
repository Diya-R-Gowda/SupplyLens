const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const mongoose = require('mongoose');
const NewsCache = require('../models/NewsCache');
const { listDemoNews } = require('../services/demoStore');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const isDemoMode = () => mongoose.connection.readyState !== 1;

router.get('/:supplierId', auth, asyncHandler(async (req, res) => {
	if (isDemoMode()) {
		return sendSuccess(res, listDemoNews(req.params.supplierId));
	}

	const news = await NewsCache.find({ supplierId: req.params.supplierId })
		.sort({ publishedAt: -1 })
		.limit(5)
		.lean();

	return sendSuccess(res, news);
}));

module.exports = router;
