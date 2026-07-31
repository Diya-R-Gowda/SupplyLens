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
