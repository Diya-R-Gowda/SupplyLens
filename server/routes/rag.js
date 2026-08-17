const express = require('express');
const { param, body } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth');
const { answerSupplierQuestion } = require('../services/ragService');
const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const Conversation = require('../models/Conversation');
const { answerDemoQuestion } = require('../services/demoStore');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

const isDemoMode = () => mongoose.connection.readyState !== 1;

// `question` was previously only checked for truthiness (`!question`), so a
// non-string (e.g. an object) would have reached the embedding/Gemini call
// unchecked. `.optional()` on both fields preserves the existing manual
// QUESTION_REQUIRED check for the missing case; these add real coverage for
// present-but-malformed values.
const askQuestionValidation = [
  param('supplierId').isMongoId().withMessage('supplierId must be a valid id'),
  body('question').optional().isString().trim().isLength({ min: 1, max: 2000 }).withMessage('question must be a non-empty string of at most 2000 characters'),
  body('conversationId').optional({ nullable: true }).isMongoId().withMessage('conversationId must be a valid id'),
];

/**
 * @swagger
 * /rag/{supplierId}:
 *   post:
 *     summary: Ask a question about a supplier's ingested contract documents
 *     description: >
 *       Embeds the question (gemini-embedding-001), runs $vectorSearch against that supplier's
 *       docchunks (scoped by the supplierId filter, so one supplier's documents never leak into
 *       another's answer), then asks gemini-flash-latest to answer using only the retrieved
 *       chunks as context plus a bounded window of recent conversation history (so follow-ups
 *       like "why is it that high?" resolve correctly). Pass the conversationId returned from a
 *       previous call to continue that conversation; omit it to start a new one. Conversations are
 *       private per-user, not shared across an org. Returns a fixed "couldn't find any
 *       information" message (not an error) if no chunks match. In demo mode it always returns a
 *       canned, keyword-matched answer with no real AI call and no conversation is persisted.
 *       Org-scoped like every other supplier-facing route - a supplier belonging to a different
 *       org 404s rather than leaking whether it exists.
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
 *               conversationId:
 *                 type: string
 *                 description: Omit to start a new conversation
 *                 example: 6a6cf137f857b1ef1c7004a2
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
 *                 answer: The payment terms are Net 30 per section 4.2 of the agreement.
 *                 conversationId: 6a6cf137f857b1ef1c7004a2
 *                 sources: [msa-2026.pdf]
 *                 confidence: 0.85
 *       400:
 *         description: question missing from the request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Question is required, code: QUESTION_REQUIRED }
 *       404:
 *         description: >
 *           No such supplier in the caller's org (real mode only - demo mode has no org-scoped
 *           supplier store), or the given conversationId doesn't belong to this supplier/caller.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             examples:
 *               supplierNotFound:
 *                 summary: No such supplier in the caller's org
 *                 value:
 *                   success: false
 *                   error: { message: Supplier not found, code: SUPPLIER_NOT_FOUND }
 *               conversationNotFound:
 *                 summary: conversationId doesn't exist, or belongs to a different supplier/user
 *                 value:
 *                   success: false
 *                   error: { message: Conversation not found, code: CONVERSATION_NOT_FOUND }
 *       500:
 *         description: The RAG pipeline failed (embedding call, vector search, or generation) - never silently reported as a fake answer
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error: { message: Internal server error, code: INTERNAL_ERROR }
 */
router.post('/:supplierId', auth, validate(askQuestionValidation), asyncHandler(async (req, res) => {
  const { supplierId } = req.params;
  const { question, conversationId } = req.body;

  if (!question) {
    throw new ApiError('Question is required', 400, 'QUESTION_REQUIRED');
  }

  if (isDemoMode()) {
    return sendSuccess(res, { answer: answerDemoQuestion(supplierId, question) });
  }

  // Same org-scoped, 404-not-403 pattern as suppliers.js/documents.js: without
  // this, any authenticated user could pull answers sourced from another
  // org's documents just by guessing/knowing a supplierId.
  const supplier = await Supplier.findOne({ _id: supplierId, orgId: req.user.orgId });
  if (!supplier) {
    throw new ApiError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
  }

  // Conversations are private per-user: scoped by supplier, org, AND userId, so
  // one org member can't read or continue another member's chat history.
  let conversation;
  if (conversationId) {
    conversation = await Conversation.findOne({
      _id: conversationId, supplierId, orgId: req.user.orgId, userId: req.user.id,
    });
    if (!conversation) {
      throw new ApiError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }
  } else {
    conversation = await Conversation.create({
      supplierId, orgId: req.user.orgId, userId: req.user.id, messages: [],
    });
  }

  // History passed to the model is everything BEFORE this turn - the current
  // question is passed to answerSupplierQuestion separately, so it's never
  // duplicated between "conversation so far" and "question".
  const priorMessages = conversation.messages;

  // No catch-and-fake-answer here: if the RAG pipeline fails (Gemini API
  // error, missing embeddings, etc.) that must surface as a real error, not a
  // 200 with a made-up "answer unavailable" message.
  const { answer, sources, confidence } = await answerSupplierQuestion(supplierId, question, priorMessages);

  conversation.messages.push({ role: 'user', content: question, timestamp: new Date() });
  conversation.messages.push({ role: 'assistant', content: answer, timestamp: new Date(), sources, confidence });
  await conversation.save();

  return sendSuccess(res, { answer, conversationId: conversation._id, sources, confidence });
}));

module.exports = router;
