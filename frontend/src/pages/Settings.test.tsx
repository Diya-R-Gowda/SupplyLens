import { describe, test, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import MockAdapter from "axios-mock-adapter"
import api from "@/lib/api"
import { AuthProvider } from "@/lib/auth"
import Settings from "./Settings"

const apiMock = new MockAdapter(api)

const ORG_USERS = [
  { _id: "u1", email: "admin@example.com", role: "admin" },
  { _id: "u2", email: "viewer@example.com", role: "viewer" },
]

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
  apiMock.onGet("/org/users").reply(200, { data: ORG_USERS })
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

// The page also renders InviteUserSection's own role <Select>, which shares
// the "combobox" role - scope every query to the Team members panel so it
// doesn't collide with that unrelated picker.
function teamMembersSection() {
  return screen.getByRole("heading", { name: "Team members" }).closest(".rounded-xl") as HTMLElement
}

describe("Settings > team members role management", () => {
  test("lists org members, marks the caller's own row, and locks it from editing", async () => {
    renderAsAdmin()

    await waitFor(() => expect(screen.getByText("admin@example.com")).toBeInTheDocument())
    expect(screen.getByText("viewer@example.com")).toBeInTheDocument()

    const section = teamMembersSection()
    // Self row: shows "(you)" and a plain-text role, no editable control.
    expect(within(section).getByText("(you)")).toBeInTheDocument()
    expect(within(section).getAllByRole("combobox")).toHaveLength(1) // only the other member's role picker

    // Other member's row has an editable role picker showing their current role.
    expect(within(section).getByRole("combobox")).toHaveTextContent(/viewer/i)
  })

  test("promoting another member to admin calls the role endpoint and updates the row", async () => {
    apiMock.onPatch("/org/users/u2/role").reply(200, {
      data: { _id: "u2", email: "viewer@example.com", role: "admin" },
    })
    renderAsAdmin()
    await waitFor(() => expect(screen.getByText("viewer@example.com")).toBeInTheDocument())

    const user = userEvent.setup()
    const section = teamMembersSection()
    await user.click(within(section).getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: /admin/i }))

    await waitFor(() => expect(within(section).getByRole("combobox")).toHaveTextContent(/admin/i))
    expect(JSON.parse(apiMock.history.patch[0].data)).toEqual({ role: "admin" })
  })

  test("a rejected role change (e.g. last-admin) shows an inline row error", async () => {
    apiMock.onPatch("/org/users/u2/role").reply(400, {
      error: { message: "Cannot remove the last admin from the organisation", code: "LAST_ADMIN" },
    })
    renderAsAdmin()
    await waitFor(() => expect(screen.getByText("viewer@example.com")).toBeInTheDocument())

    const user = userEvent.setup()
    const section = teamMembersSection()
    await user.click(within(section).getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: /admin/i }))

    await waitFor(() =>
      expect(within(section).getByText("Cannot remove the last admin from the organisation")).toBeInTheDocument()
    )
  })

  test("removing another member asks for confirmation, calls the delete endpoint, and drops the row", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    apiMock.onDelete("/org/users/u2").reply(200, { data: { _id: "u2", email: "viewer@example.com" } })
    renderAsAdmin()
    await waitFor(() => expect(screen.getByText("viewer@example.com")).toBeInTheDocument())

    const user = userEvent.setup()
    const section = teamMembersSection()
    await user.click(within(section).getByRole("button", { name: /remove viewer@example.com/i }))

    expect(confirmSpy).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByText("viewer@example.com")).not.toBeInTheDocument())
    confirmSpy.mockRestore()
  })

  test("declining the confirmation dialog does not call the delete endpoint", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false)
    apiMock.onDelete("/org/users/u2").reply(200, { data: { _id: "u2", email: "viewer@example.com" } })
    renderAsAdmin()
    await waitFor(() => expect(screen.getByText("viewer@example.com")).toBeInTheDocument())

    const user = userEvent.setup()
    const section = teamMembersSection()
    await user.click(within(section).getByRole("button", { name: /remove viewer@example.com/i }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(apiMock.history.delete ?? []).toHaveLength(0)
    expect(screen.getByText("viewer@example.com")).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  test("a rejected deletion (e.g. last-admin) shows an inline row error and keeps the row", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    apiMock.onDelete("/org/users/u2").reply(400, {
      error: { message: "Cannot remove the last admin from the organisation", code: "LAST_ADMIN" },
    })
    renderAsAdmin()
    await waitFor(() => expect(screen.getByText("viewer@example.com")).toBeInTheDocument())

    const user = userEvent.setup()
    const section = teamMembersSection()
    await user.click(within(section).getByRole("button", { name: /remove viewer@example.com/i }))

    await waitFor(() =>
      expect(within(section).getByText("Cannot remove the last admin from the organisation")).toBeInTheDocument()
    )
    expect(screen.getByText("viewer@example.com")).toBeInTheDocument()
    confirmSpy.mockRestore()
  })
})
