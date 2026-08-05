const { computeRiskScore } = require('./riskScoreService');
const { computeHealthScore } = require('./healthScoreService');
const { takeSnapshot } = require('./snapshotService');

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
// significant (capped) amount - deliberately NOT on every minor mutation,
// which would defeat the whole point of the retention cap (Step 3).
// Scheduled + manual snapshots remain the primary mechanism; this is only
// an extra capture around genuinely large swings.
exports.syncScoresAfterChange = async (supplier, reason) => {
  const risk = await computeRiskScore(supplier, reason);
  const health = await computeHealthScore(supplier, reason);

  const riskWasSignificant = risk.updated && Math.abs(risk.delta) >= SIGNIFICANT_DELTA_THRESHOLD;
  const healthWasSignificant = health.updated && Math.abs(health.delta) >= SIGNIFICANT_DELTA_THRESHOLD;
  if (riskWasSignificant || healthWasSignificant) {
    await takeSnapshot(supplier, 'significant_change');
  }

  return { risk, health };
};
