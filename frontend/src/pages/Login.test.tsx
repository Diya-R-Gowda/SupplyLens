import { describe, test, expect, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import MockAdapter from "axios-mock-adapter"
import api from "@/lib/api"
import { AuthProvider } from "@/lib/auth"
import Login from "./Login"

const apiMock = new MockAdapter(api)

beforeEach(() => {
  localStorage.clear()
  apiMock.reset()
})

// Real MemoryRouter + Routes + AuthProvider, matching ProtectedRoute.test.tsx
// and auth.test.tsx - /dashboard and /custom stand in for wherever a
// successful login/register or an already-authenticated visit redirects to.
function renderAt(entry: string | { pathname: string; state?: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
          <Route path="/custom" element={<div>Custom page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

function fillCredentials(email = "a@example.com", password = "password123") {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } })
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } })
}

describe("Login > mode toggle", () => {
  test("renders sign-in mode by default", () => {
    renderAt("/login")

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).not.toHaveAttribute("minlength")
  })

  test("toggling switches to register mode (with its own copy and password minLength), and back again", () => {
    renderAt("/login")

    fireEvent.click(screen.getByText("Don't have an account? Register"))

    expect(screen.getByRole("heading", { name: "Create your workspace" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toHaveAttribute("minlength", "8")

    fireEvent.click(screen.getByText("Already have an account? Sign in"))

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument()
  })

  test("toggling mode clears any error currently shown", async () => {
    apiMock.onPost("/auth/login").reply(401, { error: { message: "Invalid credentials" } })
    renderAt("/login")

    fillCredentials()
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }))
    await waitFor(() => expect(screen.getByText("Invalid credentials")).toBeInTheDocument())

    fireEvent.click(screen.getByText("Don't have an account? Register"))

    expect(screen.queryByText("Invalid credentials")).not.toBeInTheDocument()
  })
})

describe("Login > error rendering and loading state", () => {
  test("a failed login shows the server's error message and re-enables the button", async () => {
    apiMock.onPost("/auth/login").reply(401, { error: { message: "Invalid credentials" } })
    renderAt("/login")

    fillCredentials()
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }))

    await waitFor(() => expect(screen.getByText("Invalid credentials")).toBeInTheDocument())
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled()
  })

  test("a failed login falls back to a generic message when the server gives none", async () => {
    apiMock.onPost("/auth/login").reply(500)
    renderAt("/login")

    fillCredentials()
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }))

    await waitFor(() => expect(screen.getByText("Unable to sign in")).toBeInTheDocument())
  })

  test("shows a disabled loading state while the request is in flight, then clears it", async () => {
    let resolveLogin!: (value: [number, unknown]) => void
    apiMock.onPost("/auth/login").reply(() => new Promise<[number, unknown]>((resolve) => { resolveLogin = resolve }))
    renderAt("/login")

    fillCredentials()
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }))

    const pendingButton = await screen.findByRole("button", { name: "Please wait…" })
    expect(pendingButton).toBeDisabled()

    resolveLogin([
      200,
      { data: { accessToken: "a", refreshToken: "b", user: { email: "a@example.com", role: "admin", orgId: "org1" } } },
    ])

    await waitFor(() => expect(screen.getByText("Dashboard page")).toBeInTheDocument())
  })
})

describe("Login > successful auth", () => {
  test("a successful login navigates to the location the user was redirected from", async () => {
    apiMock.onPost("/auth/login").reply(200, {
      data: { accessToken: "a", refreshToken: "b", user: { email: "a@example.com", role: "admin", orgId: "org1" } },
    })
    renderAt({ pathname: "/login", state: { from: { pathname: "/custom" } } })

    fillCredentials()
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }))

    await waitFor(() => expect(screen.getByText("Custom page")).toBeInTheDocument())
  })

  test("register mode calls the register endpoint, not login", async () => {
    apiMock.onPost("/auth/register").reply(200, {
      data: { accessToken: "a", refreshToken: "b", user: { email: "new@example.com", role: "admin", orgId: "org1" } },
    })
    renderAt("/login")

    fireEvent.click(screen.getByText("Don't have an account? Register"))
    fillCredentials("new@example.com", "password123")
    fireEvent.click(screen.getByRole("button", { name: "Create account" }))

    await waitFor(() => expect(screen.getByText("Dashboard page")).toBeInTheDocument())
    expect(apiMock.history.post.some((p) => p.url === "/auth/register")).toBe(true)
    expect(apiMock.history.post.some((p) => p.url === "/auth/login")).toBe(false)
  })

  test("an already-authenticated visitor is redirected immediately without seeing the form", () => {
    localStorage.setItem("accessToken", "existing-token")
    localStorage.setItem("user", JSON.stringify({ email: "x@example.com", role: "admin", orgId: "org1" }))

    renderAt("/login")

    expect(screen.getByText("Dashboard page")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Sign in" })).not.toBeInTheDocument()
  })
})
