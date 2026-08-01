const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
	supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
	fileName: { type: String, required: true },
	uploadedAt: { type: Date, default: Date.now },
	totalChunks: { type: Number, default: 0 },
	// Points at the original PDF binary stored in the `pdfDocuments` GridFS bucket.
	gridFsFileId: { type: mongoose.Schema.Types.ObjectId, required: true },
});

module.exports = mongoose.model('Document', documentSchema);
