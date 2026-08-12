import { useEffect } from "react"
import { motion, useMotionValue, useTransform, animate } from "framer-motion"

function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
}: {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
}) {
  const count = useMotionValue(0)
  const formatted = useTransform(count, (latest) =>
    `${prefix}${latest.toFixed(decimals)}${suffix}`
  )

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.2,
      ease: "easeOut",
    })
    return controls.stop
  }, [value, count])

  return <motion.span>{formatted}</motion.span>
}

export default AnimatedNumber
