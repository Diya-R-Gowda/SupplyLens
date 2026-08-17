import { describe, test, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "@/lib/auth"
import ProtectedRoute from "./ProtectedRoute"

beforeEach(() => {
  localStorage.clear()
})

// Real MemoryRouter + Routes, not a mocked useNavigate - exercises the
// actual redirect-with-state behavior, not just that a function was called.
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Dashboard content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe("ProtectedRoute", () => {
  test("renders children when authenticated", () => {
    localStorage.setItem("accessToken", "existing-token")
    localStorage.setItem("user", JSON.stringify({ email: "a@example.com", role: "admin", orgId: "org1" }))

    renderAt("/dashboard")

    expect(screen.getByText("Dashboard content")).toBeInTheDocument()
  })

  test("redirects to /login when not authenticated", () => {
    renderAt("/dashboard")

    expect(screen.getByText("Login page")).toBeInTheDocument()
    expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument()
  })
})
