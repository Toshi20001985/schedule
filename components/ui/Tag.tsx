'use client'

interface TagProps {
  label: string
  owner?: 'me' | 'partner' | 'both'
  className?: string
}

const ownerStyle = {
  me:      { bg: 'var(--color-visit-accent-soft)', text: 'var(--color-me)'      },
  partner: { bg: '#E8EFF6',                        text: 'var(--color-partner)'  },
  both:    { bg: 'var(--color-surface)',            text: 'var(--color-muted)'   },
}

export default function Tag({ label, owner, className = '' }: TagProps) {
  const style = owner ? ownerStyle[owner] : null

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${className}`}
      style={{
        borderRadius: 'var(--radius-sm)',
        ...(style
          ? { backgroundColor: style.bg, color: style.text }
          : { backgroundColor: 'var(--color-surface)', color: 'var(--color-muted)' }),
      }}
    >
      {label}
    </span>
  )
}
