import { describe, test, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { tierBadgeClasses } from "@/lib/colors"
import HealthBadge from "./HealthBadge"

// Boundaries mirror lib/colors.test.ts's healthTier coverage exactly - high
// score is good here (health), the inverse of RiskBadge.
describe("HealthBadge", () => {
  test.each([
    [100, "good"],
    [67, "good"],
    [66, "warn"],
    [34, "warn"],
    [33, "bad"],
    [0, "bad"],
  ] as const)("score %d renders tier %s with the matching badge classes", (score, tier) => {
    render(<HealthBadge score={score} />)

    const badge = screen.getByText(`Health ${score}`)
    expect(badge.className).toContain(tierBadgeClasses[tier])
  })

  test("rounds the displayed score without changing which tier the raw score maps to", () => {
    // 66.4 is still "warn" per healthTier (<67), but displays rounded to 66.
    render(<HealthBadge score={66.4} />)

    const badge = screen.getByText("Health 66")
    expect(badge.className).toContain(tierBadgeClasses.warn)
  })
})
