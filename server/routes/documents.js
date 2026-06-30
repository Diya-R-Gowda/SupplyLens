const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { processPDF } = require('../services/ingestService');

router.post('/upload/:supplierId', auth, upload.single('file'), async (req, res) => {
  try {
    const { supplierId } = req.params;
    if (!req.file) return res.status(400).send('No file uploaded');

    const result = await processPDF(supplierId, req.file.buffer);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing document');
  }
});

module.exports = router;