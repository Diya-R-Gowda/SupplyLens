import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Card from './Card';

const formatDayLabel = (isoDate) => {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function SupplierGrowthChart({ growthSeries }) {
  const chartData = growthSeries.map((entry) => ({ ...entry, label: formatDayLabel(entry.date) }));

  return (
    <Card className="rounded-[20px] p-5 bg-white/75">
      <h2 className="mt-0 mb-3 text-[1.1rem] text-slate-900">Suppliers added (last 30 days)</h2>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis dataKey="label" interval={4} tick={{ fontSize: 12 }} stroke="#64748b" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" />
            <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date} />
            <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
