const cron = require('node-cron');
const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const { takeSnapshot } = require('../services/snapshotService');

// Daily, not hourly/6-hourly like newsCron - a full twin-state snapshot is
// for historical comparison/auditing ("what did this supplier look like a
// week ago"), not for freshness, so a coarser cadence is intentional. At
// this rate the 100-snapshot retention cap (snapshotService.js) covers
// ~3+ months of scheduled history per supplier, in addition to whatever
// manual snapshots get taken. Revisit if a different cadence turns out to
// matter more in practice (see TODO.md).
const SCHEDULE = '0 2 * * *';

const runScheduledSnapshots = async () => {
  if (mongoose.connection.readyState !== 1) {
    console.log('snapshotCron: skipping run, MongoDB not connected (demo mode)');
    return;
  }

  console.log('snapshotCron: starting scheduled snapshots...');
  const suppliers = await Supplier.find({});

  for (const supplier of suppliers) {
    await takeSnapshot(supplier, 'scheduled');
  }
  console.log(`snapshotCron: snapshot complete for ${suppliers.length} supplier(s).`);
};

const start = () => {
  cron.schedule(SCHEDULE, runScheduledSnapshots);
  console.log(`snapshotCron: scheduled (${SCHEDULE})`);
};

module.exports = { start, runScheduledSnapshots };
