const mongoose = require('mongoose');
const docChunkSchema = new mongoose.Schema({
  text: String,
  embedding: [Number], // 768 dimensions for Gemini
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  docId: mongoose.Schema.Types.ObjectId,
  chunkIndex: Number,
  pageNum: Number
});
module.exports = mongoose.model('DocChunk', docChunkSchema);