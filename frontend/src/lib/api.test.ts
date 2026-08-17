import { describe, test, expect, beforeEach, vi } from "vitest"
import axios from "axios"
import MockAdapter from "axios-mock-adapter"
import api, { setOnAuthFailure } from "./api"

// Two adapters: one on the raw `axios` module (intercepts the refresh call
// in api.ts's performRefresh(), which deliberately uses the bare axios
// instance rather than `api` itself - retrying with an instance that might
// itself be mid-401 would be circular), one on `api` (intercepts every
// other outgoing request). This mocks only the network boundary - the real
// interceptor logic in api.ts runs unmodified.
const globalMock = new MockAdapter(axios)
const apiMock = new MockAdapter(api)

// performRefresh() posts to the full absolute URL (BASE_URL + /auth/refresh),
// not a path relative to any baseURL - the raw axios instance it uses has
// none configured. Matches api.ts's own fallback default (no
// VITE_API_BASE_URL is set in this test environment).
const REFRESH_URL = "http://127.0.0.1:5000/api/auth/refresh"

// Only reset handlers/history between tests - .restore() detaches the
// adapter entirely, and these two MockAdapter instances are constructed
// once for the whole file, not per test.
beforeEach(() => {
  localStorage.clear()
  globalMock.reset()
  apiMock.reset()
  setOnAuthFailure(() => {})
})

describe("request interceptor", () => {
  test("attaches the stored access token as a Bearer header", async () => {
    localStorage.setItem("accessToken", "abc123")
    apiMock.onGet("/whoami").reply((config) => {
      expect(config.headers?.Authorization).toBe("Bearer abc123")
      return [200, { ok: true }]
    })

    await api.get("/whoami")
  })

  test("omits the Authorization header when no token is stored", async () => {
    apiMock.onGet("/whoami").reply((config) => {
      expect(config.headers?.Authorization).toBeUndefined()
      return [200, { ok: true }]
    })

    await api.get("/whoami")
  })
})

describe("response interceptor - token refresh", () => {
  test("a TOKEN_EXPIRED 401 refreshes exactly once and retries the original request", async () => {
    localStorage.setItem("accessToken", "old-token")
    localStorage.setItem("refreshToken", "old-refresh")

    apiMock.onGet("/protected").replyOnce(401, { error: { code: "TOKEN_EXPIRED" } })
    apiMock.onGet("/protected").reply((config) => {
      expect(config.headers?.Authorization).toBe("Bearer new-token")
      return [200, { ok: true }]
    })
    globalMock.onPost(REFRESH_URL).reply(200, {
      data: { accessToken: "new-token", refreshToken: "new-refresh" },
    })

    const res = await api.get("/protected")

    expect(res.data).toEqual({ ok: true })
    expect(localStorage.getItem("accessToken")).toBe("new-token")
    expect(globalMock.history.post).toHaveLength(1)
  })

  test("two concurrent TOKEN_EXPIRED failures share a single refresh call", async () => {
    localStorage.setItem("accessToken", "old-token")
    localStorage.setItem("refreshToken", "old-refresh")

    apiMock.onGet("/a").replyOnce(401, { error: { code: "TOKEN_EXPIRED" } })
    apiMock.onGet("/a").reply(200, { which: "a" })
    apiMock.onGet("/b").replyOnce(401, { error: { code: "TOKEN_EXPIRED" } })
    apiMock.onGet("/b").reply(200, { which: "b" })
    globalMock.onPost(REFRESH_URL).reply(200, {
      data: { accessToken: "new-token", refreshToken: "new-refresh" },
    })

    const [a, b] = await Promise.all([api.get("/a"), api.get("/b")])

    expect(a.data).toEqual({ which: "a" })
    expect(b.data).toEqual({ which: "b" })
    expect(globalMock.history.post).toHaveLength(1)
  })

  test("a failed refresh clears tokens and notifies onAuthFailure, without a false-positive success", async () => {
    localStorage.setItem("accessToken", "old-token")
    localStorage.setItem("refreshToken", "old-refresh")
    const onAuthFailure = vi.fn()
    setOnAuthFailure(onAuthFailure)

    apiMock.onGet("/protected").reply(401, { error: { code: "TOKEN_EXPIRED" } })
    globalMock.onPost(REFRESH_URL).reply(401, { error: { code: "INVALID_REFRESH" } })

    await expect(api.get("/protected")).rejects.toBeTruthy()

    expect(localStorage.getItem("accessToken")).toBeNull()
    expect(localStorage.getItem("refreshToken")).toBeNull()
    expect(onAuthFailure).toHaveBeenCalledTimes(1)
  })

  test("a 401 without TOKEN_EXPIRED does not attempt a refresh", async () => {
    localStorage.setItem("accessToken", "old-token")
    localStorage.setItem("refreshToken", "old-refresh")

    apiMock.onGet("/protected").reply(401, { error: { code: "INVALID_TOKEN" } })

    await expect(api.get("/protected")).rejects.toBeTruthy()

    expect(globalMock.history.post).toHaveLength(0)
    expect(localStorage.getItem("accessToken")).toBeNull()
  })

  test("a non-401 error does not touch stored tokens or attempt a refresh", async () => {
    localStorage.setItem("accessToken", "still-here")

    apiMock.onGet("/protected").reply(500, { error: { code: "INTERNAL_ERROR" } })

    await expect(api.get("/protected")).rejects.toBeTruthy()

    expect(globalMock.history.post).toHaveLength(0)
    expect(localStorage.getItem("accessToken")).toBe("still-here")
  })
})
