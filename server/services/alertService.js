// Compute-on-read threshold breach check (Phase 5 Step 5) - deliberately not
// a persisted "Alert" model with open/acknowledged/resolved lifecycle state.
// Since it's derived fresh from the supplier's current riskScore/healthScore
// every time it's read (same precedent as the Digital Twin's other current-
// state fields), it's always accurate regardless of when the score last
// changed - there's no staleness window a scheduled re-check would need to
// close (see TODO.md for the fuller reasoning on why no cron job was added
// for this).
exports.evaluateAlerts = (supplier, thresholds) => {
  if (!thresholds?.enabled) {
    return {
      risk: { breached: false, score: supplier.riskScore, threshold: thresholds?.riskThreshold ?? null },
      health: { breached: false, score: supplier.healthScore, threshold: thresholds?.healthThreshold ?? null },
    };
  }

  return {
    // Risk is "too high" - breach when score >= threshold.
    risk: {
      breached: supplier.riskScore >= thresholds.riskThreshold,
      score: supplier.riskScore,
      threshold: thresholds.riskThreshold,
    },
    // Health is "too low" - breach when score <= threshold (inverted vs. risk).
    health: {
      breached: supplier.healthScore <= thresholds.healthThreshold,
      score: supplier.healthScore,
      threshold: thresholds.healthThreshold,
    },
  };
};

// Used by twinSyncService.js right after a score recompute, where the
// before/after scores from that specific change are already in hand (no
// need to re-derive "was it breached before" from history). Returns true
// only for a fresh crossing into breach - a score that was already over
// threshold and moved further doesn't re-trigger this (the "significant
// change" delta-cap trigger already covers large moves in general).
exports.isNewBreach = (previousScore, newScore, threshold, direction) => {
  if (typeof previousScore !== 'number' || typeof newScore !== 'number' || typeof threshold !== 'number') return false;
  const wasBreached = direction === 'above' ? previousScore >= threshold : previousScore <= threshold;
  const isBreached = direction === 'above' ? newScore >= threshold : newScore <= threshold;
  return isBreached && !wasBreached;
};
