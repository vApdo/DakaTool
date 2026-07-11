"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"

export default function AppTemplate({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <>{children}</>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
    >
      {children}
    </motion.div>
  )
}
