// Hand-rolled linear-regression forecasting - deliberately not a real
// time-series library. The Phase 6 audit was explicit that, given how thin
// real history currently is (max 4 RiskHistory rows for any current
// supplier, most clustered within milliseconds of each other from test
// scripts), anything resembling real time-series modeling (ARIMA,
// exponential smoothing, etc.) would have more free parameters than data
// points and would be actively misleading. A straight line through however
// many real, meaningfully time-spread points exist - with an honest,
// widening confidence interval and an explicit refusal below a minimum
// threshold - is the only defensible approach at this data density. No new
// dependency needed or added.
//
// Every constant below is deliberately named and commented rather than a
// magic number buried in the math, per the build instructions - these are
// the actual product judgment calls this phase makes, and they're the
// first thing to revisit once real usage accumulates more history (see
// TODO.md).

// Minimum number of history rows before per-supplier forecasting will
// produce a number at all. This alone is not sufficient - see
// MIN_SPAN_HOURS below - a supplier needs both a minimum count AND a
// minimum real time spread across those points.
const MIN_POINTS = 5;

// A burst of same-instant test-script writes (the Phase 6 audit found 4
// RiskHistory rows for one supplier within 0.03 seconds of each other) must
// never count as 5 real, calendar-spread observations. RiskHistory's own
// 24h rate-limit-per-reason means two DIFFERENT real triggers (e.g. a news
// update and an enrichment refresh) can still land on the same calendar
// day, so this isn't "one point per day minimum" - it's a floor on the
// TOTAL span from the earliest to the latest point.
const MIN_SPAN_HOURS = 24;

// How many days out a forecast is allowed to project. Kept short and fixed
// deliberately - the further out, the less a straight-line extrapolation
// from a handful of points means anything at all. 7 and 30 days chosen to
// match the alert-threshold horizons Step 3 (Early Warning) needs.
const FORECAST_HORIZONS_DAYS = [7, 30];

// The confidence interval widens as the actual point count falls short of
// this anchor. Chosen as a round number well above what any supplier or
// even the whole portfolio realistically has right now - the interval is
// supposed to look wide today; that's the honest answer, not a bug.
const CONFIDENCE_ANCHOR_POINT_COUNT = 20;

// A tiny sample can produce a deceptively tight residual fit (few points ->
// few degrees of freedom -> an almost-perfect line) even though it says
// nothing reliable about the future. Floors the interval's base width (in
// score points, 0-100 scale) so a lucky small-sample fit never presents as
// more certain than it actually is.
const MIN_RESIDUAL_FLOOR = 5;

// confidenceLevel is capped at 'medium' in this version, never 'high' -
// deliberately. A hand-rolled linear regression over at most a few dozen
// points, on a hand-tuned 0-100 business score, should never claim to be
// highly confident, no matter how much data accumulates within the
// timeframe this phase can be evaluated against. Revisit only after real
// production usage has run long enough to validate the model's actual
// track record (see TODO.md).
const MEDIUM_CONFIDENCE_MIN_POINTS = 10;
const MEDIUM_CONFIDENCE_MIN_SPAN_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Sorts and checks a raw {timestamp, score} point series against the
 * minimum-count and minimum-spread gates. Pure, no DB access - reusable for
 * both a single supplier's RiskHistory/HealthHistory rows and a portfolio's
 * day-bucketed series.
 */
const assessDataSufficiency = (rawPoints) => {
  const points = [...rawPoints].sort((a, b) => a.timestamp - b.timestamp);
  const pointCount = points.length;

  if (pointCount === 0) {
    return {
      sufficient: false, reason: 'no_history', pointCount: 0, spanHours: 0,
    };
  }

  const spanHours = (points[points.length - 1].timestamp - points[0].timestamp) / (60 * 60 * 1000);

  if (pointCount < MIN_POINTS) {
    return {
      sufficient: false, reason: 'too_few_points', pointCount, spanHours: Math.round(spanHours * 100) / 100,
    };
  }
  if (spanHours < MIN_SPAN_HOURS) {
    return {
      sufficient: false, reason: 'insufficient_time_spread', pointCount, spanHours: Math.round(spanHours * 100) / 100,
    };
  }

  return { sufficient: true, pointCount, spanHours: Math.round(spanHours * 100) / 100 };
};

// Ordinary least squares over {t: days-since-first-point, y: score}.
const fitLinearRegression = (points) => {
  const n = points.length;
  const meanT = points.reduce((sum, p) => sum + p.t, 0) / n;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / n;
  const ssT = points.reduce((sum, p) => sum + (p.t - meanT) ** 2, 0);
  const ssTY = points.reduce((sum, p) => sum + (p.t - meanT) * (p.y - meanY), 0);
  const slope = ssT === 0 ? 0 : ssTY / ssT;
  const intercept = meanY - slope * meanT;
  const residualSumSq = points.reduce((sum, p) => sum + (p.y - (intercept + slope * p.t)) ** 2, 0);
  const rmse = Math.sqrt(residualSumSq / n);
  return { slope, intercept, rmse };
};

const confidenceLevel = (pointCount, spanDays) => {
  if (pointCount >= MEDIUM_CONFIDENCE_MIN_POINTS && spanDays >= MEDIUM_CONFIDENCE_MIN_SPAN_DAYS) return 'medium';
  return 'low';
};

// Wider when points are sparse relative to the anchor, and wider still when
// projecting further out than the actual observed time span - both are
// honest signals of "how much are we extrapolating beyond what's actually
// been seen," not arbitrary padding.
const confidenceHalfWidth = ({ rmse, pointCount, spanDays, horizonDays }) => {
  const base = Math.max(rmse, MIN_RESIDUAL_FLOOR);
  const pointFactor = Math.sqrt(CONFIDENCE_ANCHOR_POINT_COUNT / Math.max(pointCount, 1));
  const horizonFactor = 1 + Math.max(0, (horizonDays - spanDays) / Math.max(spanDays, 1));
  return base * pointFactor * horizonFactor;
};

const clampScore = (value) => Math.max(0, Math.min(100, value));

/**
 * Produces a forecast from a raw {timestamp, score} point series, or an
 * explicit insufficient_data result with the real point count/span and what
 * was required, if the sufficiency gates aren't met. Never a hidden zero,
 * never a silently-omitted field - every caller (route or alert logic) gets
 * a `status` it must branch on.
 */
const forecastFromPoints = (rawPoints, horizonsDays = FORECAST_HORIZONS_DAYS) => {
  const sufficiency = assessDataSufficiency(rawPoints);

  if (!sufficiency.sufficient) {
    return {
      status: 'insufficient_data',
      dataQuality: {
        pointCount: sufficiency.pointCount,
        spanHours: sufficiency.spanHours,
        minPointsRequired: MIN_POINTS,
        minSpanHoursRequired: MIN_SPAN_HOURS,
        reason: sufficiency.reason,
      },
      projections: [],
    };
  }

  const points = [...rawPoints].sort((a, b) => a.timestamp - b.timestamp);
  const firstMs = points[0].timestamp.getTime();
  const regressionPoints = points.map((p) => ({ t: (p.timestamp.getTime() - firstMs) / DAY_MS, y: p.score }));
  const { slope, intercept, rmse } = fitLinearRegression(regressionPoints);
  const spanDays = regressionPoints[regressionPoints.length - 1].t;
  const level = confidenceLevel(points.length, spanDays);

  const projections = horizonsDays.map((horizonDays) => {
    const tAtHorizon = spanDays + horizonDays;
    const rawProjected = intercept + slope * tAtHorizon;
    const halfWidth = confidenceHalfWidth({
      rmse, pointCount: points.length, spanDays, horizonDays,
    });
    return {
      horizonDays,
      projectedScore: Math.round(clampScore(rawProjected)),
      confidenceInterval: {
        low: Math.round(clampScore(rawProjected - halfWidth)),
        high: Math.round(clampScore(rawProjected + halfWidth)),
        halfWidth: Math.round(halfWidth * 10) / 10,
      },
    };
  });

  return {
    status: 'ok',
    dataQuality: {
      pointCount: points.length,
      spanHours: sufficiency.spanHours,
      spanDays: Math.round(spanDays * 10) / 10,
      confidenceLevel: level,
    },
    trend: {
      slope: Math.round(slope * 1000) / 1000,
      direction: slope > 0.05 ? 'rising' : (slope < -0.05 ? 'falling' : 'flat'),
    },
    projections,
  };
};

module.exports = {
  MIN_POINTS,
  MIN_SPAN_HOURS,
  FORECAST_HORIZONS_DAYS,
  assessDataSufficiency,
  forecastFromPoints,
};
