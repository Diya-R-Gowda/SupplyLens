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
