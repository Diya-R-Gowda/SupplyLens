// The /vitest entry (not the plain package root) extends Vitest's own
// `expect` directly - the root entry assumes a global `expect` (Jest-style),
// which isn't set up here since globals: true was deliberately not enabled.
import "@testing-library/jest-dom/vitest"

import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

// React Testing Library's auto-cleanup-after-each-test normally hooks into
// a global `afterEach` (Jest-style). Without globals: true that never
// registers, so DOM nodes from one test's render() would otherwise still be
// present for the next test in the same file - wired up explicitly instead.
afterEach(() => {
  cleanup()
})
