import Badge from './Badge';

// Color logic is intentionally inverted from RiskBadge - high risk is bad
// (red), but high health is good (green). Distinct label/icon-free styling
// keeps the two visually distinguishable at a glance, not just by number.
export const HealthBadge = ({ score }) => {
  const getColor = (s) => {
    if (s >= 67) return 'bg-green-100 text-green-800 border-green-200';
    if (s >= 34) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <Badge className={`px-3 py-1 border text-sm ${getColor(score)}`}>
      Health {score} / 100
    </Badge>
  );
};
