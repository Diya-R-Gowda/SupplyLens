import { Button } from "@/components/ui/button"

function Home() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Supplier risk, at a glance
        </h1>
        <p className="max-w-xl text-muted-foreground">
          A clean base layout wired up with Tailwind CSS, shadcn/ui, and
          Framer Motion — off-white background, near-black text, one
          indigo accent.
        </p>
      </div>

      <div className="flex gap-3">
        <Button>Get started</Button>
        <Button variant="outline">Learn more</Button>
      </div>
    </div>
  )
}

export default Home
