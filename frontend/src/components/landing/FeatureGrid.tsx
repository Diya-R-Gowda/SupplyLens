import { LineChart, ShieldCheck, Bell } from "lucide-react"
import Reveal from "@/components/Reveal"

const features = [
  {
    icon: LineChart,
    title: "Live risk scoring",
    description:
      "Every supplier gets a continuously updated, explainable risk score built from real signals — not a black box.",
  },
  {
    icon: ShieldCheck,
    title: "Explainable by design",
    description:
      "See exactly which factor moved a score and why, with plain-language reasoning behind every change.",
  },
  {
    icon: Bell,
    title: "Early warnings",
    description:
      "Get notified before a risk threshold is breached, not after — forecasting catches trouble early.",
  },
]

function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <Reveal className="mx-auto mb-14 max-w-xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight">
          Everything you need to track supplier risk
        </h2>
        <p className="mt-3 text-muted-foreground">
          Built for teams who need answers, not just dashboards.
        </p>
      </Reveal>

      <div className="grid gap-6 md:grid-cols-3">
        {features.map((feature, i) => (
          <Reveal key={feature.title} delay={i * 0.1}>
            <div className="h-full rounded-xl border border-border p-6">
              <feature.icon className="mb-4 size-6 text-primary" />
              <h3 className="mb-2 font-medium">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export default FeatureGrid
