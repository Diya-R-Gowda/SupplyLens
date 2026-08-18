import { describe, test, expect, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { MemoryRouter, Routes, Route, useParams } from "react-router-dom"
import MockAdapter from "axios-mock-adapter"
import api from "@/lib/api"
import SupplierForm from "./SupplierForm"

const apiMock = new MockAdapter(api)

beforeEach(() => {
  apiMock.reset()
})

// Stands in for the real SupplierDetail route so a successful submit's
// navigate(`/dashboard/suppliers/${id}`) can be observed via real routing,
// same approach as ProtectedRoute.test.tsx's redirect-target routes.
function DetailStub() {
  const { id } = useParams()
  return <div>Supplier detail page: {id}</div>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dashboard/suppliers/new" element={<SupplierForm />} />
        <Route path="/dashboard/suppliers/:id/edit" element={<SupplierForm />} />
        <Route path="/dashboard/suppliers/:id" element={<DetailStub />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("SupplierForm > create mode", () => {
  test("renders empty required fields and a Create supplier button", () => {
    renderAt("/dashboard/suppliers/new")

    expect(screen.getByRole("heading", { name: "Add supplier" })).toBeInTheDocument()
    expect(screen.getByLabelText("Name")).toHaveValue("")
    expect(screen.getByLabelText("Name")).toBeRequired()
    expect(screen.getByLabelText(/Country/)).toBeRequired()
    expect(screen.getByRole("button", { name: "Create supplier" })).toBeInTheDocument()
  })

  test("a required field left blank blocks submission (native constraint validation), so no request is sent", () => {
    renderAt("/dashboard/suppliers/new")

    // Name and country are both left empty.
    fireEvent.click(screen.getByRole("button", { name: "Create supplier" }))

    expect(apiMock.history.post).toHaveLength(0)
  })

  test("submitting trims the name, uppercases the country, and navigates to the created supplier", async () => {
    renderAt("/dashboard/suppliers/new")

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "  Acme Corp  " } })
    fireEvent.change(screen.getByLabelText(/Country/), { target: { value: "us" } })

    apiMock.onPost("/suppliers").reply((config) => {
      expect(JSON.parse(config.data as string)).toEqual({ name: "Acme Corp", country: "US" })
      return [200, { data: { _id: "new1" } }]
    })

    fireEvent.click(screen.getByRole("button", { name: "Create supplier" }))

    await waitFor(() => expect(screen.getByText("Supplier detail page: new1")).toBeInTheDocument())
  })

  test("a failed submit renders both the form-level error and per-field errors", async () => {
    renderAt("/dashboard/suppliers/new")

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Acme" } })
    fireEvent.change(screen.getByLabelText(/Country/), { target: { value: "US" } })

    apiMock.onPost("/suppliers").reply(400, {
      error: { message: "Fix the errors below", details: { name: "Name already exists" } },
    })

    fireEvent.click(screen.getByRole("button", { name: "Create supplier" }))

    await waitFor(() => expect(screen.getByText("Fix the errors below")).toBeInTheDocument())
    expect(screen.getByText("Name already exists")).toBeInTheDocument()
    // Submit re-enables after the failed request.
    expect(screen.getByRole("button", { name: "Create supplier" })).toBeEnabled()
  })
})

describe("SupplierForm > edit mode", () => {
  test("loads and pre-fills the existing supplier's fields", async () => {
    apiMock.onGet("/suppliers/abc1").reply(200, {
      data: {
        _id: "abc1",
        name: "Acme",
        country: "US",
        category: "logistics",
        riskScore: 42,
        paymentTerms: "Net 30",
        contractExpiry: "2027-01-15T00:00:00.000Z",
        orgId: "org1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    })

    renderAt("/dashboard/suppliers/abc1/edit")

    await waitFor(() => expect(screen.getByDisplayValue("Acme")).toBeInTheDocument())
    expect(screen.getByDisplayValue("US")).toBeInTheDocument()
    expect(screen.getByDisplayValue("42")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Net 30")).toBeInTheDocument()
    expect(screen.getByDisplayValue("2027-01-15")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Edit supplier" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()
  })

  test("a failed load renders an ErrorState instead of the form", async () => {
    apiMock.onGet("/suppliers/bad1").reply(404, { error: { message: "Supplier not found" } })

    renderAt("/dashboard/suppliers/bad1/edit")

    await waitFor(() => expect(screen.getByText("Supplier not found")).toBeInTheDocument())
    expect(screen.queryByRole("heading", { name: "Edit supplier" })).not.toBeInTheDocument()
  })

  test("submitting saves via PATCH and navigates back to the same supplier", async () => {
    apiMock.onGet("/suppliers/abc1").reply(200, {
      data: {
        _id: "abc1",
        name: "Acme",
        country: "US",
        orgId: "org1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    })
    apiMock.onPatch("/suppliers/abc1").reply(200, { data: { _id: "abc1" } })

    renderAt("/dashboard/suppliers/abc1/edit")

    await waitFor(() => expect(screen.getByDisplayValue("Acme")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => expect(screen.getByText("Supplier detail page: abc1")).toBeInTheDocument())
    expect(apiMock.history.patch).toHaveLength(1)
  })
})
