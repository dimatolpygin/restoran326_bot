'use client'

import { useState, useMemo } from 'react'
import { ContentSlot } from '@/lib/types'
import { CalendarCell } from './CalendarCell'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

interface CalendarViewProps {
  slots: ContentSlot[]
  onSlotClick: (slot: ContentSlot) => void
  onAddSlot: (date: Date) => void
  initialDate?: Date
}

function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  // Monday-first: 0=Mon...6=Sun
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const grid: Date[] = []
  for (let i = startDow; i > 0; i--) {
    grid.push(new Date(year, month, 1 - i))
  }
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push(new Date(year, month, d))
  }
  while (grid.length % 7 !== 0) {
    grid.push(new Date(year, month, daysInMonth + (grid.length - daysInMonth - startDow + 1)))
  }
  return grid
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function CalendarView({ slots, onSlotClick, onAddSlot, initialDate }: CalendarViewProps) {
  const today = new Date()
  const [current, setCurrent] = useState(initialDate ?? today)

  const year = current.getFullYear()
  const month = current.getMonth()

  const grid = useMemo(() => getMonthGrid(year, month), [year, month])

  const slotsByDate = useMemo(() => {
    const map = new Map<string, ContentSlot[]>()
    for (const slot of slots) {
      const key = slot.date
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(slot)
    }
    return map
  }, [slots])

  function prev() {
    setCurrent(new Date(year, month - 1, 1))
  }

  function next() {
    setCurrent(new Date(year, month + 1, 1))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-3">
          <button
            onClick={prev}
            className="p-1 rounded hover:bg-[#1a1a1a] text-[#737373] hover:text-[#f5f5f5] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-sm font-semibold text-[#f5f5f5] min-w-36 text-center">
            {MONTHS_RU[month]} {year}
          </h2>
          <button
            onClick={next}
            className="p-1 rounded hover:bg-[#1a1a1a] text-[#737373] hover:text-[#f5f5f5] transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 border-b border-[#2a2a2a]">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-[10px] text-[#737373] py-2 border-r border-[#2a2a2a] last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 flex-1">
        {grid.map((date, idx) => {
          const key = toLocalDateStr(date)
          const isCurrentMonth = date.getMonth() === month
          const isToday = toLocalDateStr(date) === toLocalDateStr(today)
          const daySlots = slotsByDate.get(key) ?? []

          return (
            <CalendarCell
              key={idx}
              date={date}
              slots={daySlots}
              isCurrentMonth={isCurrentMonth}
              isToday={isToday}
              onSlotClick={onSlotClick}
              onAddSlot={onAddSlot}
            />
          )
        })}
      </div>
    </div>
  )
}
