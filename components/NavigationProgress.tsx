'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

export function NavigationProgress() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 550)
    return () => clearTimeout(timer)
  }, [pathname, reduced])

  if (reduced) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="nav-progress"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            zIndex: 9999,
            transformOrigin: 'left center',
            background: 'linear-gradient(to right, var(--color-accent-blue, #6D5BD0), var(--color-accent-pink, #FFB3C6), var(--color-accent-blue, #6D5BD0))',
            pointerEvents: 'none',
          }}
        />
      )}
    </AnimatePresence>
  )
}
