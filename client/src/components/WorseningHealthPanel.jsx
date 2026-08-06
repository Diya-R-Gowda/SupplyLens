import Card from './Card';
import Badge from './Badge';

// Proportionate portfolio-level rollup for Phase 5 (deliberately not a full
// analytics rebuild) - the 5 suppliers whose most recent health change in
// the last 7 days was a decline, worst first, from GET /dashboard/stats's
// worseningHealth field. Not available in demo mode (always empty there).
export default function WorseningHealthPanel({ worseningHealth, onOpen }) {
  if (!worseningHealth || worseningHealth.length === 0) {
    return (
      <Card className="rounded-[20px] p-5 bg-white/75">
        <h2 className="mt-0 mb-2 text-[1.1rem] text-slate-900">Trending down</h2>
        <p className="m-0 text-slate-600">No supplier health declines in the last 7 days.</p>
      </Card>
    );
  }

  return (
    <Card className="rounded-[20px] p-5 bg-white/75">
      <h2 className="mt-0 mb-3 text-[1.1rem] text-slate-900">Trending down</h2>
      <p className="mt-0 mb-3 text-slate-500 text-[0.82rem]">Suppliers whose health score declined in the last 7 days, worst first.</p>
      <div className="grid gap-2.5">
        {worseningHealth.map((entry) => (
          <div
            key={entry.supplierId}
            className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-3 rounded-[14px] bg-white/72 border border-slate-400/30 cursor-pointer"
            onClick={() => onOpen?.({ _id: entry.supplierId })}
            role="button"
            tabIndex={0}
          >
            <span className="font-bold text-slate-900">{entry.name}</span>
            <div className="flex items-center gap-2">
              <Badge className="px-2.5 py-1 bg-red-100 text-red-800 text-[0.8rem]">
                {entry.delta} to {entry.newScore}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
