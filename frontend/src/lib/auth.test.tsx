import { describe, test, expect, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import MockAdapter from "axios-mock-adapter"
import api from "@/lib/api"
import { AuthProvider, useAuth } from "./auth"

const apiMock = new MockAdapter(api)

beforeEach(() => {
  localStorage.clear()
  apiMock.reset()
})

function Probe() {
  const { isAuthenticated, user, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email ?? "none"}</span>
      <button onClick={() => login("a@example.com", "pw")}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  )
}

describe("AuthProvider", () => {
  test("reflects stored auth state on mount when a token already exists", () => {
    localStorage.setItem("accessToken", "existing-token")
    localStorage.setItem("user", JSON.stringify({ email: "stored@example.com", role: "admin", orgId: "org1" }))

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )

    expect(screen.getByTestId("authed")).toHaveTextContent("true")
    expect(screen.getByTestId("email")).toHaveTextContent("stored@example.com")
  })

  test("reflects unauthenticated state when no token is stored", () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )

    expect(screen.getByTestId("authed")).toHaveTextContent("false")
    expect(screen.getByTestId("email")).toHaveTextContent("none")
  })

  test("login() calls the real endpoint and updates context + storage", async () => {
    apiMock.onPost("/auth/login").reply(200, {
      data: {
        accessToken: "new-access",
        refreshToken: "new-refresh",
        user: { email: "a@example.com", role: "admin", orgId: "org1" },
      },
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )

    await userEvent.click(screen.getByText("login"))

    await waitFor(() => expect(screen.getByTestId("authed")).toHaveTextContent("true"))
    expect(screen.getByTestId("email")).toHaveTextContent("a@example.com")
    expect(localStorage.getItem("accessToken")).toBe("new-access")
  })

  test("logout() clears context + storage even if the revoke call fails", async () => {
    localStorage.setItem("accessToken", "existing-token")
    localStorage.setItem("refreshToken", "existing-refresh")
    localStorage.setItem("user", JSON.stringify({ email: "stored@example.com", role: "admin", orgId: "org1" }))
    apiMock.onPost("/auth/logout").reply(500)

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )

    await userEvent.click(screen.getByText("logout"))

    await waitFor(() => expect(screen.getByTestId("authed")).toHaveTextContent("false"))
    expect(localStorage.getItem("accessToken")).toBeNull()
  })
})
