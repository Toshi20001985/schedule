'use client'

import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?:  'none' | 'sm' | 'md' | 'lg'
}

const paddingMap = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-5',
}

const shadowMap = {
  none: 'none',
  sm:   'var(--shadow-sm)',
  md:   'var(--shadow-md)',
  lg:   'var(--shadow-lg)',
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', padding = 'md', shadow = 'none', children, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${paddingMap[padding]} ${className}`}
        style={{
          backgroundColor: 'var(--color-card)',
          border: '0.5px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: shadowMap[shadow],
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export default Card
