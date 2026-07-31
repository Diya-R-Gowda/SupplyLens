import Card from './Card';
import Badge from './Badge';

const formatRelativeTime = (isoDate) => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

export default function RecentActivityFeed({ recentActivity, onOpen }) {
  if (recentActivity.length === 0) {
    return (
      <Card className="rounded-[20px] p-5 bg-white/75">
        <h2 className="mt-0 mb-2 text-[1.1rem] text-slate-900">Recent activity</h2>
        <p className="m-0 text-slate-600">No supplier activity yet.</p>
      </Card>
    );
  }

  return (
    <Card className="rounded-[20px] p-5 bg-white/75">
      <h2 className="mt-0 mb-3 text-[1.1rem] text-slate-900">Recent activity</h2>
      <div className="grid gap-2.5">
        {recentActivity.map((supplier) => (
          <div
            key={supplier._id}
            className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-3 rounded-[14px] bg-white/72 border border-slate-400/30 cursor-pointer"
            onClick={() => onOpen?.(supplier)}
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-bold text-slate-900">{supplier.name}</span>
              <Badge className="px-2.5 py-1 bg-blue-100 text-blue-700 text-[0.8rem]">
                Risk {supplier.riskScore ?? 0}
              </Badge>
            </div>
            <span className="text-slate-500 text-[0.85rem]">{formatRelativeTime(supplier.updatedAt)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
