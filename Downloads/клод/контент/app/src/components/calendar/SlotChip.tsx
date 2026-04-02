'use client'

import { ContentSlot, SlotStatus } from '@/lib/types'
import { Send, Users, Camera, X as XIcon, Video } from 'lucide-react'

const platformIcons = {
  telegram: Send,
  vk: Users,
  instagram: Camera,
  x: XIcon,
  youtube: Video,
}

const statusBorder: Record<SlotStatus, string> = {
  idea: 'border-[#2a2a2a]',
  draft: 'border-blue-700/60',
  ready: 'border-green-700/60',
  published: 'border-purple-700/60',
}

const statusBg: Record<SlotStatus, string> = {
  idea: 'bg-[#1a1a1a]',
  draft: 'bg-blue-950/40',
  ready: 'bg-green-950/40',
  published: 'bg-purple-950/40',
}

interface SlotChipProps {
  slot: ContentSlot
  onClick: (slot: ContentSlot) => void
}

export function SlotChip({ slot, onClick }: SlotChipProps) {
  const Icon = platformIcons[slot.platform] ?? Send

  return (
    <button
      onClick={() => onClick(slot)}
      className={[
        'w-full flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-left',
        'hover:brightness-110 transition-all cursor-pointer',
        statusBorder[slot.status],
        statusBg[slot.status],
      ].join(' ')}
    >
      <Icon size={10} className="text-[#737373] shrink-0" />
      <span className="text-[10px] text-[#f5f5f5] truncate leading-tight">
        {slot.topic ?? slot.format}
      </span>
    </button>
  )
}
