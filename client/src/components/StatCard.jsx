import Card from './Card';

export default function StatCard({ label, value, hint }) {
  return (
    <Card className="grid gap-1.5 rounded-2xl px-5 py-4.5 bg-white/85">
      <p className="m-0 uppercase tracking-[0.14em] text-xs font-bold text-[#3853b5]">{label}</p>
      <p className="m-0 text-[1.9rem] font-bold text-slate-900 leading-tight">{value}</p>
      {hint ? <p className="m-0 text-slate-600 text-[0.85rem]">{hint}</p> : null}
    </Card>
  );
}
