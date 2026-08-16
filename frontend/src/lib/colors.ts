export type ScoreTier = "good" | "warn" | "bad"

// Risk: low score is good. Health/confidence: high score is good.
export function riskTier(score: number): ScoreTier {
  if (score <= 33) return "good"
  if (score <= 66) return "warn"
  return "bad"
}

export function healthTier(score: number): ScoreTier {
  if (score >= 67) return "good"
  if (score >= 34) return "warn"
  return "bad"
}

export function confidenceTier(confidence: number): ScoreTier {
  if (confidence >= 0.7) return "good"
  if (confidence >= 0.4) return "warn"
  return "bad"
}

export const tierBadgeClasses: Record<ScoreTier, string> = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warn: "border-amber-200 bg-amber-50 text-amber-700",
  bad: "border-red-200 bg-red-50 text-red-700",
}

// For SVG/chart fills where a border-based pill doesn't apply.
export const tierHex: Record<ScoreTier, string> = {
  good: "#047857",
  warn: "#b45309",
  bad: "#b91c1c",
}
