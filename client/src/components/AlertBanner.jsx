import Card from './Card';

// Minimal in-app surfacing for Phase 5 Step 5's threshold breaches -
// deliberately a banner, not a new notification channel (no email/
// websocket exists to build on - see TODO.md). Reuses the same narrative
// the twin's lastChange already carries (Step 3) so a breach explains
// itself instead of just showing a bare number - "why" is a click away in
// the Digital Twin panel below, but the headline reason is right here.
export default function AlertBanner({ alerts, riskNarrative, healthNarrative }) {
  if (!alerts) return null;

  const items = [];
  if (alerts.risk?.breached) {
    items.push({
      key: 'risk',
      text: `Risk score (${alerts.risk.score}) is at or above your alert threshold (${alerts.risk.threshold}).`,
      narrative: riskNarrative,
    });
  }
  if (alerts.health?.breached) {
    items.push({
      key: 'health',
      text: `Health score (${alerts.health.score}) is at or below your alert threshold (${alerts.health.threshold}).`,
      narrative: healthNarrative,
    });
  }

  if (items.length === 0) return null;

  return (
    <Card className="grid gap-2 p-4 rounded-2xl bg-red-50 border-red-300/60">
      {items.map((item) => (
        <div key={item.key} className="grid gap-0.5">
          <p className="m-0 font-semibold text-red-800">&#9888; {item.text}</p>
          {item.narrative ? <p className="m-0 text-[0.85rem] text-red-700">{item.narrative}</p> : null}
        </div>
      ))}
    </Card>
  );
}
