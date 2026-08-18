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

// Radix's <Select> (used by shadcn/ui's Select, e.g. Settings.tsx's role
// pickers) calls scrollIntoView and the Pointer Capture APIs, none of which
// jsdom implements - no-op polyfills so opening/interacting with a <Select>
// in a test doesn't throw.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {}
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
