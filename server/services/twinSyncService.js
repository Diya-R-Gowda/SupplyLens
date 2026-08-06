const { computeRiskScore } = require('./riskScoreService');
const { computeHealthScore } = require('./healthScoreService');
const { takeSnapshot } = require('./snapshotService');
const { getOrgAlertThresholds } = require('./riskConfigService');
const { isNewBreach } = require('./alertService');

// Matches the +/-15 per-update cap both riskScoreService and
// healthScoreService enforce (scoringEngine.applyCappedDelta). A delta at
// or above this threshold means the real underlying change was capped -
// the actual movement was even larger - which is a cheap, already-computed
// signal for "something significant just happened", without needing to
// separately track/compare raw vs. capped scores.
const SIGNIFICANT_DELTA_THRESHOLD = 15;

// Central "something changed that could affect either score" trigger,
// covering the Phase 4 audit's confirmed synchronization gap: document
// upload/delete and manual supplier edits never called computeRiskScore at
// all, so risk silently went stale after those mutations until the next
// scheduled news cron incidentally touched that supplier.
//
// Recomputing both scores together is the common case here - documents and
// contract terms feed both formulas, and even a news-driven risk change
// needs health to refresh afterward (health's riskComponent factor is
// 100 - riskScore, so it goes stale the moment risk actually changes).
// ESG/logistics refreshes are the deliberate exception - they call
// computeHealthScore directly at their own routes, not this helper, since
// neither factors into risk's formula at all.
//
// Also takes an on-demand snapshot if either score just moved by a
// significant (capped) amount, or just crossed into an org-configured alert
// threshold for the first time - deliberately NOT on every minor mutation,
// which would defeat the whole point of the retention cap (Step 3), and NOT
// on a score that was already over threshold and moved further (that's
// already covered by the significant-change check if the move itself was
// large). Scheduled + manual snapshots remain the primary mechanism; this
// is only an extra capture around genuinely notable moments, so a
// threshold-breach snapshot exists as a point-in-time record of the
// crossing even if nobody is looking at the app right when it happens -
// see alertService.js's own comment for why no separate scheduled
// threshold-check cron was added (the alert state itself is compute-on-read
// and always fresh; this snapshot is purely a historical record).
exports.syncScoresAfterChange = async (supplier, reason) => {
  const risk = await computeRiskScore(supplier, reason);
  const health = await computeHealthScore(supplier, reason);

  const riskWasSignificant = risk.updated && Math.abs(risk.delta) >= SIGNIFICANT_DELTA_THRESHOLD;
  const healthWasSignificant = health.updated && Math.abs(health.delta) >= SIGNIFICANT_DELTA_THRESHOLD;

  const thresholds = await getOrgAlertThresholds(supplier.orgId);
  const riskNewBreach = thresholds.enabled && risk.updated
    && isNewBreach(risk.previousScore, risk.newScore, thresholds.riskThreshold, 'above');
  const healthNewBreach = thresholds.enabled && health.updated
    && isNewBreach(health.previousScore, health.newScore, thresholds.healthThreshold, 'below');

  if (riskWasSignificant || healthWasSignificant) {
    await takeSnapshot(supplier, 'significant_change');
  } else if (riskNewBreach || healthNewBreach) {
    await takeSnapshot(supplier, 'threshold_breach');
  }

  return { risk, health };
};
