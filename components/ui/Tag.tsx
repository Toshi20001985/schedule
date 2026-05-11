'use client'

interface TagProps {
  label: string
  owner?: 'me' | 'him' | 'both'
  className?: string
}

const ownerMap = {
  me:   { bg: '#EEECF9', text: '#6D5BD0' },
  him:  { bg: '#E8EFF6', text: '#2D6B9E' },
  both: { bg: '#F5F5F3', text: '#737373' },
}

const ownerLabel = {
  me: 'わたし',
  him: 'かれ',
  both: 'ふたり',
}

export default function Tag({ label, owner, className = '' }: TagProps) {
  const style = owner ? ownerMap[owner] : null

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${className}`}
      style={{
        borderRadius: '6px',
        ...(style
          ? { backgroundColor: style.bg, color: style.text }
          : { backgroundColor: '#F5F5F3', color: '#737373' }),
      }}
    >
      {owner ? ownerLabel[owner] : label}
    </span>
  )
}
