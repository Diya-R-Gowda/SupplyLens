import { describe, test, expect, beforeEach, afterEach, vi } from "vitest"
import { formatCategory, formatRelativeTime, formatDate } from "./format"

describe("formatCategory", () => {
  test("returns 'Uncategorized' when no category is given", () => {
    expect(formatCategory(undefined)).toBe("Uncategorized")
  })

  test("title-cases and replaces the underscore in a snake_case category", () => {
    expect(formatCategory("raw_material")).toBe("Raw Material")
  })

  test("title-cases a single-word category", () => {
    expect(formatCategory("logistics")).toBe("Logistics")
  })
})

describe("formatRelativeTime", () => {
  const NOW = new Date("2026-01-01T12:00:00.000Z")

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test("well under a minute reads 'just now'", () => {
    // formatRelativeTime rounds to the nearest minute, so the true "just
    // now" boundary is under 30s (anything from 30s up rounds to 1 min).
    const iso = new Date(NOW.getTime() - 10_000).toISOString()
    expect(formatRelativeTime(iso)).toBe("just now")
  })

  test("under an hour reads in minutes", () => {
    const iso = new Date(NOW.getTime() - 5 * 60_000).toISOString()
    expect(formatRelativeTime(iso)).toBe("5 min ago")
  })

  test("59 minutes still reads in minutes, not hours", () => {
    const iso = new Date(NOW.getTime() - 59 * 60_000).toISOString()
    expect(formatRelativeTime(iso)).toBe("59 min ago")
  })

  test("under a day reads in hours", () => {
    const iso = new Date(NOW.getTime() - 5 * 3_600_000).toISOString()
    expect(formatRelativeTime(iso)).toBe("5h ago")
  })

  test("23 hours still reads in hours, not days", () => {
    const iso = new Date(NOW.getTime() - 23 * 3_600_000).toISOString()
    expect(formatRelativeTime(iso)).toBe("23h ago")
  })

  test("a day or more reads in days", () => {
    const iso = new Date(NOW.getTime() - 3 * 86_400_000).toISOString()
    expect(formatRelativeTime(iso)).toBe("3d ago")
  })
})

describe("formatDate", () => {
  test("falls back to an em dash for null", () => {
    expect(formatDate(null)).toBe("—")
  })

  test("falls back to an em dash for undefined", () => {
    expect(formatDate(undefined)).toBe("—")
  })

  test("formats a real ISO date", () => {
    expect(formatDate("2026-03-15T00:00:00.000Z")).toContain("2026")
  })
})
