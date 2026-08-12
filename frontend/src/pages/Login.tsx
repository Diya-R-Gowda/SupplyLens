import { useState, type FormEvent } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth"
import { getErrorMessage } from "@/lib/errors"

function Login() {
  const { isAuthenticated, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const isRegister = mode === "register"
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || "/dashboard"

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (isRegister) {
        await register(email, password)
      } else {
        await login(email, password)
      }
      navigate(from, { replace: true })
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, isRegister ? "Unable to create account" : "Unable to sign in")
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-sm">
        <Link to="/" className="text-base font-semibold tracking-tight">
          SupplyLens
        </Link>

        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h1 className="text-xl font-semibold tracking-tight">
            {isRegister ? "Create your workspace" : "Sign in"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isRegister
              ? "Register a new organisation with an email and password."
              : "Sign in with your email and password."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                minLength={isRegister ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
            </Button>
          </form>

          <button
            type="button"
            className="mt-4 w-full text-center text-sm text-primary hover:underline"
            onClick={() => {
              setMode(isRegister ? "login" : "register")
              setError("")
            }}
          >
            {isRegister ? "Already have an account? Sign in" : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login
