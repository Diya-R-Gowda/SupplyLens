import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from './Card';

const CATEGORY_COLORS = {
  raw_material: '#2563eb',
  logistics: '#0d9488',
  saas: '#7c3aed',
  other: '#64748b',
  uncategorized: '#94a3b8',
};

const CATEGORY_LABELS = {
  raw_material: 'Raw material',
  logistics: 'Logistics',
  saas: 'SaaS',
  other: 'Other',
  uncategorized: 'Uncategorized',
};

export default function CategoryDistributionChart({ byCategory }) {
  const chartData = byCategory.map((entry) => ({
    name: CATEGORY_LABELS[entry.category] || entry.category,
    value: entry.count,
    color: CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.uncategorized,
  }));

  return (
    <Card className="rounded-[20px] p-5 bg-white/75">
      <h2 className="mt-0 mb-3 text-[1.1rem] text-slate-900">Suppliers by category</h2>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
