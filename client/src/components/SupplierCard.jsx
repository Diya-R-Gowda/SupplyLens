import Card from './Card';
import Badge from './Badge';

export default function SupplierCard({ supplier, onOpen }) {
  return (
    <Card
      as="article"
      className="grid gap-2.5 px-5 py-4.5 rounded-2xl bg-white/85 cursor-pointer"
      onClick={() => onOpen?.(supplier)}
      role="button"
      tabIndex={0}
    >
      <div>
        <p className="m-0 text-[1.08rem] font-bold text-slate-900">{supplier.name}</p>
        <p className="mt-1 mb-0 text-slate-600 text-[0.95rem]">{supplier.category || 'other'} · {supplier.country}</p>
      </div>

      <div className="flex flex-wrap gap-2.5 items-center">
        <Badge className="px-2.5 py-1.5 bg-blue-100 text-blue-700 text-[0.85rem]">
          Risk {supplier.riskScore ?? 0}
        </Badge>
        {supplier.contractExpiry ? (
          <span className="text-slate-600 text-[0.9rem]">Expiry {new Date(supplier.contractExpiry).toLocaleDateString()}</span>
        ) : null}
      </div>
    </Card>
  );
}
