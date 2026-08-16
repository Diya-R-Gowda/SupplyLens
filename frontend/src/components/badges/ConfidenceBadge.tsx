import { confidenceTier, tierBadgeClasses } from "@/lib/colors"

function ConfidenceBadge({ confidence }: { confidence: number | null | undefined }) {
  if (typeof confidence !== "number") return null

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tierBadgeClasses[confidenceTier(confidence)]}`}
    >
      Confidence {Math.round(confidence * 100)}%
    </span>
  )
}

export default ConfidenceBadge
