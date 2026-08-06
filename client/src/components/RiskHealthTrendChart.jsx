import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import Card from './Card';

const formatLabel = (isoDate) => new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// Risk (amber) and health (emerald) colors match the Badge conventions
// already used for risk_changed/health_changed events in Timeline.jsx.
const RISK_COLOR = '#d97706';
const HEALTH_COLOR = '#059669';

// riskItems/healthItems come from GET /suppliers/:id/risk-health-history,
// most-recent-first (the API's standard pagination order) - reversed here
// for left-to-right chronological plotting. Each series is rendered as its
// own <Line> with its own `data` (recharts supports this directly) rather
// than merging risk/health into one array, since their change timestamps
// don't line up - a shared XAxis with allowDuplicatedCategory=false still
// produces one coherent time axis across both.
export default function RiskHealthTrendChart({ riskItems, healthItems }) {
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
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="m-0 text-slate-600">No score history yet.</p>
      )}
    </Card>
  );
}
