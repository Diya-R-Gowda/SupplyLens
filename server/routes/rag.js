const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { answerSupplierQuestion } = require('../services/ragService');
const mongoose = require('mongoose');
const { answerDemoQuestion } = require('../services/demoStore');

router.post('/:supplierId', auth, async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { question } = req.body;

    if (!question) return res.status(400).send('Question is required');

    if (mongoose.connection.readyState !== 1) {
      return res.json({ answer: answerDemoQuestion(supplierId, question) });
    }

    const answer = await answerSupplierQuestion(supplierId, question);
    res.json({ answer });
  } catch (err) {
    console.error(err);
    return res.json({ answer: 'Demo answer unavailable right now. Connect MongoDB and Gemini for full RAG support.' });
  }
});

module.exports = router;