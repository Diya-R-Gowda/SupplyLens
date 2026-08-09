const { assessDataSufficiency, forecastFromPoints, MIN_POINTS, MIN_SPAN_HOURS } = require('../services/forecastService');

const DAY_MS = 24 * 60 * 60 * 1000;
const BASE = new Date('2026-01-01T00:00:00.000Z').getTime();

// Builds a {timestamp, score} series starting at BASE, one point every
// `stepDays` days, with `score = startScore + i*scorePerStep`.
const buildPoints = (count, { stepDays = 1, startScore = 50, scorePerStep = 0 } = {}) => Array.from({ length: count }, (_, i) => ({
  timestamp: new Date(BASE + i * stepDays * DAY_MS),
  score: startScore + i * scorePerStep,
}));

// Pure math, no DB - the same gating/regression logic silently underlies
// every per-supplier and portfolio forecast panel in the UI, previously only
// ever verified by eyeballing whether a chart "looked reasonable".
describe('forecastService.assessDataSufficiency', () => {
  test('reports no_history for an empty series', () => {
    const result = assessDataSufficiency([]);
    expect(result).toEqual({ sufficient: false, reason: 'no_history', pointCount: 0, spanHours: 0 });
  });

  test('reports too_few_points below MIN_POINTS even with a wide time spread', () => {
    const points = buildPoints(MIN_POINTS - 1, { stepDays: 10 });
    const result = assessDataSufficiency(points.map((p) => ({ timestamp: p.timestamp })));
    expect(result.sufficient).toBe(false);
    expect(result.reason).toBe('too_few_points');
    expect(result.pointCount).toBe(MIN_POINTS - 1);
  });

  test('reports insufficient_time_spread with enough points clustered within MIN_SPAN_HOURS', () => {
    // 5 points all within a couple of minutes of each other - exactly the
    // "burst of same-instant test-script writes" case the code comments
    // describe as the reason this second gate exists at all.
    const points = Array.from({ length: MIN_POINTS }, (_, i) => ({ timestamp: new Date(BASE + i * 1000) }));
    const result = assessDataSufficiency(points);
    expect(result.sufficient).toBe(false);
    expect(result.reason).toBe('insufficient_time_spread');
  });

  test('is sufficient with enough points spread beyond MIN_SPAN_HOURS', () => {
    const points = buildPoints(MIN_POINTS, { stepDays: 1 }).map((p) => ({ timestamp: p.timestamp }));
    const result = assessDataSufficiency(points);
    expect(result.sufficient).toBe(true);
    expect(result.pointCount).toBe(MIN_POINTS);
    expect(result.spanHours).toBeGreaterThanOrEqual(MIN_SPAN_HOURS);
  });
});

describe('forecastService.forecastFromPoints', () => {
  test('returns insufficient_data status with real point count/reason when gates are not met', () => {
    const result = forecastFromPoints(buildPoints(2, { stepDays: 5 }));
    expect(result.status).toBe('insufficient_data');
    expect(result.dataQuality.pointCount).toBe(2);
    expect(result.dataQuality.reason).toBe('too_few_points');
    expect(result.projections).toEqual([]);
  });

  test('fits a rising trend correctly for a clearly increasing series', () => {
    // score rises by 2 points/day for 10 days - slope should come back ~2.
    const points = buildPoints(10, { stepDays: 1, startScore: 20, scorePerStep: 2 });
    const result = forecastFromPoints(points);

    expect(result.status).toBe('ok');
    expect(result.trend.direction).toBe('rising');
    expect(result.trend.slope).toBeCloseTo(2, 1);
    // Projected 7 days past the last real point (day 9) at +2/day from score 38 -> ~52.
    const sevenDay = result.projections.find((p) => p.horizonDays === 7);
    expect(sevenDay.projectedScore).toBeGreaterThan(38);
  });

  test('fits a falling trend correctly for a clearly decreasing series', () => {
    const points = buildPoints(10, { stepDays: 1, startScore: 80, scorePerStep: -3 });
    const result = forecastFromPoints(points);

    expect(result.status).toBe('ok');
    expect(result.trend.direction).toBe('falling');
    expect(result.trend.slope).toBeCloseTo(-3, 1);
  });

  test('reports flat direction for a perfectly flat series', () => {
    const points = buildPoints(10, { stepDays: 1, startScore: 50, scorePerStep: 0 });
    const result = forecastFromPoints(points);

    expect(result.status).toBe('ok');
    expect(result.trend.direction).toBe('flat');
    expect(result.trend.slope).toBeCloseTo(0, 5);
  });

  test('projected scores are always clamped to the 0-100 range', () => {
    // A steep enough rise that a naive linear projection at the 30-day
    // horizon would blow past 100 - the forecast must clamp, not report a
    // nonsensical score above the model's own valid scale.
    const points = buildPoints(10, { stepDays: 1, startScore: 90, scorePerStep: 5 });
    const result = forecastFromPoints(points);

    result.projections.forEach((p) => {
      expect(p.projectedScore).toBeGreaterThanOrEqual(0);
      expect(p.projectedScore).toBeLessThanOrEqual(100);
      expect(p.confidenceInterval.low).toBeGreaterThanOrEqual(0);
      expect(p.confidenceInterval.high).toBeLessThanOrEqual(100);
    });
  });

  test('confidence level stays low below the medium-confidence point/span thresholds', () => {
    const points = buildPoints(5, { stepDays: 1, startScore: 50, scorePerStep: 1 });
    const result = forecastFromPoints(points);
    expect(result.dataQuality.confidenceLevel).toBe('low');
  });

  test('confidence level reaches medium once point count and span both clear their thresholds', () => {
    const points = buildPoints(15, { stepDays: 2, startScore: 50, scorePerStep: 1 }); // 15 points, 28-day span
    const result = forecastFromPoints(points);
    expect(result.dataQuality.confidenceLevel).toBe('medium');
  });

  test('never reports a confidence level above medium, regardless of fit quality', () => {
    // A huge, perfectly linear series - if this were going to claim "high"
    // confidence anywhere, it would be here. The code deliberately hardcodes
    // a ceiling of 'medium' - confirm that decision is actually enforced.
    const points = buildPoints(50, { stepDays: 3, startScore: 10, scorePerStep: 1 });
    const result = forecastFromPoints(points);
    expect(['low', 'medium']).toContain(result.dataQuality.confidenceLevel);
    expect(result.dataQuality.confidenceLevel).not.toBe('high');
  });
});
