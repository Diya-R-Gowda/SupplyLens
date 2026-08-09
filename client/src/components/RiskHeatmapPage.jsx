import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import api from '../api/axios';
import Card from './Card';
import Button from './Button';
import Badge from './Badge';

const riskColor = (score) => (score <= 33 ? '#16a34a' : score <= 66 ? '#ca8a04' : '#dc2626');

// Phase 9 Step 3 - Risk Heatmap. Built as a sorted horizontal bar chart
// (recharts, already used elsewhere in this app - SupplierGrowthChart.jsx)
// rather than a choropleth map overlay: a true choropleth needs a real
// country-boundary GeoJSON dataset (a new asset to vendor in, not just a
// styling choice) and would look mostly empty/misleading at the current
// real data reality (1-3 countries represented, confirmed live). A sorted
// bar view is honest at any data density - it reads correctly whether
// there's 1 country or 50, and needs no new dependency.
export default function RiskHeatmapPage({ onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/org/risk-heatmap')
      .then((res) => { if (active) setData(res.data.data); })
      .catch(() => { if (active) setError('Unable to load the risk heatmap.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const chartData = data?.countries.map((c) => ({
    ...c, label: `${c.countryName || c.country} (${c.country})`,
  })) || [];

  return (
    <div className="grid gap-4">
      <div>
        <Button onClick={onBack} className="rounded-full px-3.5 py-2 mb-2">&larr; Back</Button>
        <h1 className="m-0 text-[1.6rem] text-slate-900">Risk heatmap</h1>
        <p className="mt-1 mb-0 text-slate-600 text-[0.9rem]">
          Average risk score per country, at the same <strong>country-level</strong> granularity as
          the Geographic Map - this can only ever be as precise as the underlying location data.
        </p>
      </div>

      {loading ? <p className="m-0 text-slate-600">Loading heatmap...</p> : null}
      {error ? <p className="m-0 text-red-700">{error}</p> : null}

      {!loading && !error && data ? (
        chartData.length === 0 ? (
          <p className="m-0 text-slate-600">No locatable suppliers yet.</p>
        ) : (
          <Card className="rounded-[20px] p-5 bg-white/75">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <p className="m-0 font-semibold text-slate-800">Average risk score by country</p>
              <Badge className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[0.82rem]">
                {data.countriesRepresented} countr{data.countriesRepresented === 1 ? 'y' : 'ies'} represented
              </Badge>
            </div>
            <div style={{ height: Math.max(180, chartData.length * 50) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 12 }} stroke="#64748b" />
                  <Tooltip
                    formatter={(value, name) => [value, name === 'averageRiskScore' ? 'Avg risk' : name]}
                    labelFormatter={(label, payload) => `${label} - ${payload?.[0]?.payload?.supplierCount || 0} supplier(s)`}
                  />
                  <Bar dataKey="averageRiskScore" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.country} fill={riskColor(entry.averageRiskScore)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )
      ) : null}
    </div>
  );
}
