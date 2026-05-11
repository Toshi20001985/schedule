'use client'

interface IconCircleProps {
  initial: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

export default function IconCircle({
  initial,
  color = '#1A1A1A',
  size = 'md',
  className = '',
}: IconCircleProps) {
  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold text-white ${sizeMap[size]} ${className}`}
      style={{ backgroundColor: color }}
    >
      {initial.charAt(0).toUpperCase()}
    </div>
  )
}
