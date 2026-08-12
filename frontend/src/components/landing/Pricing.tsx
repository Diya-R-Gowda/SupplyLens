import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import Reveal from "@/components/Reveal"

const tiers = [
  {
    name: "Starter",
    price: "$0",
    period: "/mo",
    description: "For small teams getting started.",
    features: ["Up to 10 suppliers", "Basic risk scoring", "Document vault"],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$49",
    period: "/mo",
    description: "For teams that need real-time visibility.",
    features: [
      "Up to 200 suppliers",
      "Explainable risk & health scores",
      "Forecasting & alerts",
      "RAG chat over documents",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations with complex portfolios.",
    features: [
      "Unlimited suppliers",
      "Multi-agent AI analysis",
      "SSO & audit logs",
      "Dedicated support",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
]

function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
      <Reveal className="mx-auto mb-14 max-w-xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight">
          Simple, transparent pricing
        </h2>
        <p className="mt-3 text-muted-foreground">
          Start free. Upgrade when you need more.
        </p>
      </Reveal>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier, i) => (
          <Reveal key={tier.name} delay={i * 0.1}>
            <div
              className={`flex h-full flex-col rounded-xl border p-6 ${
                tier.highlighted ? "border-primary" : "border-border"
              }`}
            >
              {tier.highlighted && (
                <span className="mb-3 inline-block w-fit rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Most popular
                </span>
              )}
              <h3 className="font-medium">{tier.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight">
                  {tier.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {tier.period}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {tier.description}
              </p>

              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-8"
                variant={tier.highlighted ? "default" : "outline"}
              >
                {tier.cta}
              </Button>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export default Pricing
