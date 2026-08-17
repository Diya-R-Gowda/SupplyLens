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
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true }, // Multi-tenancy
  // Opt-in, not opt-out: this is a brand-new unsolicited-email capability
  // (alertCron.js) with no existing consent on file for any current user,
  // so the safe default is off until a user actively turns it on.
  notifyOnAlert: { type: Boolean, default: false },
});
module.exports = mongoose.model('User', userSchema);