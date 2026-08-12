import { Routes, Route, useLocation } from "react-router-dom"
import { AnimatePresence } from "framer-motion"
import Landing from "@/pages/Landing"
import Login from "@/pages/Login"
import DashboardOverview from "@/pages/DashboardOverview"
import SupplierList from "@/pages/SupplierList"
import SupplierDetail from "@/pages/SupplierDetail"
import SupplierForm from "@/pages/SupplierForm"
import PageTransition from "@/components/PageTransition"
import ProtectedRoute from "@/components/ProtectedRoute"
import DashboardLayout from "@/components/dashboard/DashboardLayout"

// AnimatePresence's key groups by top-level section only, so navigating
// between /dashboard/suppliers, /dashboard/suppliers/:id, etc. never remounts
// (and re-fades) the persistent sidebar/topbar shell - only landing <-> login
// <-> dashboard transitions do.
function sectionKey(pathname: string) {
  if (pathname.startsWith("/dashboard")) return "/dashboard"
  return pathname
}

function App() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={sectionKey(location.pathname)}>
        <Route
          path="/"
          element={
            <PageTransition>
              <Landing />
            </PageTransition>
          }
        />
        <Route
          path="/login"
          element={
            <PageTransition>
              <Login />
            </PageTransition>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <PageTransition>
                <DashboardLayout />
              </PageTransition>
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardOverview />} />
          <Route path="suppliers" element={<SupplierList />} />
          <Route path="suppliers/new" element={<SupplierForm />} />
          <Route path="suppliers/:id" element={<SupplierDetail />} />
          <Route path="suppliers/:id/edit" element={<SupplierForm />} />
        </Route>
      </Routes>
    </AnimatePresence>
  )
}

export default App
