'use client'

interface TagProps {
  label: string
  owner?: 'me' | 'partner' | 'both'
  className?: string
}

const ownerStyle = {
  me:      { bg: 'var(--color-visit-accent-soft)', text: 'var(--color-me)'     },
  partner: { bg: '#E8EFF6',                        text: 'var(--color-partner)' },
}

export default function Tag({ label, owner, className = '' }: TagProps) {
  // Case B: "ふたり" は グラデーションピル + アバタードット2つ
  if (owner === 'both') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${className}`}
        style={{
          borderRadius: '100px',
          background: 'linear-gradient(to right, var(--color-accent-pink-soft), var(--color-accent-blue-soft))',
        }}
      >
        <span className="inline-flex" style={{ gap: 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-accent-pink)', border: '1.5px solid var(--color-background-elevated)', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-accent-blue)', border: '1.5px solid var(--color-background-elevated)', display: 'inline-block', marginLeft: '-3px', flexShrink: 0 }} />
        </span>
        <span style={{ color: 'var(--color-foreground-secondary)' }}>{label}</span>
      </span>
    )
  }

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
