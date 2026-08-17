import { describe, test, expect, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import MockAdapter from "axios-mock-adapter"
import api from "@/lib/api"
import { AuthProvider } from "@/lib/auth"
import Settings from "./Settings"

const apiMock = new MockAdapter(api)

const VALID_RISK_CONFIG = {
  riskWeights: { newsScore: 0.4, expiryScore: 0.3, docScore: 0.2, countryScore: 0.1 },
  healthWeights: {
    esgScore: 0.25,
    logisticsScore: 0.2,
    docCompletenessScore: 0.15,
    contractHealthScore: 0.15,
    riskComponent: 0.25,
  },
  alertThresholds: { riskThreshold: 70, healthThreshold: 30, enabled: true },
  isDefault: true,
}

function renderAsAdmin() {
  localStorage.setItem("accessToken", "token")
  localStorage.setItem("user", JSON.stringify({ email: "admin@example.com", role: "admin", orgId: "org1" }))

  return render(
    <AuthProvider>
      <Settings />
    </AuthProvider>
  )
}

// fireEvent.change sets the input's value directly in one step, rather than
// userEvent.type's keystroke-by-keystroke simulation - more reliable for a
// controlled type="number" input re-rendering on every keystroke in jsdom.
function setWeight(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

beforeEach(() => {
  localStorage.clear()
  apiMock.reset()
  apiMock.onGet("/org/risk-config").reply(200, { data: VALID_RISK_CONFIG })
  apiMock.onGet("/org/audit-logs").reply(200, {
    data: { logs: [], total: 0, page: 1, limit: 20, totalPages: 1 },
  })
})

describe("Settings > risk config weight-sum validation", () => {
  test("weights that already sum to 100% enable Save, with no warning shown", async () => {
    renderAsAdmin()

    // Both the risk and health weight groups sum to 100% out of the box.
    await waitFor(() => expect(screen.getAllByText(/Total: 100%/)).toHaveLength(2))

    expect(screen.queryByText(/must equal 100%/)).not.toBeInTheDocument()
    expect(screen.getByText("Save changes")).toBeEnabled()
  })

  test("editing a weight away from 100% shows the warning and disables Save", async () => {
    renderAsAdmin()
    await waitFor(() => expect(screen.getAllByText(/Total: 100%/)).toHaveLength(2))

    setWeight("News sentiment", "90")

    // 40 -> 90 is +50 on a group that summed to 100, so the new total is 150%.
    await waitFor(() => expect(screen.getByText(/Total: 150%/)).toBeInTheDocument())
    expect(screen.getByText(/must equal 100%/)).toBeInTheDocument()
    expect(screen.getByText("Save changes")).toBeDisabled()
  })

  test("bringing the total back to exactly 100% re-enables Save", async () => {
    renderAsAdmin()
    await waitFor(() => expect(screen.getAllByText(/Total: 100%/)).toHaveLength(2))

    setWeight("News sentiment", "90")
    await waitFor(() => expect(screen.getByText("Save changes")).toBeDisabled())

    setWeight("News sentiment", "40")

    await waitFor(() => expect(screen.getAllByText(/Total: 100%/)).toHaveLength(2))
    expect(screen.queryByText(/must equal 100%/)).not.toBeInTheDocument()
    expect(screen.getByText("Save changes")).toBeEnabled()
  })

  test("the health-weights group is validated independently of the risk-weights group", async () => {
    renderAsAdmin()
    await waitFor(() => expect(screen.getAllByText(/Total: 100%/)).toHaveLength(2))

    setWeight("ESG", "50")

    // Risk group (unedited) still reads exactly "Total: 100%"; health group
    // now reads "Total: 125%" (25 -> 50 is +25 on a group that summed to
    // 100) plus the warning text, which also happens to contain the
    // substring "100%" ("...must equal 100%)") - match the total number
    // specifically, not just any "100%" substring, to avoid a false match
    // against that warning text.
    await waitFor(() => expect(screen.getByText("Save changes")).toBeDisabled())
    const totals = screen.getAllByText(/Total: \d+%/)
    expect(totals.some((el) => /Total: 100%/.test(el.textContent ?? ""))).toBe(true)
    expect(totals.some((el) => /Total: 125%/.test(el.textContent ?? ""))).toBe(true)
  })
})
