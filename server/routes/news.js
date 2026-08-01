const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const mongoose = require('mongoose');
const NewsCache = require('../models/NewsCache');
const Supplier = require('../models/Supplier');
const { listDemoNews } = require('../services/demoStore');
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
 *       Reads from a NewsCache collection, never fetched live on request. **Known issue (real DB
 *       mode only):** jobs/newsCron.js exists to populate this cache on a schedule, but it is not
 *       required/started anywhere in the app, so nothing currently writes to NewsCache - expect
 *       an empty array for every real supplier until that job is wired up or the cache is
 *       populated some other way. Cached items expire after 7 days (a Mongo TTL index on
 *       publishedAt) and the 5 most recent are returned.
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
 *                   sentiment: positive
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

	const news = await NewsCache.find({ supplierId: req.params.supplierId })
		.sort({ publishedAt: -1 })
		.limit(5)
		.lean();

	return sendSuccess(res, news);
}));

module.exports = router;
