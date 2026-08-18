const mongoose = require('mongoose');

const organisationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // A real, atomically-maintained counter, not a derived/computed value -
  // exists specifically so PATCH /org/users/:userId/role's last-admin guard
  // can be a single atomic findOneAndUpdate (real MongoDB document-level
  // conflict detection) instead of a read-then-write race across the User
  // collection. Kept in sync at every admin-count-changing site: auth.js
  // register (starts at 1), org/invite-user (increments if invited as
  // admin), and orgConfig.js's role-management route (increments on
  // promote, atomically-guarded-decrements on demote). Existing orgs from
  // before this field existed are backfilled via
  // scripts/backfillAdminCount.js.
  adminCount: { type: Number, default: 1, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Organisation', organisationSchema);
