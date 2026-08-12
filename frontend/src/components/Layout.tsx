import type { ReactNode } from "react"
import { motion } from "framer-motion"

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <span className="text-sm font-semibold tracking-tight">
            SupplyLens
          </span>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">
              Dashboard
            </a>
            <a href="#" className="hover:text-foreground">
              Suppliers
            </a>
            <a href="#" className="hover:text-foreground">
              Reports
            </a>
          </nav>
        </div>
      </header>

      <motion.main
        className="mx-auto max-w-5xl px-6 py-12"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {children}
      </motion.main>
    </div>
  )
}

export default Layout
