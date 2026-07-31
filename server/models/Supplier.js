const mongoose = require('mongoose');
const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
  category: { type: String, enum: ['raw_material', 'logistics', 'saas', 'other'] },
  country: { type: String, required: true, trim: true, uppercase: true, match: /^[A-Z]{2}$/ }, // ISO 3166-1 alpha-2
  riskScore: { type: Number, default: 0, min: 0, max: 100 }, // matches the 0-100 scale used by RiskBadge.jsx
  contractExpiry: Date,
  paymentTerms: { type: String, trim: true, maxlength: 100 },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true }
}, { timestamps: true });

// Every existing query filters by orgId (routes/suppliers.js); this compound index
// covers those lookups as a prefix and also enforces one supplier name per org.
supplierSchema.index({ orgId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Supplier', supplierSchema);