const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  // Only ever set on assistant messages - the distinct source document
  // filenames the answer was actually grounded in.
  sources: [String],
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  // Conversations are private per-user, not shared across an org - no evidence
  // anywhere (schema, docs, frontend) that "any org member can see any other
  // member's chat history" was intended, and it's the safer default absent
  // a stated requirement otherwise.
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  messages: [messageSchema],
}, { timestamps: true });

conversationSchema.index({ supplierId: 1, userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
