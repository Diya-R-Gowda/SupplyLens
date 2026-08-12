import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import Reveal from "@/components/Reveal"
import DashboardMockup from "@/components/landing/DashboardMockup"

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-24 md:grid-cols-2 md:py-32">
      <Reveal>
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            Supplier risk, tracked and explained in real time
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            SupplyLens turns scattered contracts, news, and scores into one
            live view of every supplier's risk — with the reasoning behind
            every number.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/login">Start free</Link>
            </Button>
            <Button size="lg" variant="outline">
              View demo
            </Button>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <DashboardMockup />
      </Reveal>
    </section>
  )
}

export default Hero
