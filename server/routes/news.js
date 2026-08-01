const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const mongoose = require('mongoose');
const NewsCache = require('../models/NewsCache');
const Supplier = require('../models/Supplier');
const { listDemoNews } = require('../services/demoStore');
const { fetchAndSentimentTagNews } = require('../services/newsService');
const { computeRiskScore } = require('../services/riskScoreService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

const isDemoMode = () => mongoose.connection.readyState !== 1;

/**
 * @swagger
 * /news/{supplierId}:
 *   get:
 *     summary: List cached news/sentiment items for a supplier
 *     description: >
 *       Reads from the NewsCache collection, populated by a scheduled job (every 6 hours, see
 *       jobs/newsCron.js) and by POST /news/{supplierId}/refresh on demand. Cached items expire
 *       after 7 days (a Mongo TTL index on publishedAt) and the 5 most recent are returned.
 *     tags: [News]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: supplierId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Up to 5 cached news items, most recent first
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data:
 *                 - _id: 6a6cf137f857b1ef1c7003b1
 *                   supplierId: 6a6cf137f857b1ef1c7001e2
 *                   headline: Northwind Logistics maintains a stable delivery profile
 *                   url: 'https://example.com/article'
 *                   source: Example News
 *                   sentiment: positive
 *                   sentimentScore: 0.6
 *                   publishedAt: '2026-07-31T19:00:00.000Z'
 *       401:
 *         description: Missing, malformed, or expired access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Token has expired, code: TOKEN_EXPIRED }
 *       404:
 *         description: No such supplier in the caller's org (real mode only)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Supplier not found, code: SUPPLIER_NOT_FOUND }
 */
router.get('/:supplierId', auth, asyncHandler(async (req, res) => {
	if (isDemoMode()) {
		return sendSuccess(res, listDemoNews(req.params.supplierId));
	}

	// Same org-scoped, 404-not-403 pattern as suppliers.js/documents.js/rag.js -
	// without this, any authenticated user could read another org's cached
	// news/sentiment items just by guessing/knowing a supplierId.
	const supplier = await Supplier.findOne({ _id: req.params.supplierId, orgId: req.user.orgId });
	if (!supplier) {
		throw new ApiError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
	}

	const news = await NewsCache.find({ supplierId: req.params.supplierId, orgId: req.user.orgId })
		.sort({ publishedAt: -1 })
		.limit(5)
		.lean();

	return sendSuccess(res, news);
}));

/**
 * @swagger
 * /news/{supplierId}/refresh:
 *   post:
 *     summary: Fetch fresh news for a supplier on demand
 *     description: >
 *       Runs the same fetch-and-sentiment-tag pipeline the scheduled job uses, immediately, for
 *       one supplier - useful for testing or when a user doesn't want to wait for the next
 *       6-hourly cron run. Also recomputes the supplier's risk score from the refreshed news,
 *       same as the scheduled job does. Not available in demo mode (no real NewsAPI/Gemini calls
 *       happen there).
 *     tags: [News]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: supplierId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Refresh completed (may fetch/store zero articles if NewsAPI has nothing new)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data: { fetched: 5, stored: 3 }
 *       400:
 *         description: Not available in demo mode
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: News refresh is not available in demo mode, code: DEMO_MODE_UNSUPPORTED }
 *       404:
 *         description: No such supplier in the caller's org
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Supplier not found, code: SUPPLIER_NOT_FOUND }
 */
router.post('/:supplierId/refresh', auth, asyncHandler(async (req, res) => {
	if (isDemoMode()) {
		throw new ApiError('News refresh is not available in demo mode', 400, 'DEMO_MODE_UNSUPPORTED');
	}

	const supplier = await Supplier.findOne({ _id: req.params.supplierId, orgId: req.user.orgId });
	if (!supplier) {
		throw new ApiError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
	}

	const result = await fetchAndSentimentTagNews(supplier);
	await computeRiskScore(supplier, 'manual_news_refresh');

	return sendSuccess(res, result);
}));

module.exports = router;
