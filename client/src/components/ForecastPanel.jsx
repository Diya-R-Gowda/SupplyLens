import Card from './Card';
import ForecastChart from './ForecastChart';

// Risk (amber) / health (emerald) match RiskHealthTrendChart.jsx and
// Timeline.jsx's existing color convention for these two metrics.
const RISK_COLOR = '#d97706';
const HEALTH_COLOR = '#059669';

// Thin wrapper reused for both the portfolio-level (Dashboard) and
// per-supplier (SupplierDetail) forecast views - same shape in from
// GET /org/forecast and GET /suppliers/:id/forecast, so one component
// serves both per the build instructions.
export default function ForecastPanel({ title, subtitle, forecast }) {
  if (!forecast) return null;

  return (
    <Card className="rounded-[20px] p-5 bg-white/75">
      <h2 className="mt-0 mb-1 text-[1.1rem] text-slate-900">{title}</h2>
      {subtitle ? <p className="mt-0 mb-3 text-slate-500 text-[0.85rem]">{subtitle}</p> : null}
      <div className="grid md:grid-cols-2 gap-3">
        <ForecastChart label="Risk" color={RISK_COLOR} forecast={forecast.risk} />
        <ForecastChart label="Health" color={HEALTH_COLOR} forecast={forecast.health} />
      </div>
    </Card>
  );
}
