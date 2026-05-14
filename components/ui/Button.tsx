'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { haptic } from '@/lib/haptics'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  /** true の間: スピナーを表示してボタンを無効化 */
  loading?: boolean
  /** true の間: チェックマークを表示（完了フィードバック） */
  success?: boolean
}

/** ボタン内に表示するローディングスピナー */
function Spinner() {
  return (
    <div
      className="w-4 h-4 rounded-full border-2 animate-spin"
      style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }}
    />
  )
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

// success 時に上書きする色
const successOverride: React.CSSProperties = {
  backgroundColor: '#4A7C59',
  color: '#FFFFFF',
}


const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      success = false,
      style,
      children,
      onClick,
      disabled,
      ...props
    },
    ref
  ) => {
    const reduced = useReducedMotion()

    function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
      if (loading || success) return
      haptic('light')
      onClick?.(e)
    }

    const effectiveStyle: React.CSSProperties = {
      borderRadius: 'var(--radius-md)',
      ...variantStyles[variant],
      ...(success ? successOverride : {}),
      // 背景色・文字色の変化をなめらかに
      transition: 'background-color 0.25s ease, color 0.25s ease',
      ...style,
    }

    // loading/success/idle の3状態でコンテンツを切り替える
    const contentKey = loading ? 'loading' : success ? 'success' : 'idle'

    return (
      <motion.button
        ref={ref}
        whileTap={reduced || loading || success ? undefined : { scale: 0.96 }}
        transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
        className={`
          inline-flex items-center justify-center gap-2 font-medium
          transition-opacity duration-150 active:opacity-70
          disabled:opacity-40 disabled:cursor-not-allowed
          ${sizeMap[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        style={effectiveStyle}
        disabled={disabled || loading}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(props as any)}
        onClick={handleClick}
      >
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <motion.span
              key="loading"
              className="inline-flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15, ease: 'backOut' }}
            >
              <Spinner />
            </motion.span>
          ) : success ? (
            <motion.span
              key="success"
              className="inline-flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15, ease: 'backOut' }}
            >
              <Check size={16} strokeWidth={2.5} />
            </motion.span>
          ) : (
            // idle: display:contents でボタンの flex レイアウトをそのまま継承
            <motion.span
              key="idle"
              style={{ display: 'contents' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.1 } }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
            >
              {children}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export default Button
