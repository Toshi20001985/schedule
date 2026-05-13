'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { haptic } from '@/lib/haptics'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--color-text)',
    color: 'var(--color-bg)',
    boxShadow: 'var(--shadow-sm)',
  },
  secondary: {
    backgroundColor: 'var(--color-card)',
    color: 'var(--color-text)',
    border: '0.5px solid var(--color-border)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--color-muted)',
  },
  danger: {
    backgroundColor: 'var(--color-anniversary-soft)',
    color: 'var(--color-anniversary-accent)',
  },
}

const sizeMap = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', fullWidth = false, style, children, onClick, ...props }, ref) => {
    function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
      haptic('light')
      onClick?.(e)
    }
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-2 font-medium
          transition-opacity duration-150 active:opacity-70
          disabled:opacity-40 disabled:cursor-not-allowed
          ${sizeMap[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        style={{
          borderRadius: 'var(--radius-md)',
          ...variantStyles[variant],
          ...style,
        }}
        {...props}
        onClick={handleClick}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
