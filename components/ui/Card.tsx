'use client'

import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', padding = 'md', children, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-white ${paddingMap[padding]} ${className}`}
        style={{
          border: '0.5px solid #E5E5E5',
          borderRadius: '12px',
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
