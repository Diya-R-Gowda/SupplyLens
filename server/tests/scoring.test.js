const { applyCappedDelta } = require('../services/scoringEngine');

// Pure math, no DB - the guardrail every score recompute (risk AND health)
// goes through before a number ever hits the database, so it deserves a
// direct test independent of eyeballing real numbers through the UI.
describe('scoringEngine.applyCappedDelta', () => {
  test('moves fully to the raw score when the delta is within the cap', () => {
    const result = applyCappedDelta(50, 60, 15);
    expect(result).toEqual({ newScore: 60, delta: 10 });
  });

  test('caps a positive delta that exceeds maxDelta', () => {
    const result = applyCappedDelta(50, 90, 15);
    expect(result.newScore).toBe(65);
    expect(result.delta).toBe(15);
  });

  test('caps a negative delta that exceeds maxDelta', () => {
    const result = applyCappedDelta(50, 10, 15);
    expect(result.newScore).toBe(35);
    expect(result.delta).toBe(-15);
  });

  test('clamps the result at 100 even if the capped delta would overshoot', () => {
    const result = applyCappedDelta(95, 200, 15);
    expect(result.newScore).toBe(100);
  });

  test('clamps the result at 0 even if the capped delta would undershoot', () => {
    const result = applyCappedDelta(5, -200, 15);
    expect(result.newScore).toBe(0);
  });

  test('returns zero delta when the raw score equals the previous score', () => {
    const result = applyCappedDelta(42, 42, 15);
    expect(result).toEqual({ newScore: 42, delta: 0 });
  });

  test('an uncapped move to exactly the cap boundary is not further reduced', () => {
    const result = applyCappedDelta(50, 65, 15);
    expect(result.newScore).toBe(65);
  });
});
