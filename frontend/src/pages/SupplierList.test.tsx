import { describe, test, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import MockAdapter from "axios-mock-adapter"
import api from "@/lib/api"
import { AuthProvider } from "@/lib/auth"
import SupplierList from "./SupplierList"

const apiMock = new MockAdapter(api)

const SUPPLIER = {
  _id: "s1",
  name: "Acme",
  category: "logistics",
  country: "US",
  riskScore: 45,
  contractExpiry: "2027-01-15T00:00:00.000Z",
  orgId: "org1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

function onePage(overrides: Partial<typeof SUPPLIER>[] = [SUPPLIER]) {
  return { data: overrides, meta: { pagination: { total: overrides.length, page: 1, limit: 20, totalPages: 1 } } }
}

function renderAt(initialEntries: string[], role: "admin" | "viewer" = "admin") {
  localStorage.setItem("accessToken", "token")
  localStorage.setItem("user", JSON.stringify({ email: "u@example.com", role, orgId: "org1" }))

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <SupplierList />
      </AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  apiMock.reset()
})

describe("SupplierList > URL-driven search/category/page state", () => {
  test("reads search, category, and page from the URL and passes them to the list request", async () => {
    apiMock.onGet("/suppliers").reply((config) => {
      expect(config.params).toEqual({ search: "acme", category: "logistics", page: 2 })
      return [200, onePage([])]
    })

    renderAt(["/dashboard/suppliers?search=acme&category=logistics&page=2"])

    await waitFor(() => expect(screen.getByText("No suppliers found.")).toBeInTheDocument())
    expect(screen.getByPlaceholderText("Search by name…")).toHaveValue("acme")
  })

  test("submitting the search box updates the URL search param and resets the page param to 1", async () => {
    apiMock.onGet("/suppliers").reply(200, onePage())

    renderAt(["/dashboard/suppliers?page=3"])
    await waitFor(() => expect(apiMock.history.get.length).toBeGreaterThan(0))

    const form = screen.getByPlaceholderText("Search by name…").closest("form")
    fireEvent.change(screen.getByPlaceholderText("Search by name…"), { target: { value: "foo" } })
    fireEvent.submit(form as HTMLFormElement)

    await waitFor(() => {
      const last = apiMock.history.get[apiMock.history.get.length - 1]
      expect(last.params).toEqual({ search: "foo", category: undefined, page: 1 })
    })
  })

  test("Next advances the page param and triggers a request for the next page", async () => {
    apiMock.onGet("/suppliers").reply(200, {
      data: [SUPPLIER],
      meta: { pagination: { total: 50, page: 2, limit: 20, totalPages: 3 } },
    })

    renderAt(["/dashboard/suppliers?page=2"])
    await waitFor(() => expect(screen.getByText("Page 2 of 3")).toBeInTheDocument())

    fireEvent.click(screen.getByRole("button", { name: "Next" }))

    await waitFor(() => {
      expect(apiMock.history.get.some((c) => c.params?.page === 3)).toBe(true)
    })
  })
})

describe("SupplierList > delete confirmation flow", () => {
  test("confirming the delete prompt calls the delete endpoint and reloads the list", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true)
    apiMock.onGet("/suppliers").reply(200, onePage())
    apiMock.onDelete("/suppliers/s1").reply(204)

    renderAt(["/dashboard/suppliers"])
    await waitFor(() => expect(screen.getByText("Acme")).toBeInTheDocument())

    fireEvent.click(screen.getByLabelText("Delete Acme"))

    await waitFor(() => expect(apiMock.history.delete).toHaveLength(1))
    expect(apiMock.history.delete[0].url).toBe("/suppliers/s1")
    // load() runs again after a successful delete.
    await waitFor(() => expect(apiMock.history.get.length).toBeGreaterThanOrEqual(2))
  })

  test("declining the delete prompt sends no request", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false)
    apiMock.onGet("/suppliers").reply(200, onePage())

    renderAt(["/dashboard/suppliers"])
    await waitFor(() => expect(screen.getByText("Acme")).toBeInTheDocument())

    fireEvent.click(screen.getByLabelText("Delete Acme"))

    expect(apiMock.history.delete).toHaveLength(0)
  })

  test("a failed delete surfaces an error instead of silently reloading", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true)
    apiMock.onGet("/suppliers").reply(200, onePage())
    apiMock.onDelete("/suppliers/s1").reply(500, { error: { message: "Couldn't delete right now" } })

    renderAt(["/dashboard/suppliers"])
    await waitFor(() => expect(screen.getByText("Acme")).toBeInTheDocument())

    fireEvent.click(screen.getByLabelText("Delete Acme"))

    await waitFor(() => expect(screen.getByText("Couldn't delete right now")).toBeInTheDocument())
  })
})

describe("SupplierList > role gating", () => {
  test("viewers see no Add supplier button and no per-row Edit/Delete actions", async () => {
    apiMock.onGet("/suppliers").reply(200, onePage())

    renderAt(["/dashboard/suppliers"], "viewer")

    await waitFor(() => expect(screen.getByText("Acme")).toBeInTheDocument())
    expect(screen.queryByText("Add supplier")).not.toBeInTheDocument()
    expect(screen.queryByText("Edit")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Delete Acme")).not.toBeInTheDocument()
  })
})

describe("SupplierList > error state", () => {
  test("a failed load shows ErrorState, and Try again re-fetches", async () => {
    apiMock.onGet("/suppliers").replyOnce(500, { error: { message: "Server exploded" } })
    apiMock.onGet("/suppliers").reply(200, onePage([]))

    renderAt(["/dashboard/suppliers"])

    await waitFor(() => expect(screen.getByText("Server exploded")).toBeInTheDocument())
    fireEvent.click(screen.getByText("Try again"))

    await waitFor(() => expect(screen.getByText("No suppliers found.")).toBeInTheDocument())
  })
})
