import Card from './Card';
import Badge from './Badge';

// Portfolio-wide view of GET /dashboard/stats's activeAlerts (Phase 5 Step
// 5) - up to 10 suppliers currently breaching the org's configured risk/
// health thresholds - plus projectedActiveAlerts (Phase 6 Step 3, Early
// Warning) - up to 10 suppliers NOT currently breaching but forecast to,
// rendered as a visually distinct (amber, not red) second section so
// "already a problem" and "trending toward one" never look the same at a
// glance. Not available in demo mode or when alerting is disabled (both
// render the same empty state as "nothing needs attention").
export default function ActiveAlertsPanel({ activeAlerts, projectedActiveAlerts, onOpen }) {
  const hasActive = activeAlerts && activeAlerts.length > 0;
  const hasProjected = projectedActiveAlerts && projectedActiveAlerts.length > 0;

  if (!hasActive && !hasProjected) {
    return (
      <Card className="rounded-[20px] p-5 bg-white/75">
        <h2 className="mt-0 mb-2 text-[1.1rem] text-slate-900">Active alerts</h2>
        <p className="m-0 text-slate-600">No suppliers currently breach - or are forecast to breach - your configured thresholds.</p>
      </Card>
    );
  }

  return (
    <Card className="rounded-[20px] p-5 bg-white/75">
      {hasActive ? (
        <div className="grid gap-2.5 mb-3">
          <h2 className="m-0 text-[1.1rem] text-slate-900">Active alerts</h2>
          {activeAlerts.map((entry) => (
            <div
              key={entry.supplierId}
              className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-3 rounded-[14px] bg-red-50 border border-red-300/40 cursor-pointer"
              onClick={() => onOpen?.({ _id: entry.supplierId })}
              role="button"
              tabIndex={0}
            >
              <span className="font-bold text-slate-900">{entry.name}</span>
              <div className="flex items-center gap-2">
                {entry.riskBreached ? (
                  <Badge className="px-2.5 py-1 bg-red-100 text-red-800 text-[0.8rem]">Risk {entry.riskScore}</Badge>
                ) : null}
                {entry.healthBreached ? (
                  <Badge className="px-2.5 py-1 bg-red-100 text-red-800 text-[0.8rem]">Health {entry.healthScore}</Badge>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {hasProjected ? (
        <div className="grid gap-2.5">
          <h2 className="m-0 text-[1.1rem] text-slate-900">Early warnings - projected breaches</h2>
          {projectedActiveAlerts.map((entry) => (
            <div
              key={entry.supplierId}
              className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-3 rounded-[14px] bg-amber-50 border border-amber-300/40 cursor-pointer"
              onClick={() => onOpen?.({ _id: entry.supplierId })}
              role="button"
              tabIndex={0}
            >
              <span className="font-bold text-slate-900">{entry.name}</span>
              <div className="flex items-center gap-2">
                {entry.projectedRiskBreach ? (
                  <Badge className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[0.8rem]">
                    Risk &rarr; {entry.projectedRiskBreach.projectedScore} in {entry.projectedRiskBreach.horizonDays}d
                  </Badge>
                ) : null}
                {entry.projectedHealthBreach ? (
                  <Badge className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[0.8rem]">
                    Health &rarr; {entry.projectedHealthBreach.projectedScore} in {entry.projectedHealthBreach.horizonDays}d
                  </Badge>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
