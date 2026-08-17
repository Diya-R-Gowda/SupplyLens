const mongoose = require('mongoose');
const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
  category: { type: String, enum: ['raw_material', 'logistics', 'saas', 'other'] },
  country: { type: String, required: true, trim: true, uppercase: true, match: /^[A-Z]{2}$/ }, // ISO 3166-1 alpha-2
  riskScore: { type: Number, default: 0, min: 0, max: 100 }, // matches the 0-100 scale used by RiskBadge.jsx
  // Distinct metric from riskScore (Phase 4) - "is this a good, reliable
  // supplier to work with" rather than "chance of disruption/loss". Own
  // weighted formula in healthScoreService.js, incorporating ESG/logistics
  // signals riskScore's formula doesn't use at all. Defaults to 50 (neutral)
  // rather than 0 - an un-scored supplier isn't known to be unhealthy, just
  // unassessed yet, unlike riskScore's 0 default which means "no risk signals
  // seen yet" (a reasonable true default for a brand-new supplier).
  healthScore: { type: Number, default: 50, min: 0, max: 100 },
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
    // Gemini's own self-reported 0-1 confidence in this data (Phase 5,
    // prompted-JSON pattern - see enrichmentService.js). No ground truth to
    // verify a self-reported confidence against, same category as the data
    // itself (see TODO.md) - a UI signal, not a guarantee.
    confidence: { type: Number, min: 0, max: 1 },
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
    confidence: { type: Number, min: 0, max: 1 },
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
    confidence: { type: Number, min: 0, max: 1 },
    source: { type: String, enum: ['gemini'] },
    refreshedAt: Date,
  },
  // Phase 7 Step 4 - real, user-populated business-value fields. Unlike
  // enrichment/esg/logistics above, this is NEVER AI-generated itself - it's
  // the actual real numbers a user enters (contract value, spend,
  // criticality) that businessImpactService.js uses for genuine math when
  // present. All optional and independently settable via
  // PATCH /suppliers/:id/business-fields; when absent, the service falls
  // back to an explicitly-labeled AI estimate instead - the two are never
  // blended into one number without saying which is which (see TODO.md for
  // the product decision this follows: same "AI estimates as a starting
  // default, real input overrides and improves over time" pattern already
  // established for enrichment/ESG/logistics).
  businessImpact: {
    contractValue: {
      amount: { type: Number, min: 0 },
      currency: { type: String, trim: true, uppercase: true, minlength: 3, maxlength: 3 },
    },
    estimatedAnnualSpend: { type: Number, min: 0 },
    // 1-5 scale (not enum labels) so it composes numerically if ever needed
    // (e.g. sorting/filtering) - 1 = low criticality, 5 = mission-critical.
    criticalityRating: { type: Number, min: 1, max: 5 },
    dependencyNotes: { type: String, trim: true, maxlength: 500 },
    updatedAt: Date,
  },
  // Optional precise location, separate from the required `country` fallback
  // above - `country` always stays the honest default (geoLocationService.js
  // falls back to it whenever this is absent). Two ways in, never blended:
  // an address geocoded via Nominatim (source: 'nominatim'), or coordinates
  // entered directly by a user who already knows them (source: 'manual',
  // skips geocoding entirely) - same "real input vs. derived estimate,
  // always labeled which is which" precedent as `businessImpact` above.
  location: {
    address: { type: String, trim: true, maxlength: 300 },
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
    source: { type: String, enum: ['nominatim', 'manual'] },
    geocodedAt: Date,
  },
}, { timestamps: true });

// Every existing query filters by orgId (routes/suppliers.js); this compound index
// covers those lookups as a prefix and also enforces one supplier name per org.
supplierSchema.index({ orgId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Supplier', supplierSchema);