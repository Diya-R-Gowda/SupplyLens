import Card from './Card';

// Minimal in-app surfacing for Phase 5 Step 5's threshold breaches -
// deliberately a banner, not a new notification channel (no email/
// websocket exists to build on - see TODO.md). Reuses the same narrative
// the twin's lastChange already carries (Step 3) so a breach explains
// itself instead of just showing a bare number - "why" is a click away in
// the Digital Twin panel below, but the headline reason is right here.
//
// Phase 6 Step 3 (Early Warning) adds `projectedAlerts` - a visually
// distinct (amber, not red) second group for "not breaching today, but
// forecast to cross the threshold" - deliberately never merged into the
// same red group as a real, already-happened breach; the language and
// color both say "projected," not "confirmed," so a user can't mistake one
// for the other.
export default function AlertBanner({
  alerts, riskNarrative, healthNarrative, projectedAlerts,
}) {
  if (!alerts && !projectedAlerts) return null;

  const items = [];
  if (alerts?.risk?.breached) {
    items.push({
      key: 'risk',
      text: `Risk score (${alerts.risk.score}) is at or above your alert threshold (${alerts.risk.threshold}).`,
      narrative: riskNarrative,
    });
  }
  if (alerts?.health?.breached) {
    items.push({
      key: 'health',
      text: `Health score (${alerts.health.score}) is at or below your alert threshold (${alerts.health.threshold}).`,
      narrative: healthNarrative,
    });
  }

  const projectedItems = [];
  for (const risk of projectedAlerts?.risk || []) {
    projectedItems.push({
      key: `risk-${risk.horizonDays}`,
      text: `Risk score is projected to reach ${risk.projectedScore} (at or above your threshold of ${risk.threshold}) within ${risk.horizonDays} days if the current trend continues.`,
      confidenceLevel: risk.confidenceLevel,
      interval: risk.confidenceInterval,
    });
  }
  for (const health of projectedAlerts?.health || []) {
    projectedItems.push({
      key: `health-${health.horizonDays}`,
      text: `Health score is projected to fall to ${health.projectedScore} (at or below your threshold of ${health.threshold}) within ${health.horizonDays} days if the current trend continues.`,
      confidenceLevel: health.confidenceLevel,
      interval: health.confidenceInterval,
    });
  }

  if (items.length === 0 && projectedItems.length === 0) return null;

  return (
    <div className="grid gap-2.5">
      {items.length > 0 ? (
        <Card className="grid gap-2 p-4 rounded-2xl bg-red-50 border-red-300/60">
          {items.map((item) => (
            <div key={item.key} className="grid gap-0.5">
              <p className="m-0 font-semibold text-red-800">&#9888; {item.text}</p>
              {item.narrative ? <p className="m-0 text-[0.85rem] text-red-700">{item.narrative}</p> : null}
            </div>
          ))}
        </Card>
      ) : null}
      {projectedItems.length > 0 ? (
        <Card className="grid gap-2 p-4 rounded-2xl bg-amber-50 border-amber-300/60">
          {projectedItems.map((item) => (
            <div key={item.key} className="grid gap-0.5">
              <p className="m-0 font-semibold text-amber-800">&#8635; Early warning - {item.text}</p>
              <p className="m-0 text-[0.8rem] text-amber-700">
                Confidence: {item.confidenceLevel} (range {item.interval.low}-{item.interval.high}) - a projection, not a confirmed breach.
              </p>
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  );
}
