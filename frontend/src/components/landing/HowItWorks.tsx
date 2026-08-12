import Reveal from "@/components/Reveal"

const steps = [
  {
    step: "01",
    title: "Connect your suppliers",
    description:
      "Import your supplier list and upload contracts, certifications, and reports.",
  },
  {
    step: "02",
    title: "We analyze everything",
    description:
      "News, documents, and compliance data are turned into a live, explainable risk score.",
  },
  {
    step: "03",
    title: "Act before it's a problem",
    description:
      "Get alerts, forecasts, and simulations that help you act before risk becomes disruption.",
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <Reveal className="mx-auto mb-14 max-w-xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground">
            From raw supplier data to actionable insight in three steps.
          </p>
        </Reveal>

        <div className="grid gap-10 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.step} delay={i * 0.1}>
              <div className="relative border-l border-border pl-6 md:border-t md:border-l-0 md:pt-6 md:pl-0">
                <span className="mb-3 block text-sm font-medium text-primary">
                  {s.step}
                </span>
                <h3 className="mb-2 font-medium">{s.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {s.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
