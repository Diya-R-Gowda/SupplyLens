// Shared mechanics for any "recompute a 0-100 score, cap the per-update
// movement, rate-limit repeated triggers, record an audit-trail row"
// pattern. Originally built for risk score (Phase 3) and extracted here so
// Health Score (Phase 4) shares the same guardrail behavior instead of
// forking the logic into a second copy - only the weighted formula and
// which history model/fields get used differ between the two.

// True if `HistoryModel` already has a row for this entity+reason within
// the last `rateLimitMs` - the caller should skip the update if so.
exports.isRateLimited = async (HistoryModel, entityField, entityId, reason, rateLimitMs) => {
  const recent = await HistoryModel.findOne({
    [entityField]: entityId,
    reason,
    createdAt: { $gte: new Date(Date.now() - rateLimitMs) },
  });
  return !!recent;
};

// Caps how far a single update can move the score (so one burst trigger
// can't produce a nonsensical jump - the score still moves toward the
// "correct" weighted value, just gradually across multiple updates), then
// clamps the result to the valid 0-100 range.
exports.applyCappedDelta = (previousScore, rawScore, maxDelta) => {
  let delta = rawScore - previousScore;
  if (Math.abs(delta) > maxDelta) {
    delta = Math.sign(delta) * maxDelta;
  }
  const newScore = Math.max(0, Math.min(100, previousScore + delta));
  return { newScore, delta: newScore - previousScore };
};
