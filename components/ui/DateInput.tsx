'use client'

import { useState } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameDay, isSameMonth, addMonths, subMonths
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DateInputProps {
  value: string          // 'yyyy-MM-dd' or ''
  onChange: (value: string) => void
  placeholder?: string
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

export default function DateInput({ value, onChange, placeholder = '日付を選択' }: DateInputProps) {
  const selected = value ? new Date(value.replace(/-/g, '/')) : null  // ローカル解釈
  const [viewMonth, setViewMonth] = useState(selected ?? new Date())

  const monthStart = startOfMonth(viewMonth)
  const monthEnd   = endOfMonth(viewMonth)
  const calDays    = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end:   endOfWeek(monthEnd,   { weekStartsOn: 0 }),
  })

  function select(day: Date) {
    onChange(format(day, 'yyyy-MM-dd'))
  }

  return (
    <div data-vaul-no-drag>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          data-vaul-no-drag
          onClick={() => setViewMonth(prev => subMonths(prev, 1))}
          style={{ padding: '10px', color: '#737373' }}
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>
            {format(viewMonth, 'yyyy年M月', { locale: ja })}
          </span>
          <button
            type="button"
            data-vaul-no-drag
            onClick={() => {
              const today = new Date()
              setViewMonth(today)
              onChange(format(today, 'yyyy-MM-dd'))
            }}
            style={{ fontSize: '12px', fontWeight: 500, padding: '6px 12px', color: '#6D5BD0', backgroundColor: '#F3F0FF', borderRadius: '6px', minHeight: '32px' }}
          >
            今日
          </button>
        </div>
        <button
          type="button"
          data-vaul-no-drag
          onClick={() => setViewMonth(prev => addMonths(prev, 1))}
          style={{ padding: '10px', color: '#737373' }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((label, i) => (
          <div key={label} className="text-center py-0.5">
            <span className="text-xs" style={{ color: i === 0 ? '#B5465A' : i === 6 ? '#6D5BD0' : '#A3A3A3' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {calDays.map(day => {
          const isSelected  = selected ? isSameDay(day, selected) : false
          const isToday     = isSameDay(day, new Date())
          const isThisMonth = isSameMonth(day, viewMonth)
          const isSun = day.getDay() === 0
          const isSat = day.getDay() === 6

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => select(day)}
              className="flex items-center justify-center"
              style={{ height: '36px' }}
            >
              <span
                className="w-8 h-8 flex items-center justify-center text-sm rounded-full"
                style={{
                  backgroundColor: isSelected ? '#1A1A1A' : isToday ? '#F5F5F3' : 'transparent',
                  color: isSelected
                    ? '#FFFFFF'
                    : !isThisMonth
                    ? '#D4D4D4'
                    : isSun
                    ? '#B5465A'
                    : isSat
                    ? '#6D5BD0'
                    : '#1A1A1A',
                  fontWeight: isSelected || isToday ? 600 : 400,
                }}
              >
                {format(day, 'd')}
              </span>
            </button>
          )
        })}
      </div>

      {/* Selected date display */}
      {selected && (
        <p className="text-xs mt-2 text-center" style={{ color: '#737373' }}>
          {format(selected, 'yyyy年M月d日(E)', { locale: ja })} を選択中
        </p>
      )}
      {!selected && (
        <p className="text-xs mt-2 text-center" style={{ color: '#A3A3A3' }}>{placeholder}</p>
      )}
    </div>
  )
}
