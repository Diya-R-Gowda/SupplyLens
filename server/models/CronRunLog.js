const mongoose = require('mongoose');

// One row per scheduled job, upserted right after a run actually completes
// (whether or not that run changed anything). Exists purely so a boot-time
// catch-up check (jobs/newsCron.js, jobs/snapshotCron.js) can answer "did
// this job's last scheduled run happen roughly on time" without having to
// infer it from side-effect collections like RiskHistory/SupplierSnapshot -
// those only gain a row when something actually changed, so a clean run
// that found nothing to update would otherwise look identical to the job
// never having run at all.
const cronRunLogSchema = new mongoose.Schema({
  jobName: { type: String, required: true, unique: true },
  lastRunAt: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('CronRunLog', cronRunLogSchema);
