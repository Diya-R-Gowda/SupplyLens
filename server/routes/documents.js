const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { processPDF } = require('../services/ingestService');
const mongoose = require('mongoose');
const Document = require('../models/Document');
const { recordDemoDocument, recordDemoUploadedDocument, listDemoDocuments } = require('../services/demoStore');

router.post('/upload/:supplierId', auth, upload.single('file'), async (req, res) => {
  try {
    const { supplierId } = req.params;
    if (!req.file) return res.status(400).send('No file uploaded');

    if (mongoose.connection.readyState !== 1) {
      recordDemoUploadedDocument(supplierId, req.file.originalname);
      return res.json(recordDemoDocument(supplierId, req.file.originalname));
    }

    const result = await processPDF(supplierId, req.file.buffer, req.file.originalname);
    res.json(result);
  } catch (err) {
    console.error(err);
    if (mongoose.connection.readyState !== 1) {
      return res.json(recordDemoDocument(req.params.supplierId, req.file?.originalname || 'uploaded-file.pdf'));
    }
    res.status(500).send('Error processing document');
  }
});

router.get('/:supplierId', auth, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json(listDemoDocuments(req.params.supplierId));
    }

    const documents = await Document.find({ supplierId: req.params.supplierId })
      .sort({ uploadedAt: -1 })
      .lean();

    return res.json(documents);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error loading documents');
  }
});

module.exports = router;