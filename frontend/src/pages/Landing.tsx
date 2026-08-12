import Navbar from "@/components/landing/Navbar"
import Hero from "@/components/landing/Hero"
import FeatureGrid from "@/components/landing/FeatureGrid"
import HowItWorks from "@/components/landing/HowItWorks"
import Pricing from "@/components/landing/Pricing"
import Footer from "@/components/landing/Footer"

function Landing() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <Navbar />
      <Hero />
      <FeatureGrid />
      <HowItWorks />
      <Pricing />
      <Footer />
    </div>
  )
}

export default Landing
