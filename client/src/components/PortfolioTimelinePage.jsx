import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';
import { EVENT_META, describeEvent } from './Timeline';

const DAYS_OPTIONS = [
  { value: '', label: 'All time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

// Phase 9 Step 1 - Portfolio-Wide Timeline. A dedicated page, not a Dashboard
// panel: it needs its own supplier/date filter controls and can render a lot
// of events across an org's whole supplier set, which would crowd the
// Dashboard's existing KPI/forecast/list layout. Reuses Timeline.jsx's
// EVENT_META/describeEvent exactly - the only new rendering concern here is
// a per-event supplier-name tag, since a single merged feed spans suppliers.
export default function PortfolioTimelinePage({ onBack }) {
  const [days, setDays] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get('/org/timeline', { params: { days: days || undefined, supplierId: supplierFilter || undefined } })
      .then((res) => { if (active) setData(res.data.data); })
      .catch(() => { if (active) setError('Unable to load the portfolio timeline.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [days, supplierFilter]);

  // Supplier filter options are derived from the events themselves rather
  // than a second API call - the merged feed already carries every
  // supplierId/supplierName it needs, and re-deriving this list each time
  // `data` changes keeps it in sync with whatever's actually in view.
  const supplierOptions = useMemo(() => {
    if (!data) return [];
    const seen = new Map();
    for (const event of data.events) {
      if (!seen.has(event.supplierId)) seen.set(event.supplierId, event.supplierName);
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  return (
    <div className="grid gap-4">
      <div>
        <Button onClick={onBack} className="rounded-full px-3.5 py-2 mb-2">&larr; Back</Button>
        <h1 className="m-0 text-[1.6rem] text-slate-900">Portfolio timeline</h1>
        <p className="mt-1 mb-0 text-slate-600 text-[0.9rem]">
          Every real event across your organisation's suppliers - document uploads, news, and risk/
          health changes - merged into one chronological feed. Not a per-supplier summary; see a
          supplier's own page for that.
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <select
          value={days}
          onChange={(event) => setDays(event.target.value)}
          className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-[0.9rem] bg-white/92"
        >
          {DAYS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <select
          value={supplierFilter}
          onChange={(event) => setSupplierFilter(event.target.value)}
          className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-[0.9rem] bg-white/92"
        >
          <option value="">All suppliers</option>
          {supplierOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>

      {loading ? <p className="m-0 text-slate-600">Loading timeline...</p> : null}
      {error ? <p className="m-0 text-red-700">{error}</p> : null}

      {!loading && !error && data ? (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <Badge className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[0.82rem]">
              {data.totalEvents} event(s) across {data.suppliersIncluded} supplier(s)
            </Badge>
            {data.truncated ? (
              <Badge className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[0.78rem]">
                Showing the {data.events.length} most recent - narrow the date range or supplier to see more
              </Badge>
            ) : null}
          </div>

          {data.events.length === 0 ? (
            <p className="m-0 text-slate-600">No events in this range yet.</p>
          ) : (
            <div className="grid gap-2.5">
              {data.events.map((event, i) => {
                const meta = EVENT_META[event.type] || { label: event.type, icon: null, badgeClass: 'bg-slate-200 text-slate-700' };
                const Icon = meta.icon;
                return (
                  <Card key={`${event.supplierId}-${event.type}-${event.timestamp}-${i}`} className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/80">
                    {Icon ? <Icon size={18} className="mt-0.5 text-slate-500 shrink-0" /> : null}
                    <div className="grid gap-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`px-2 py-0.5 text-[0.72rem] uppercase tracking-[0.06em] ${meta.badgeClass}`}>{meta.label}</Badge>
                        <Badge className="px-2 py-0.5 text-[0.72rem] bg-indigo-100 text-indigo-700">{event.supplierName}</Badge>
                        <time className="text-[0.8rem] text-slate-500">{new Date(event.timestamp).toLocaleString()}</time>
                      </div>
                      <p className="m-0 text-slate-900 text-[0.92rem] leading-[1.5]">{describeEvent(event)}</p>
                      {event.type === 'news_mentioned' && event.sentiment ? (
                        <span className="text-[0.78rem] text-slate-500 capitalize">{event.sentiment} sentiment</span>
                      ) : null}
                      {(event.type === 'risk_changed' || event.type === 'health_changed') && event.narrative ? (
                        <details className="text-[0.78rem] text-slate-600 mt-0.5">
                          <summary className="cursor-pointer font-semibold text-slate-500">Why did this change?</summary>
                          <p className="m-0 mt-1">{event.narrative}</p>
                        </details>
                      ) : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
