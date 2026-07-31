import StatCard from './StatCard';

export default function DashboardOverview({ stats, loading, error }) {
  if (loading) {
    return <p className="m-0 text-slate-600">Loading dashboard statistics...</p>;
  }

  if (error) {
    return <p className="m-0 text-red-700">{error}</p>;
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      <StatCard label="Total suppliers" value={stats.totalSuppliers} />
      <StatCard label="Average risk score" value={`${stats.averageRiskScore} / 100`} />
      <StatCard
        label="New this month"
        value={stats.newSuppliers.last30Days}
        hint={`${stats.newSuppliers.last7Days} in the last 7 days`}
      />
      <StatCard label="Categories tracked" value={stats.byCategory.length} />
    </div>
  );
}
