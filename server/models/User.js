const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
  },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'viewer'], default: 'admin' },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true } // Multi-tenancy
});
module.exports = mongoose.model('User', userSchema);