const { generateAnswer } = require('./embedService');
const { clampToRange } = require('../utils/numberCoercion');
const { computeFactors } = require('./riskScoreService');
const { computeHealthFactors } = require('./healthScoreService');
const { getOrgWeights, getOrgAlertThresholds } = require('./riskConfigService');
const { buildNarrativesForHistory } = require('./narrativeService');
const { evaluateAlerts, evaluateProjectedBreach } = require('./alertService');
const { getSupplierForecast } = require('./predictiveAnalyticsService');
const { detectAnomalies } = require('./anomalyService');
const RiskHistory = require('../models/RiskHistory');
const HealthHistory = require('../models/HealthHistory');

// Phase 8 Step 1 - Risk Analyst Agent. Per the audit (CONTRIBUTING.md), this
// is the strongest candidate for genuine new capability in this phase: every
// dimension gathered below is ALREADY real and independently computed
// elsewhere (riskScoreService/healthScoreService's live factors,
// RiskHistory/HealthHistory's audit trail plus narrativeService's
// deterministic per-change prose, predictiveAnalyticsService's forecast,
// anomalyService's findings, alertService's active/projected alerts) - but
// nothing today reads all of it in one place and writes a single coherent
// assessment. Gemini's only job here is synthesis of real numbers already
// computed above, never invention - the prompt says so explicitly, and every
// dimension's actual availability (not just its content) is computed in code
// and handed to Gemini as a stated fact, not left for it to infer or guess.
const describeForecast = (forecast, label) => {
  if (!forecast || forecast.status !== 'ok') {
    return `${label} forecast: not available (${forecast?.status === 'insufficient_data' ? `insufficient history - ${forecast.pointCount ?? 0} point(s) collected` : 'no forecast computed'}).`;
  }
  const projections = forecast.projections.map((p) => `${p.horizonDays}d: ${p.projectedScore}`).join(', ');
  return `${label} forecast: available (confidence ${forecast.dataQuality.confidenceLevel}) - projections: ${projections}.`;
};

const describeAnomaly = (result, label) => {
  if (!result || result.status !== 'ok') return `${label}: not available (insufficient recent data).`;
  return `${label}: ${result.detected ? 'DETECTED' : 'not detected'} (${JSON.stringify(result)}).`;
};

const gatherRiskContext = async (supplier) => {
  const [
    riskFactors, healthFactors, weights, alertThresholds, forecast, anomalies, riskHistory, healthHistory,
  ] = await Promise.all([
    computeFactors(supplier),
    computeHealthFactors(supplier),
    getOrgWeights(supplier.orgId),
    getOrgAlertThresholds(supplier.orgId),
    getSupplierForecast(supplier),
    detectAnomalies(supplier),
    RiskHistory.find({ supplierId: supplier._id }).sort({ createdAt: 1 }).lean(),
    HealthHistory.find({ supplierId: supplier._id }).sort({ createdAt: 1 }).lean(),
  ]);

  const alerts = evaluateAlerts(supplier, alertThresholds);
  const projectedAlerts = evaluateProjectedBreach(supplier, forecast, alertThresholds);

  const riskNarratives = buildNarrativesForHistory(riskHistory, weights.risk, 'risk');
  const healthNarratives = buildNarrativesForHistory(healthHistory, weights.health, 'health');
  const lastRiskChange = riskHistory[riskHistory.length - 1] || null;
  const lastHealthChange = healthHistory[healthHistory.length - 1] || null;

  // Computed independently of anything Gemini says, so the client always has
  // a trustworthy machine-readable record of what was actually real and
  // available for this run - even if the prose happens to omit a dimension.
  const dataAvailability = {
    riskHistoryPoints: riskHistory.length,
    healthHistoryPoints: healthHistory.length,
    forecastAvailable: { risk: forecast.risk.status === 'ok', health: forecast.health.status === 'ok' },
    anomalyDataAvailable: {
      compoundingDriftRisk: anomalies.compoundingDrift.risk.status === 'ok',
      compoundingDriftHealth: anomalies.compoundingDrift.health.status === 'ok',
      sentimentShift: anomalies.sentimentShift.status === 'ok',
    },
    alertsEnabled: !!alertThresholds?.enabled,
  };

  return {
    supplier: { name: supplier.name, category: supplier.category, country: supplier.country },
    riskScore: supplier.riskScore,
    healthScore: supplier.healthScore,
    riskFactors,
    healthFactors,
    lastRiskChange: lastRiskChange && { ...lastRiskChange, narrative: riskNarratives.get(String(lastRiskChange._id)) },
    lastHealthChange: lastHealthChange && { ...lastHealthChange, narrative: healthNarratives.get(String(lastHealthChange._id)) },
    forecast,
    anomalies,
    alerts,
    projectedAlerts,
    dataAvailability,
  };
};

const buildPrompt = (ctx) => {
  const { supplier } = ctx;

  const alertLines = [
    `Risk threshold breach: ${ctx.alerts.risk.breached ? `YES (score ${ctx.alerts.risk.score} vs threshold ${ctx.alerts.risk.threshold})` : 'no'}.`,
    `Health threshold breach: ${ctx.alerts.health.breached ? `YES (score ${ctx.alerts.health.score} vs threshold ${ctx.alerts.health.threshold})` : 'no'}.`,
    `Projected (early-warning) risk breaches: ${ctx.projectedAlerts.risk.length ? ctx.projectedAlerts.risk.map((p) => `in ${p.horizonDays}d`).join(', ') : 'none'}.`,
    `Projected (early-warning) health breaches: ${ctx.projectedAlerts.health.length ? ctx.projectedAlerts.health.map((p) => `in ${p.horizonDays}d`).join(', ') : 'none'}.`,
  ].join('\n');

  return `You are a supply-chain risk analyst writing an assessment of the supplier "${supplier.name}" (category: ${supplier.category || 'unspecified'}, country: ${supplier.country}) for a risk manager. Use ONLY the real data below - do not invent additional facts, figures, events, or claims not present here. Where a dimension below is explicitly marked as not available, say so plainly in your assessment rather than silently omitting it or guessing a value.

CURRENT SCORES: risk ${ctx.riskScore}/100, health ${ctx.healthScore}/100.
Risk factors: ${JSON.stringify(ctx.riskFactors)}.
Health factors: ${JSON.stringify(ctx.healthFactors)}.

HISTORY: ${ctx.dataAvailability.riskHistoryPoints} risk change(s), ${ctx.dataAvailability.healthHistoryPoints} health change(s) on record.
${ctx.lastRiskChange ? `Most recent risk change: ${ctx.lastRiskChange.narrative}` : 'No risk change history on record.'}
${ctx.lastHealthChange ? `Most recent health change: ${ctx.lastHealthChange.narrative}` : 'No health change history on record.'}

FORECAST:
${describeForecast(ctx.forecast.risk, 'Risk')}
${describeForecast(ctx.forecast.health, 'Health')}

ANOMALY DETECTION:
${describeAnomaly(ctx.anomalies.compoundingDrift.risk, 'Compounding risk drift (14-day window)')}
${describeAnomaly(ctx.anomalies.compoundingDrift.health, 'Compounding health drift (14-day window)')}
${describeAnomaly(ctx.anomalies.sentimentShift, 'News sentiment shift (7-day window)')}

ALERTS:
${alertLines}

Write a written risk assessment (3-6 sentences) synthesizing the above for a decision-maker, and list 0-5 key concerns as short bullet phrases (empty array if genuinely nothing concerning stands out from the real data above).

Respond with ONLY a JSON object, no markdown formatting, no code fences, in exactly this shape:
{"assessment": "<3-6 sentence written risk assessment, referencing only the real data above>", "keyConcerns": ["<short concern phrase, under 15 words>"], "confidence": <0-1 number - how confident you are this assessment is a fair, accurate synthesis of the real data provided, not confidence in the supplier itself>}`;
};

exports.analyzeRisk = async (supplier) => {
  const context = await gatherRiskContext(supplier);
  const prompt = buildPrompt(context);

  const raw = await generateAnswer(prompt);
  const jsonText = raw.replace(/```json|```/gi, '').trim();
  const parsed = JSON.parse(jsonText);

  if (typeof parsed.assessment !== 'string' || !parsed.assessment.trim()) {
    throw new Error(`Unexpected risk-analyst response shape: ${raw}`);
  }

  return {
    assessment: parsed.assessment.trim(),
    keyConcerns: Array.isArray(parsed.keyConcerns) ? parsed.keyConcerns.filter((s) => typeof s === 'string') : [],
    confidence: clampToRange(parsed.confidence, 0, 1),
    dataAvailability: context.dataAvailability,
    source: 'gemini',
    generatedAt: new Date(),
  };
};
