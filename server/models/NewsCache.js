const mongoose = require('mongoose');
const newsCacheSchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  headline: String,
  sentiment: String,
  publishedAt: { type: Date, expires: '7d' } // Automatically deletes after 7 days
});
module.exports = mongoose.model('NewsCache', newsCacheSchema);