const mongoose = require('mongoose');
const newsCacheSchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  // Added so news reads/writes can be org-scoped the same way every other
  // collection in the app is - this field didn't exist before Phase 3, which
  // meant the ingestion path had no way to enforce it even if the route did.
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  headline: { type: String, required: true },
  url: String,
  source: String,
  // Plain label string (not an enum) - Gemini's output is normalized
  // (lowercased/trimmed) at ingestion time but isn't worth hard-constraining
  // against here; null until sentiment classification succeeds.
  sentiment: { type: String, default: null },
  sentimentScore: { type: Number, min: -1, max: 1, default: null },
  // Gemini's own self-reported 0-1 confidence in the sentiment classification
  // (Phase 5). Same prompted-JSON pattern as label/score above.
  sentimentConfidence: { type: Number, min: 0, max: 1, default: null },
  publishedAt: { type: Date, expires: '7d' } // Automatically deletes after 7 days
});

// Covers the real query shape (list by org+supplier, most recent first) and
// lets ingestion cheaply check "have we already stored this article" to avoid
// duplicate entries every time the cron/refresh re-fetches overlapping results.
newsCacheSchema.index({ orgId: 1, supplierId: 1, publishedAt: -1 });
newsCacheSchema.index({ supplierId: 1, url: 1 });

module.exports = mongoose.model('NewsCache', newsCacheSchema);
