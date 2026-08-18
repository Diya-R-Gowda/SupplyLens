import { describe, test, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { tierBadgeClasses } from "@/lib/colors"
import ConfidenceBadge from "./ConfidenceBadge"

// Boundaries mirror lib/colors.test.ts's confidenceTier coverage exactly.
describe("ConfidenceBadge", () => {
  test.each([
    [1, "good", "Confidence 100%"],
    [0.7, "good", "Confidence 70%"],
    [0.69, "warn", "Confidence 69%"],
    [0.4, "warn", "Confidence 40%"],
    [0.39, "bad", "Confidence 39%"],
    [0, "bad", "Confidence 0%"],
  ] as const)("confidence %f renders tier %s as %s", (confidence, tier, label) => {
    render(<ConfidenceBadge confidence={confidence} />)

    const badge = screen.getByText(label)
    expect(badge.className).toContain(tierBadgeClasses[tier])
  })

  test.each([null, undefined])("renders nothing when confidence is %s", (confidence) => {
    const { container } = render(<ConfidenceBadge confidence={confidence} />)
    expect(container).toBeEmptyDOMElement()
  })
})
