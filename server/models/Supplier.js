const mongoose = require('mongoose');
const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ['raw_material', 'logistics', 'saas', 'other'] },
  country: { type: String, required: true }, // ISO 3166-1 alpha-2
  riskScore: { type: Number, default: 0 },
  contractExpiry: Date,
  paymentTerms: String,
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true }
});

// Every existing query filters by orgId (routes/suppliers.js); this compound index
// covers those lookups as a prefix and also enforces one supplier name per org.
supplierSchema.index({ orgId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Supplier', supplierSchema);