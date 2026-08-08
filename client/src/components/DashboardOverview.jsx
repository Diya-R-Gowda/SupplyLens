import Card from './Card';
import StatCard from './StatCard';
import CategoryDistributionChart from './CategoryDistributionChart';
import SupplierGrowthChart from './SupplierGrowthChart';
import RecentActivityFeed from './RecentActivityFeed';
import WorseningHealthPanel from './WorseningHealthPanel';
import ActiveAlertsPanel from './ActiveAlertsPanel';

const SkeletonBlock = ({ className }) => (
  <div className={`rounded-2xl bg-white/60 border border-slate-400/25 animate-pulse ${className}`} />
);

export default function DashboardOverview({ stats, loading, error, onOpenSupplier }) {
  if (loading) {
    return (
      <div className="grid gap-3.5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBlock key={i} className="h-[104px]" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-3.5">
          <SkeletonBlock className="h-[320px] rounded-[20px]" />
          <SkeletonBlock className="h-[320px] rounded-[20px]" />
        </div>
        <SkeletonBlock className="h-[240px] rounded-[20px]" />
      </div>
    );
  }

  if (error) {
    return <p className="m-0 text-red-700">{error}</p>;
  }

  if (!stats) return null;

  if (stats.totalSuppliers === 0) {
    return (
      <Card className="rounded-[20px] p-6 bg-white/55 border-dashed">
        <h2 className="m-0 text-[1.2rem] text-slate-900">No suppliers yet</h2>
        <p className="mt-2 mb-0 text-slate-600 leading-[1.7]">
          Add your first supplier to see KPIs, category distribution, growth trends, and recent activity here.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-3.5">
      <ActiveAlertsPanel
        activeAlerts={stats.activeAlerts}
        projectedActiveAlerts={stats.projectedActiveAlerts}
        anomalyAlerts={stats.anomalyAlerts}
        onOpen={onOpenSupplier}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard label="Total suppliers" value={stats.totalSuppliers} />
        <StatCard label="Average risk score" value={`${stats.averageRiskScore} / 100`} />
        <StatCard label="Average health score" value={`${stats.averageHealthScore} / 100`} />
        <StatCard
          label="New this month"
          value={stats.newSuppliers.last30Days}
          hint={`${stats.newSuppliers.last7Days} in the last 7 days`}
        />
        <StatCard label="Categories tracked" value={stats.byCategory.length} />
      </div>

      <div className="grid lg:grid-cols-2 gap-3.5">
        <CategoryDistributionChart byCategory={stats.byCategory} />
        <SupplierGrowthChart growthSeries={stats.growthSeries} />
      </div>

      <div className="grid lg:grid-cols-2 gap-3.5">
        <RecentActivityFeed recentActivity={stats.recentActivity} onOpen={onOpenSupplier} />
        <WorseningHealthPanel worseningHealth={stats.worseningHealth} onOpen={onOpenSupplier} />
      </div>
    </div>
  );
}
