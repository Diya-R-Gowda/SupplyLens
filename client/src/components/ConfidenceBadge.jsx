import Badge from './Badge';

const getColorClass = (confidence) => {
  if (confidence >= 0.7) return 'bg-green-100 text-green-800';
  if (confidence >= 0.4) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

// Gemini's own self-reported confidence (Phase 5) for an AI-generated
// sub-document - always shown alongside the existing "AI-generated - verify
// independently" badge, never in place of it. Renders nothing for
// null/undefined (pre-Phase-5 data, or a supplier that's never been
// refreshed since this field was added).
export default function ConfidenceBadge({ confidence }) {
  if (typeof confidence !== 'number') return null;

  return (
    <Badge className={`px-2.5 py-1 text-[0.78rem] ${getColorClass(confidence)}`}>
      Confidence {Math.round(confidence * 100)}%
    </Badge>
  );
}
