'use client'

import { ContentSlot } from '@/lib/types'
import { SlotChip } from './SlotChip'
import { Plus } from 'lucide-react'

interface CalendarCellProps {
  date: Date
  slots: ContentSlot[]
  isCurrentMonth: boolean
  isToday: boolean
  onSlotClick: (slot: ContentSlot) => void
  onAddSlot: (date: Date) => void
}

export function CalendarCell({ date, slots, isCurrentMonth, isToday, onSlotClick, onAddSlot }: CalendarCellProps) {
  const visible = slots.slice(0, 4)
  const overflow = slots.length - 4

  return (
    <div
      className={[
        'min-h-24 p-1.5 border-b border-r border-[#2a2a2a] relative group',
        isCurrentMonth ? 'bg-[#0a0a0a]' : 'bg-[#0d0d0d]',
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={[
            'text-xs w-5 h-5 flex items-center justify-center rounded-full',
            isToday
              ? 'bg-[#6366f1] text-white font-semibold'
              : isCurrentMonth
              ? 'text-[#f5f5f5]'
              : 'text-[#3a3a3a]',
          ].join(' ')}
        >
          {date.getDate()}
        </span>

        <button
          onClick={() => onAddSlot(date)}
          className="opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 flex items-center justify-center rounded text-[#737373] hover:text-[#f5f5f5] hover:bg-[#2a2a2a]"
        >
          <Plus size={10} />
        </button>
      </div>

      <div className="flex flex-col gap-0.5">
        {visible.map((slot) => (
          <SlotChip key={slot.id} slot={slot} onClick={onSlotClick} />
        ))}
        {overflow > 0 && (
          <span className="text-[9px] text-[#737373] px-1">+{overflow}</span>
        )}
      </div>
    </div>
  )
}
