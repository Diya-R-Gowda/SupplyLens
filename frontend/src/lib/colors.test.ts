import { describe, test, expect } from "vitest"
import { riskTier, healthTier, confidenceTier } from "./colors"

describe("riskTier", () => {
  test.each([
    [0, "good"],
    [33, "good"],
    [34, "warn"],
    [66, "warn"],
    [67, "bad"],
    [100, "bad"],
  ] as const)("riskTier(%d) === %s", (score, expected) => {
    expect(riskTier(score)).toBe(expected)
  })
})

describe("healthTier", () => {
  test.each([
    [100, "good"],
    [67, "good"],
    [66, "warn"],
    [34, "warn"],
    [33, "bad"],
    [0, "bad"],
  ] as const)("healthTier(%d) === %s", (score, expected) => {
    expect(healthTier(score)).toBe(expected)
  })
})

describe("confidenceTier", () => {
  test.each([
    [1, "good"],
    [0.7, "good"],
    [0.69, "warn"],
    [0.4, "warn"],
    [0.39, "bad"],
    [0, "bad"],
  ] as const)("confidenceTier(%f) === %s", (confidence, expected) => {
    expect(confidenceTier(confidence)).toBe(expected)
  })
})
