import Card from './Card';
import Badge from './Badge';

// Portfolio-wide view of GET /dashboard/stats's activeAlerts (Phase 5 Step
// 5) - up to 10 suppliers currently breaching the org's configured risk/
// health thresholds. Not available in demo mode or when alerting is
// disabled (both render the same empty state as "nothing needs attention").
export default function ActiveAlertsPanel({ activeAlerts, onOpen }) {
  if (!activeAlerts || activeAlerts.length === 0) {
    return (
      <Card className="rounded-[20px] p-5 bg-white/75">
        <h2 className="mt-0 mb-2 text-[1.1rem] text-slate-900">Active alerts</h2>
        <p className="m-0 text-slate-600">No suppliers currently breach your configured thresholds.</p>
      </Card>
    );
  }

  return (
    <Card className="rounded-[20px] p-5 bg-red-50 border-red-300/60">
      <h2 className="mt-0 mb-3 text-[1.1rem] text-slate-900">Active alerts</h2>
      <div className="grid gap-2.5">
        {activeAlerts.map((entry) => (
          <div
            key={entry.supplierId}
            className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-3 rounded-[14px] bg-white/80 border border-red-300/40 cursor-pointer"
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
    </Card>
  );
}
