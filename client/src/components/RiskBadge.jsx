export const RiskBadge = ({ score }) => {
  const getColor = (s) => {
    if (s <= 33) return 'bg-green-100 text-green-800 border-green-200';
    if (s <= 66) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <span className={`px-3 py-1 rounded-full border text-sm font-bold ${getColor(score)}`}>
      {score} / 100
    </span>
  );
};