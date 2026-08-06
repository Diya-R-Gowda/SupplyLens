// Number(null) is 0, not NaN - a plain Number.isFinite(Number(value)) check
// silently turns a genuine "I don't know" null (e.g. from an LLM JSON
// response) into a misleading 0. Every caller here needs null rejected
// before any Number() coercion happens - hence this shared helper rather
// than each call site reimplementing the same trap-avoidance.
exports.clampToRange = (value, min, max) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  return Math.max(min, Math.min(max, Number(value)));
};

// Same null-safety, no range clamping (e.g. averageLeadTimeDays, which has
// no natural upper bound).
exports.toNumberOrNull = (value) => (
  value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value)
);
