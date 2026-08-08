import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import Card from './Card';

const formatLabel = (isoDate) => new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// Risk (amber) and health (emerald) colors match the Badge conventions
// already used for risk_changed/health_changed events in Timeline.jsx.
const RISK_COLOR = '#d97706';
const HEALTH_COLOR = '#059669';

const DAY_MS = 24 * 60 * 60 * 1000;

// Phase 6 Step 5 - reconstructs the EXACT regression line GET
// /suppliers/:id/forecast already fit (same slope/intercept/anchorTimestamp
// the forecast panel's own trend uses), evaluated at each already-displayed
// point's timestamp - not a separately-computed line, so this overlay can
// never say something different than the forecast panel does. Only called
// when that forecast's status is 'ok', so an insufficient-data supplier
// (the common case today) gets no overlay at all rather than a misleading
// line through too little/too-clustered data - same honesty gate as
// forecasting itself, just reused here rather than re-implemented.
const buildTrendLine = (points, trend) => {
  if (!trend) return [];
  const anchorMs = new Date(trend.anchorTimestamp).getTime();
  return points.map((p) => ({
    label: p.label,
    trendScore: Math.max(0, Math.min(100, trend.intercept + trend.slope * ((new Date(p.timestamp).getTime() - anchorMs) / DAY_MS))),
  }));
};

// riskItems/healthItems come from GET /suppliers/:id/risk-health-history,
// most-recent-first (the API's standard pagination order) - reversed here
// for left-to-right chronological plotting. Each series is rendered as its
// own <Line> with its own `data` (recharts supports this directly) rather
// than merging risk/health into one array, since their change timestamps
// don't line up - a shared XAxis with allowDuplicatedCategory=false still
// produces one coherent time axis across both. `forecast` (optional, same
// shape GET /suppliers/:id/forecast returns) adds the Step 5 trend-line
// overlay - reusing points' own labels only (never new ones), so it can
// never reorder the shared category axis the way a future-projecting
// series would (see ForecastChart.jsx's commit history for that bug).
export default function RiskHealthTrendChart({ riskItems, healthItems, forecast }) {
  const riskPoints = [...riskItems].reverse().map((item) => ({
    timestamp: item.timestamp,
    label: formatLabel(item.timestamp),
    score: item.newScore,
  }));
  const healthPoints = [...healthItems].reverse().map((item) => ({
    timestamp: item.timestamp,
    label: formatLabel(item.timestamp),
    score: item.newScore,
  }));

  const riskTrendLine = forecast?.risk?.status === 'ok' ? buildTrendLine(riskPoints, forecast.risk.trend) : [];
  const healthTrendLine = forecast?.health?.status === 'ok' ? buildTrendLine(healthPoints, forecast.health.trend) : [];

  const hasData = riskPoints.length > 0 || healthPoints.length > 0;

  return (
    <Card className="rounded-[20px] p-5 bg-white/75">
      <h2 className="mt-0 mb-3 text-[1.1rem] text-slate-900">Risk &amp; health score trend</h2>
      {hasData ? (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis dataKey="label" type="category" allowDuplicatedCategory={false} tick={{ fontSize: 12 }} stroke="#64748b" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#64748b" />
              <Tooltip />
              <Legend />
              <Line data={riskPoints} dataKey="score" name="Risk score" stroke={RISK_COLOR} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line data={healthPoints} dataKey="score" name="Health score" stroke={HEALTH_COLOR} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              {riskTrendLine.length > 0 ? (
                <Line data={riskTrendLine} dataKey="trendScore" name="Risk trend (fitted)" stroke={RISK_COLOR} strokeWidth={1.5} strokeDasharray="2 4" dot={false} isAnimationActive={false} />
              ) : null}
              {healthTrendLine.length > 0 ? (
                <Line data={healthTrendLine} dataKey="trendScore" name="Health trend (fitted)" stroke={HEALTH_COLOR} strokeWidth={1.5} strokeDasharray="2 4" dot={false} isAnimationActive={false} />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="m-0 text-slate-600">No score history yet.</p>
      )}
    </Card>
  );
}
