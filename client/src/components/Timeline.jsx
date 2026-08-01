import Card from './Card';
import Badge from './Badge';
import { FileText, Newspaper, TrendingUp, PlusCircle, Pencil, Activity } from 'lucide-react';

const EVENT_META = {
  supplier_created: { label: 'Created', icon: PlusCircle, badgeClass: 'bg-blue-100 text-blue-700' },
  supplier_updated: { label: 'Updated', icon: Pencil, badgeClass: 'bg-slate-200 text-slate-700' },
  document_uploaded: { label: 'Document', icon: FileText, badgeClass: 'bg-indigo-100 text-indigo-700' },
  news_mentioned: { label: 'News', icon: Newspaper, badgeClass: 'bg-slate-200 text-slate-700' },
  risk_changed: { label: 'Risk change', icon: TrendingUp, badgeClass: 'bg-amber-100 text-amber-800' },
};

const describeEvent = (event) => {
  switch (event.type) {
    case 'supplier_created':
      return 'Supplier record created';
    case 'supplier_updated':
      return 'Supplier details updated';
    case 'document_uploaded':
      return `Document uploaded: ${event.fileName}`;
    case 'news_mentioned':
      return event.headline;
    case 'risk_changed':
      return `Risk score ${event.delta > 0 ? 'increased' : 'decreased'} from ${event.previousScore} to ${event.newScore} (${event.reason?.replace(/_/g, ' ')})`;
    default:
      return 'Event';
  }
};

export default function Timeline({ events }) {
  if (!events || events.length === 0) {
    return <p className="m-0 text-slate-600">No timeline events yet.</p>;
  }

  return (
    <div className="grid gap-2.5">
      {events.map((event, i) => {
        const meta = EVENT_META[event.type] || { label: event.type, icon: Activity, badgeClass: 'bg-slate-200 text-slate-700' };
        const Icon = meta.icon;
        return (
          <Card key={`${event.type}-${event.timestamp}-${i}`} className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/80">
            <Icon size={18} className="mt-0.5 text-slate-500 shrink-0" />
            <div className="grid gap-1 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`px-2 py-0.5 text-[0.72rem] uppercase tracking-[0.06em] ${meta.badgeClass}`}>{meta.label}</Badge>
                <time className="text-[0.8rem] text-slate-500">{new Date(event.timestamp).toLocaleString()}</time>
              </div>
              <p className="m-0 text-slate-900 text-[0.92rem] leading-[1.5]">{describeEvent(event)}</p>
              {event.type === 'news_mentioned' && event.sentiment ? (
                <span className="text-[0.78rem] text-slate-500 capitalize">{event.sentiment} sentiment</span>
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
