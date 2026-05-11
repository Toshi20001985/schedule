'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary:   { backgroundColor: '#1A1A1A', color: '#FFFFFF' },
  secondary: { backgroundColor: '#FFFFFF', color: '#1A1A1A', border: '0.5px solid #E5E5E5' },
  ghost:     { backgroundColor: 'transparent', color: '#737373' },
  danger:    { backgroundColor: '#FFF0F3', color: '#B5465A' },
}

const sizeMap = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', fullWidth = false, style, children, ...props }, ref) => {
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
          borderRadius: '10px',
          ...variantStyles[variant],
          ...style,
        }}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
