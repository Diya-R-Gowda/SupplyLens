import { riskTier, tierBadgeClasses } from "@/lib/colors"

function RiskBadge({ score }: { score: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tierBadgeClasses[riskTier(score)]}`}
    >
      Risk {Math.round(score)}
    </span>
  )
}

export default RiskBadge
