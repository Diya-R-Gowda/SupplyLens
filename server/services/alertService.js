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

// Early Warning (Phase 6 Step 3) - "projected to cross the threshold if the
// trend continues," as distinct from evaluateAlerts' "has already crossed
// it." Depends entirely on forecastService's insufficient_data gating: a
// metric whose forecast.status isn't 'ok' contributes zero projected
// breaches, full stop - there is no fallback number, because a guessed
// early warning built on data too thin to forecast from would be exactly
// the false-confidence problem this whole phase exists to avoid (see
// forecastService.js and TODO.md).
//
// A metric that's ALREADY breaching right now is deliberately excluded from
// its own projected-breach list - evaluateAlerts already covers "this is a
// problem today"; projecting forward from an already-bad number and
// reporting it as a fresh "early warning" would be misleading (the warning
// already happened).
exports.evaluateProjectedBreach = (supplier, forecast, thresholds) => {
  if (!thresholds?.enabled || !forecast) return { risk: [], health: [] };

  const riskAlreadyBreached = supplier.riskScore >= thresholds.riskThreshold;
  const healthAlreadyBreached = supplier.healthScore <= thresholds.healthThreshold;

  const risk = (!riskAlreadyBreached && forecast.risk?.status === 'ok')
    ? forecast.risk.projections
      .filter((p) => p.projectedScore >= thresholds.riskThreshold)
      .map((p) => ({
        horizonDays: p.horizonDays,
        projectedScore: p.projectedScore,
        threshold: thresholds.riskThreshold,
        confidenceInterval: p.confidenceInterval,
        confidenceLevel: forecast.risk.dataQuality.confidenceLevel,
      }))
    : [];

  const health = (!healthAlreadyBreached && forecast.health?.status === 'ok')
    ? forecast.health.projections
      .filter((p) => p.projectedScore <= thresholds.healthThreshold)
      .map((p) => ({
        horizonDays: p.horizonDays,
        projectedScore: p.projectedScore,
        threshold: thresholds.healthThreshold,
        confidenceInterval: p.confidenceInterval,
        confidenceLevel: forecast.health.dataQuality.confidenceLevel,
      }))
    : [];

  return { risk, health };
};
