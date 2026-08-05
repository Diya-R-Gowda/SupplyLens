const mongoose = require('mongoose');
const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
  category: { type: String, enum: ['raw_material', 'logistics', 'saas', 'other'] },
  country: { type: String, required: true, trim: true, uppercase: true, match: /^[A-Z]{2}$/ }, // ISO 3166-1 alpha-2
  riskScore: { type: Number, default: 0, min: 0, max: 100 }, // matches the 0-100 scale used by RiskBadge.jsx
  contractExpiry: Date,
  paymentTerms: { type: String, trim: true, maxlength: 100 },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true },
  // AI-generated company enrichment (Phase 3) - explicitly separate from the
  // manually-entered fields above so the UI can label it "verify
  // independently" rather than presenting it as a verified data source.
  // Re-runnable: enrichedAt lets the UI show staleness and offer a refresh,
  // rather than treating a single enrichment as permanent.
  enrichment: {
    industry: String,
    companySize: String,
    foundedYear: Number,
    summary: String,
    source: { type: String, enum: ['gemini'] },
    enrichedAt: Date,
  },
  // AI-generated ESG estimate (Phase 4) - same self-contained,
  // independently re-runnable shape as `enrichment` above. Scores are 0-100
  // (not a AAA-CCC letter scale) so they compose numerically with the rest
  // of the app's 0-100 conventions (riskScore, RiskBadge). No ground truth
  // to verify these against (see TODO.md) - UI must label as unverified.
  esg: {
    environmentalScore: { type: Number, min: 0, max: 100 },
    socialScore: { type: Number, min: 0, max: 100 },
    governanceScore: { type: Number, min: 0, max: 100 },
    summary: String,
    source: { type: String, enum: ['gemini'] },
    refreshedAt: Date,
  },
  // AI-generated logistics/operational estimate (Phase 4) - same shape
  // again. Unlike ESG, on-time-delivery/lead-time figures are rarely public
  // information at all, so this is expected to come back null far more
  // often than enrichment/ESG do - a real limitation, not a bug (see TODO.md).
  logistics: {
    onTimeDeliveryRate: { type: Number, min: 0, max: 100 },
    averageLeadTimeDays: Number,
    logisticsNotes: String,
    source: { type: String, enum: ['gemini'] },
    refreshedAt: Date,
  },
}, { timestamps: true });

// Every existing query filters by orgId (routes/suppliers.js); this compound index
// covers those lookups as a prefix and also enforces one supplier name per org.
supplierSchema.index({ orgId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Supplier', supplierSchema);