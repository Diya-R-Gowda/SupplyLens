const { evaluateAlerts, isNewBreach, evaluateProjectedBreach } = require('../services/alertService');

// Pure, compute-on-read threshold logic - no DB, no Gemini. Backs the
// Digital Twin's `alerts`/`projectedAlerts` fields and alertCron's dedup
// check, so its allow/deny math deserves direct coverage independent of
// eyeballing a twin response.
describe('alertService.evaluateAlerts', () => {
  test('disabled thresholds report not-breached for both metrics, still passing the configured threshold through (only a fully absent thresholds object nulls it)', () => {
    const supplier = { riskScore: 90, healthScore: 5 };
    const result = evaluateAlerts(supplier, { enabled: false, riskThreshold: 70, healthThreshold: 30 });
    expect(result).toEqual({
      risk: { breached: false, score: 90, threshold: 70 },
      health: { breached: false, score: 5, threshold: 30 },
    });
  });

  test('a completely missing thresholds object is treated the same as disabled', () => {
    const result = evaluateAlerts({ riskScore: 90, healthScore: 5 }, undefined);
    expect(result.risk.breached).toBe(false);
    expect(result.health.breached).toBe(false);
    expect(result.risk.threshold).toBeNull();
  });

  test('risk breaches when the score is at or above the threshold ("too high")', () => {
    const thresholds = { enabled: true, riskThreshold: 70, healthThreshold: 30 };
    expect(evaluateAlerts({ riskScore: 70, healthScore: 50 }, thresholds).risk).toEqual({ breached: true, score: 70, threshold: 70 });
    expect(evaluateAlerts({ riskScore: 71, healthScore: 50 }, thresholds).risk.breached).toBe(true);
  });

  test('risk does not breach below the threshold', () => {
    const thresholds = { enabled: true, riskThreshold: 70, healthThreshold: 30 };
    expect(evaluateAlerts({ riskScore: 69, healthScore: 50 }, thresholds).risk.breached).toBe(false);
  });

  test('health breaches when the score is at or below the threshold ("too low") - inverted direction vs. risk', () => {
    const thresholds = { enabled: true, riskThreshold: 70, healthThreshold: 30 };
    expect(evaluateAlerts({ riskScore: 10, healthScore: 30 }, thresholds).health).toEqual({ breached: true, score: 30, threshold: 30 });
    expect(evaluateAlerts({ riskScore: 10, healthScore: 29 }, thresholds).health.breached).toBe(true);
  });

  test('health does not breach above the threshold', () => {
    const thresholds = { enabled: true, riskThreshold: 70, healthThreshold: 30 };
    expect(evaluateAlerts({ riskScore: 10, healthScore: 31 }, thresholds).health.breached).toBe(false);
  });
});

describe('alertService.isNewBreach', () => {
  test('a fresh crossing above the threshold is a new breach', () => {
    expect(isNewBreach(65, 75, 70, 'above')).toBe(true);
  });

  test('a score that was already at/above threshold moving further does not re-trigger', () => {
    expect(isNewBreach(80, 90, 70, 'above')).toBe(false);
    expect(isNewBreach(70, 90, 70, 'above')).toBe(false); // already exactly at threshold
  });

  test('a score that stays below the threshold is not a new breach', () => {
    expect(isNewBreach(50, 60, 70, 'above')).toBe(false);
  });

  test('crossing exactly onto the threshold counts as breaching on the new side', () => {
    expect(isNewBreach(69, 70, 70, 'above')).toBe(true);
  });

  test('the "below" direction (health) is a mirror image of "above"', () => {
    expect(isNewBreach(35, 25, 30, 'below')).toBe(true); // fresh crossing down
    expect(isNewBreach(20, 10, 30, 'below')).toBe(false); // already breached, moved further
    expect(isNewBreach(90, 80, 30, 'below')).toBe(false); // stays above threshold
  });

  test('returns false, never throws, for non-numeric inputs', () => {
    expect(isNewBreach(null, 75, 70, 'above')).toBe(false);
    expect(isNewBreach(65, undefined, 70, 'above')).toBe(false);
    expect(isNewBreach(65, 75, 'seventy', 'above')).toBe(false);
    expect(isNewBreach('sixty-five', 75, 70, 'above')).toBe(false);
  });
});

describe('alertService.evaluateProjectedBreach', () => {
  const thresholds = { enabled: true, riskThreshold: 70, healthThreshold: 30 };

  test('disabled thresholds return empty risk/health arrays regardless of forecast', () => {
    const forecast = { risk: { status: 'ok', projections: [{ horizonDays: 7, projectedScore: 99 }], dataQuality: { confidenceLevel: 'medium' } } };
    expect(evaluateProjectedBreach({ riskScore: 10, healthScore: 90 }, forecast, { enabled: false })).toEqual({ risk: [], health: [] });
  });

  test('a missing forecast returns empty arrays', () => {
    expect(evaluateProjectedBreach({ riskScore: 10, healthScore: 90 }, null, thresholds)).toEqual({ risk: [], health: [] });
  });

  test('a metric already breaching today is excluded from its own projected list (that is evaluateAlerts\' job, not a fresh warning)', () => {
    const supplier = { riskScore: 80, healthScore: 90 };
    const forecast = {
      risk: { status: 'ok', projections: [{ horizonDays: 7, projectedScore: 85, confidenceInterval: [80, 90] }], dataQuality: { confidenceLevel: 'medium' } },
    };
    expect(evaluateProjectedBreach(supplier, forecast, thresholds).risk).toEqual([]);
  });

  test('projects a future risk breach, mapping horizon/score/threshold/CI/confidence, and drops horizons that never cross', () => {
    const supplier = { riskScore: 50, healthScore: 90 };
    const forecast = {
      risk: {
        status: 'ok',
        projections: [
          { horizonDays: 7, projectedScore: 60, confidenceInterval: [55, 65] },
          { horizonDays: 30, projectedScore: 75, confidenceInterval: [65, 85] },
        ],
        dataQuality: { confidenceLevel: 'medium' },
      },
    };
    expect(evaluateProjectedBreach(supplier, forecast, thresholds).risk).toEqual([
      { horizonDays: 30, projectedScore: 75, threshold: 70, confidenceInterval: [65, 85], confidenceLevel: 'medium' },
    ]);
  });

  test('projects a future health breach using the inverted (<=) direction', () => {
    const supplier = { riskScore: 10, healthScore: 50 };
    const forecast = {
      health: {
        status: 'ok',
        projections: [
          { horizonDays: 7, projectedScore: 40, confidenceInterval: [35, 45] },
          { horizonDays: 30, projectedScore: 25, confidenceInterval: [15, 35] },
        ],
        dataQuality: { confidenceLevel: 'low' },
      },
    };
    expect(evaluateProjectedBreach(supplier, forecast, thresholds).health).toEqual([
      { horizonDays: 30, projectedScore: 25, threshold: 30, confidenceInterval: [15, 35], confidenceLevel: 'low' },
    ]);
  });

  test('a non-ok forecast status (insufficient_data) contributes no projected breaches - no fallback guess', () => {
    const supplier = { riskScore: 50, healthScore: 90 };
    const forecast = { risk: { status: 'insufficient_data', projections: [] } };
    expect(evaluateProjectedBreach(supplier, forecast, thresholds).risk).toEqual([]);
  });

  test('risk and health are evaluated independently - one can project while the other has no data at all', () => {
    const supplier = { riskScore: 50, healthScore: 50 };
    const forecast = {
      risk: { status: 'ok', projections: [{ horizonDays: 30, projectedScore: 80, confidenceInterval: [70, 90] }], dataQuality: { confidenceLevel: 'medium' } },
      // no `health` key at all
    };
    const result = evaluateProjectedBreach(supplier, forecast, thresholds);
    expect(result.risk).toHaveLength(1);
    expect(result.health).toEqual([]);
  });
});
