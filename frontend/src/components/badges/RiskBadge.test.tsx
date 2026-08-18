import { describe, test, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { tierBadgeClasses } from "@/lib/colors"
import RiskBadge from "./RiskBadge"

// Boundaries mirror lib/colors.test.ts's riskTier coverage exactly - low
// score is good here (risk), unlike Health/Confidence below.
describe("RiskBadge", () => {
  test.each([
    [0, "good"],
    [33, "good"],
    [34, "warn"],
    [66, "warn"],
    [67, "bad"],
    [100, "bad"],
  ] as const)("score %d renders tier %s with the matching badge classes", (score, tier) => {
    render(<RiskBadge score={score} />)

    const badge = screen.getByText(`Risk ${score}`)
    expect(badge.className).toContain(tierBadgeClasses[tier])
  })

  test("rounds the displayed score without changing which tier the raw score maps to", () => {
    // 33.6 is still "warn" per riskTier (>33), but displays rounded to 34.
    render(<RiskBadge score={33.6} />)

    const badge = screen.getByText("Risk 34")
    expect(badge.className).toContain(tierBadgeClasses.warn)
  })
})
