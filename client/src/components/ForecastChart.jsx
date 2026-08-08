import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const formatLabel = (timestamp) => new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const DAY_MS = 24 * 60 * 60 * 1000;

const REASON_MESSAGES = {
  no_history: 'No score history recorded for this yet.',
  too_few_points: 'A handful of data points exist, but not enough to fit a trend.',
  insufficient_time_spread: 'The data points collected so far landed too close together in time (e.g. from a single test/refresh session) to show a real trend - a burst of same-moment updates is not the same as real, calendar-spread observations.',
};

// Single-metric (risk OR health) forecast chart, used by ForecastPanel for
// both the portfolio (Dashboard) and per-supplier (SupplierDetail) views -
// same component, different data, per the build instructions ("reuse
// existing chart patterns, don't build a new charting approach per view").
//
// The insufficient_data branch is not a fallback bolted on afterward - it's
// the primary, expected-to-be-common path right now (see the Phase 6 audit
// in CONTRIBUTING.md: real history is thin almost everywhere today), so it
// gets a real, legible message with the actual numbers, not a blank chart
// or a spinner.
export default function ForecastChart({ label, color, forecast }) {
  if (!forecast) return null;

  if (forecast.status === 'insufficient_data') {
    const {
      pointCount, minPointsRequired, spanHours, minSpanHoursRequired, reason,
    } = forecast.dataQuality;
    return (
      <div className="grid gap-1.5 p-4 rounded-2xl bg-slate-100/70 border border-slate-300/50">
        <p className="m-0 font-semibold text-slate-800">{label} forecast</p>
        <p className="m-0 text-slate-700 text-[0.9rem]">
          Not enough history yet to forecast this {label.toLowerCase()} score - {pointCount} data point{pointCount === 1 ? '' : 's'} collected
          {pointCount > 0 ? ` over ${spanHours < 1 ? '<1' : Math.round(spanHours)} hour${Math.round(spanHours) === 1 ? '' : 's'}` : ''},
          {' '}{minPointsRequired} points across at least {minSpanHoursRequired} hours needed.
        </p>
        <p className="m-0 text-slate-500 text-[0.8rem]">{REASON_MESSAGES[reason] || ''}</p>
      </div>
    );
  }

  const historical = [...(forecast.historical || [])].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const lastHistorical = historical[historical.length - 1];
  const anchorMs = new Date(lastHistorical.timestamp).getTime();

  const historicalSeries = historical.map((p) => ({ label: formatLabel(p.timestamp), score: p.score }));

  // Anchored at the last real observed point (zero-width band there) so the
  // dashed projected line and shaded interval visually pick up exactly
  // where the solid observed line ends, not floating disconnected from it.
  const projectedSeries = [
    {
      label: formatLabel(lastHistorical.timestamp), score: lastHistorical.score, low: lastHistorical.score, bandHeight: 0,
    },
    ...[...forecast.projections].sort((a, b) => a.horizonDays - b.horizonDays).map((p) => ({
      label: formatLabel(anchorMs + p.horizonDays * DAY_MS),
      score: p.projectedScore,
      low: p.confidenceInterval.low,
      bandHeight: p.confidenceInterval.high - p.confidenceInterval.low,
    })),
  ];

  return (
    <div className="grid gap-2 p-4 rounded-2xl bg-white/72 border border-slate-300/50">
      <div className="flex items-center justify-between flex-wrap gap-1.5">
        <p className="m-0 font-semibold text-slate-800">{label} forecast</p>
        <span className="text-[0.78rem] text-slate-500">
          {forecast.dataQuality.pointCount} points over {forecast.dataQuality.spanDays}d &middot; confidence: {forecast.dataQuality.confidenceLevel} &middot; trend {forecast.trend.direction}
        </span>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis dataKey="label" type="category" allowDuplicatedCategory={false} tick={{ fontSize: 11 }} stroke="#64748b" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#64748b" />
            <Tooltip />
            {/* Historical MUST be declared first: with allowDuplicatedCategory
                =false, recharts builds the shared category axis in JSX
                declaration order across every series, not by sorting the
                label values themselves - declaring the future/projected
                series first put "+7d"/"+30d" labels on the axis before the
                real historical dates, scrambling the timeline (caught via
                a live screenshot, not just a passing text-content check). */}
            <Line data={historicalSeries} dataKey="score" name={`${label} (observed)`} stroke={color} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            {/* Stacked-area trick for a "band between low and high": the
                first Area (dataKey="low") is transparent filler up to the
                band's floor, the second (dataKey="bandHeight") is the
                actually-visible shaded interval on top of it. Wider
                bandHeight = a visually wider, more obviously uncertain
                band - deliberate, not decorative (Step 2's requirement). */}
            <Area data={projectedSeries} dataKey="low" stackId="band" stroke="none" fill="transparent" isAnimationActive={false} />
            <Area data={projectedSeries} dataKey="bandHeight" stackId="band" stroke="none" fill={color} fillOpacity={0.18} isAnimationActive={false} name="Confidence interval" />
            <Line data={projectedSeries} dataKey="score" name={`${label} (projected)`} stroke={color} strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
