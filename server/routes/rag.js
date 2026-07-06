const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { answerSupplierQuestion } = require('../services/ragService');

router.post('/:supplierId', auth, async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { question } = req.body;

    if (!question) return res.status(400).send('Question is required');

    const answer = await answerSupplierQuestion(supplierId, question);
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating answer');
  }
});

module.exports = router;