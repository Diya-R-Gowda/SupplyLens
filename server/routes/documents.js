const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { processPDF } = require('../services/ingestService');
const mongoose = require('mongoose');
const Document = require('../models/Document');
const { recordDemoDocument, recordDemoUploadedDocument, listDemoDocuments } = require('../services/demoStore');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

const isDemoMode = () => mongoose.connection.readyState !== 1;

/**
 * @swagger
 * /documents/upload/{supplierId}:
 *   post:
 *     summary: Upload and ingest a contract PDF for a supplier
 *     description: >
 *       **Known issue (real DB mode only):** ingestService.js still calls pdf-parse the v1 way
 *       (`pdf(buffer)`), but the installed pdf-parse is v2, which exports a `PDFParse` class
 *       instead of a callable function - so a real upload currently throws and this endpoint
 *       500s outside of demo mode. In demo mode (no MongoDB connection) it always succeeds and
 *       returns a canned response, since no real parsing/embedding happens there.
 *     tags: [Documents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: supplierId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary, description: 'PDF only, max 10MB' }
 *     responses:
 *       201:
 *         description: Document ingested (real mode) or recorded as a demo upload (demo mode)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data: { success: true, totalChunks: 4 }
 *       400:
 *         description: No file was attached, or it wasn't a PDF
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: No file uploaded, code: FILE_REQUIRED }
 *       500:
 *         description: Ingestion failed (see the pdf-parse caveat above) - never silently reported as success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Internal server error, code: INTERNAL_ERROR }
 */
router.post('/upload/:supplierId', auth, upload.single('file'), asyncHandler(async (req, res) => {
  const { supplierId } = req.params;
  if (!req.file) {
    throw new ApiError('No file uploaded', 400, 'FILE_REQUIRED');
  }

  if (isDemoMode()) {
    recordDemoUploadedDocument(supplierId, req.file.originalname);
    return sendSuccess(res, recordDemoDocument(supplierId, req.file.originalname), { status: 201 });
  }

  // No catch-and-fall-back-to-demo-success here: if processPDF fails partway
  // through (bad PDF, embedding API failure, a dropped DB connection mid-ingest),
  // that must surface as a real error, not a fake "success" response.
  const result = await processPDF(supplierId, req.file.buffer, req.file.originalname);
  return sendSuccess(res, result, { status: 201 });
}));

/**
 * @swagger
 * /documents/{supplierId}:
 *   get:
 *     summary: List documents uploaded for a supplier
 *     description: >
 *       Not scoped to the caller's organisation by orgId - only by supplierId. Since supplierId
 *       itself is always org-scoped elsewhere, this is only reachable for suppliers the caller
 *       already knows about, but note it does not independently verify org ownership the way
 *       the suppliers routes do.
 *     tags: [Documents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: supplierId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Documents for this supplier, most recently uploaded first (empty array if none)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data:
 *                 - _id: 6a6cf137f857b1ef1c7002a1
 *                   supplierId: 6a6cf137f857b1ef1c7001e2
 *                   fileName: msa-2026.pdf
 *                   totalChunks: 4
 *                   uploadedAt: '2026-07-31T19:10:00.000Z'
 *       401:
 *         description: Missing, malformed, or expired access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Token has expired, code: TOKEN_EXPIRED }
 */
router.get('/:supplierId', auth, asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    return sendSuccess(res, listDemoDocuments(req.params.supplierId));
  }

  const documents = await Document.find({ supplierId: req.params.supplierId })
    .sort({ uploadedAt: -1 })
    .lean();

  return sendSuccess(res, documents);
}));

module.exports = router;
