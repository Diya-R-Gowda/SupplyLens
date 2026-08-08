const RiskHistory = require('../models/RiskHistory');
const HealthHistory = require('../models/HealthHistory');
const NewsCache = require('../models/NewsCache');

// Compounding-delta detection (Phase 6 Step 4a) - the genuinely new part of
// "anomaly detection" beyond what Phase 5 already covers. Phase 5's
// SIGNIFICANT_DELTA_THRESHOLD (+/-15 per single update, twinSyncService.js)
// already flags one large single-step move; this detector exists
// specifically for the case that mechanism CANNOT catch: several
// individually small changes (each well under the cap, so none ever
// tripped it) that add up to something real over a rolling window.
const COMPOUND_WINDOW_DAYS = 14;
// Both gates must pass, same anti-false-positive philosophy as
// forecastService.js's MIN_POINTS/MIN_SPAN_HOURS: a handful of rows alone
// isn't enough if they all landed in the same few minutes (one enrichment
// call producing several near-simultaneous writes isn't "compounding drift
// over time," it's one moment). The span bar is lower than forecasting's
// 24h because this looks at a much shorter, rolling window to begin with.
const MIN_ROWS_IN_WINDOW = 3;
const MIN_SPAN_HOURS_IN_WINDOW = 6;
// Same magnitude as Phase 5's single-change significant-change cap -
// deliberately reused, not a new arbitrary number, so "the total drift
// this detector cares about" means the same thing a human already
// associates with "a significant change" elsewhere in the app.
const COMPOUND_DRIFT_THRESHOLD = 15;

const windowRows = async (Model, supplierId, windowDays) => {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  return Model.find({ supplierId, createdAt: { $gte: since } }).select('delta createdAt').sort({ createdAt: 1 }).lean();
};

// Exported (not just used internally) so the math can be unit-tested
// directly against synthetic point arrays, same precedent as
// forecastService.js's exported forecastFromPoints - real 6h+/14-day
// time spread can't be produced within a single live test session, so the
// logic itself is verified this way while insufficient-data abstention is
// verified against real current data separately.
exports.evaluateCompoundingWindow = (rows, direction) => {
  if (rows.length < MIN_ROWS_IN_WINDOW) {
    return {
      status: 'insufficient_data', pointCount: rows.length, minPointsRequired: MIN_ROWS_IN_WINDOW, windowDays: COMPOUND_WINDOW_DAYS,
    };
  }
  const spanHours = (rows[rows.length - 1].createdAt - rows[0].createdAt) / (60 * 60 * 1000);
  if (spanHours < MIN_SPAN_HOURS_IN_WINDOW) {
    return {
      status: 'insufficient_data', pointCount: rows.length, spanHours: Math.round(spanHours * 100) / 100, minSpanHoursRequired: MIN_SPAN_HOURS_IN_WINDOW, windowDays: COMPOUND_WINDOW_DAYS,
    };
  }

  // A window that already contains a single large delta was already caught
  // by Phase 5's own significant-change trigger at the time it happened -
  // this detector is specifically for "no single change was ever flagged,"
  // so it deliberately does not double-report that case as a new anomaly.
  const anySingleLarge = rows.some((r) => Math.abs(r.delta) >= COMPOUND_DRIFT_THRESHOLD);
  const cumulativeDrift = rows.reduce((sum, r) => sum + r.delta, 0);
  const worseningDirection = direction === 'up' ? cumulativeDrift > 0 : cumulativeDrift < 0;
  const detected = !anySingleLarge && worseningDirection && Math.abs(cumulativeDrift) >= COMPOUND_DRIFT_THRESHOLD;

  return {
    status: 'ok',
    detected,
    cumulativeDrift: Math.round(cumulativeDrift * 10) / 10,
    pointCount: rows.length,
    spanHours: Math.round(spanHours * 10) / 10,
    windowDays: COMPOUND_WINDOW_DAYS,
    threshold: COMPOUND_DRIFT_THRESHOLD,
  };
};

// Risk compounding UP (getting worse) and health compounding DOWN (getting
// worse) are the concerning directions - matches evaluateAlerts' own
// "risk is too high, health is too low" convention (alertService.js).
exports.detectCompoundingDrift = async (supplier) => {
  const [riskRows, healthRows] = await Promise.all([
    windowRows(RiskHistory, supplier._id, COMPOUND_WINDOW_DAYS),
    windowRows(HealthHistory, supplier._id, COMPOUND_WINDOW_DAYS),
  ]);

  return {
    risk: exports.evaluateCompoundingWindow(riskRows, 'up'),
    health: exports.evaluateCompoundingWindow(healthRows, 'down'),
  };
};

// Sentiment pattern-shift detection (Phase 6 Step 4b, lower priority per
// the audit) - detects a recent worsening shift in news sentiment. Hard
// ceiling of 7 days, matching NewsCache's own TTL (models/NewsCache.js)
// exactly - articles older than 7 days are deleted by MongoDB's TTL index,
// so "pattern" here can only ever mean "within the last week," never a
// longer trend. This is a real, structural limitation (not a tunable
// parameter) and is surfaced in the result's `windowDays` field so no
// caller can present it as looking back further than it actually can.
const SENTIMENT_WINDOW_DAYS = 7;
const MIN_ARTICLES_FOR_PATTERN = 4;
// The newer half's negative-article share must worsen by at least this
// much (as a 0-1 proportion) relative to the older half to count as a real
// shift, not noise from a couple of articles going either way.
const SENTIMENT_SHIFT_THRESHOLD = 0.4;

const negativeRate = (articles) => articles.filter((a) => a.sentiment === 'negative').length / articles.length;

// Same reasoning as evaluateCompoundingWindow above for being exported as a
// pure function - testable against a synthetic article list directly.
exports.evaluateSentimentWindow = (articles) => {
  if (articles.length < MIN_ARTICLES_FOR_PATTERN) {
    return {
      status: 'insufficient_data', articleCount: articles.length, minArticlesRequired: MIN_ARTICLES_FOR_PATTERN, windowDays: SENTIMENT_WINDOW_DAYS,
    };
  }

  const mid = Math.floor(articles.length / 2);
  const olderNegativeRate = negativeRate(articles.slice(0, mid));
  const newerNegativeRate = negativeRate(articles.slice(mid));
  const shiftMagnitude = newerNegativeRate - olderNegativeRate;

  return {
    status: 'ok',
    detected: shiftMagnitude >= SENTIMENT_SHIFT_THRESHOLD,
    olderNegativeRate: Math.round(olderNegativeRate * 100) / 100,
    newerNegativeRate: Math.round(newerNegativeRate * 100) / 100,
    shiftMagnitude: Math.round(shiftMagnitude * 100) / 100,
    articleCount: articles.length,
    windowDays: SENTIMENT_WINDOW_DAYS,
  };
};

exports.detectSentimentShift = async (supplier) => {
  const since = new Date(Date.now() - SENTIMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const articles = await NewsCache.find({
    supplierId: supplier._id, publishedAt: { $gte: since }, sentiment: { $ne: null },
  }).select('sentiment publishedAt').sort({ publishedAt: 1 }).lean();

  return exports.evaluateSentimentWindow(articles);
};

exports.detectAnomalies = async (supplier) => {
  const [compoundingDrift, sentimentShift] = await Promise.all([
    exports.detectCompoundingDrift(supplier),
    exports.detectSentimentShift(supplier),
  ]);
  return { compoundingDrift, sentimentShift };
};
