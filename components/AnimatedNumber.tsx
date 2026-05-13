'use client'

import { useEffect } from 'react'
import { useMotionValue, useTransform, animate, motion, useReducedMotion } from 'framer-motion'

interface Props {
  value: number
  duration?: number
  style?: React.CSSProperties
  className?: string
}

export function AnimatedNumber({ value, duration = 0.9, style, className }: Props) {
  const reduced = useReducedMotion()
  const motionVal = useMotionValue(reduced ? value : 0)
  const rounded = useTransform(motionVal, v => Math.round(v))

  useEffect(() => {
    if (reduced) {
      motionVal.set(value)
      return
    }
    const controls = animate(motionVal, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    })
    return controls.stop
  }, [value, duration, reduced, motionVal])

  return (
    <motion.span style={style} className={className}>
      {rounded}
    </motion.span>
  )
}
