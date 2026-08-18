// One-off admin script: backfills Organisation.adminCount for every org that
// existed before that field was introduced (PATCH /org/users/:userId/role's
// last-admin guard, see server/routes/orgConfig.js and TODO.md for why a
// real atomic counter replaced a plain read-then-write count check).
//
// Idempotent and safe to re-run: it always recomputes adminCount from the
// real source of truth (User.countDocuments) rather than trusting whatever
// value is already there, so running it twice - or against an org that
// already has a correct count - is a no-op.
//
// Usage: node scripts/backfillAdminCount.js
const mongoose = require('mongoose');
const Organisation = require('../models/Organisation');
const User = require('../models/User');

// Exported separately from the CLI entry point below so it can be exercised
// directly against mongodb-memory-server in a real test
// (tests/backfillAdminCount.test.js), matching this project's "real DB over
// mocks" testing convention rather than only ever being run by hand.
const backfillAdminCounts = async () => {
  const orgs = await Organisation.find({}, '_id name adminCount');
  const results = [];

  for (const org of orgs) {
    const realCount = await User.countDocuments({ orgId: org._id, role: 'admin' });
    const changed = org.adminCount !== realCount;
    if (changed) {
      await Organisation.updateOne({ _id: org._id }, { adminCount: realCount });
    }
    results.push({
      orgId: String(org._id), name: org.name, previousAdminCount: org.adminCount, realAdminCount: realCount, changed,
    });
  }

  return results;
};

module.exports = { backfillAdminCounts };

if (require.main === module) {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

  (async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to', mongoose.connection.host);

    const results = await backfillAdminCounts();
    console.log(`\nChecked ${results.length} org(s):`);
    for (const r of results) {
      const marker = r.changed ? 'UPDATED' : 'already correct';
      console.log(`  ${r.name} (${r.orgId}): adminCount ${r.previousAdminCount} -> ${r.realAdminCount} [${marker}]`);
    }
    console.log(`\n${results.filter((r) => r.changed).length} org(s) updated, ${results.filter((r) => !r.changed).length} already correct.`);

    await mongoose.disconnect();
  })().catch((err) => {
    console.error('FAILED:', err);
    process.exit(1);
  });
}
