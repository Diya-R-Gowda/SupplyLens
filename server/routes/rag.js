const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { answerSupplierQuestion } = require('../services/ragService');
const mongoose = require('mongoose');
const { answerDemoQuestion } = require('../services/demoStore');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

const isDemoMode = () => mongoose.connection.readyState !== 1;

/**
 * @swagger
 * /rag/{supplierId}:
 *   post:
 *     summary: Ask a question about a supplier's ingested contract documents
 *     description: >
 *       **Known issue (real DB mode only):** this calls the same Gemini "text-embedding-004"
 *       model as document ingestion to embed the question before the vector search - if that
 *       model call is failing (see the documents/upload caveat), this endpoint fails the same
 *       way. It also depends on documents having been successfully ingested first, which is
 *       currently blocked by the pdf-parse issue - so in real DB mode this endpoint currently
 *       has no working chunks to search against even if the embedding call itself succeeds. In
 *       demo mode it always returns a canned, keyword-matched answer with no real AI call.
 *     tags: [RAG]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: supplierId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [question]
 *             properties:
 *               question: { type: string, example: 'What are the payment terms in this contract?' }
 *     responses:
 *       200:
 *         description: Answer generated (real mode) or canned demo answer (demo mode)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *             example:
 *               success: true
 *               data:
 *                 answer: Demo answer for Northwind Logistics - upload a document and connect MongoDB plus Gemini to enable real contract analysis.
 *       400:
 *         description: question missing from the request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Question is required, code: QUESTION_REQUIRED }
 *       500:
 *         description: The RAG pipeline failed (see the known-issue note above) - never silently reported as a fake answer
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Internal server error, code: INTERNAL_ERROR }
 */
router.post('/:supplierId', auth, asyncHandler(async (req, res) => {
  const { supplierId } = req.params;
  const { question } = req.body;

  if (!question) {
    throw new ApiError('Question is required', 400, 'QUESTION_REQUIRED');
  }

  if (isDemoMode()) {
    return sendSuccess(res, { answer: answerDemoQuestion(supplierId, question) });
  }

  // No catch-and-fake-answer here: if the RAG pipeline fails (Gemini API
  // error, missing embeddings, etc.) that must surface as a real error, not a
  // 200 with a made-up "answer unavailable" message.
  const answer = await answerSupplierQuestion(supplierId, question);
  return sendSuccess(res, { answer });
}));

module.exports = router;
