import { SlotStatus } from '@/lib/types'

const statusConfig: Record<SlotStatus, { label: string; className: string }> = {
  idea: { label: 'Идея', className: 'bg-[#1a1a1a] text-[#737373] border border-[#2a2a2a]' },
  draft: { label: 'Черновик', className: 'bg-blue-950/50 text-blue-400 border border-blue-800/50' },
  ready: { label: 'Готово', className: 'bg-green-950/50 text-green-400 border border-green-800/50' },
  published: { label: 'Опубликовано', className: 'bg-purple-950/50 text-purple-400 border border-purple-800/50' },
}

interface BadgeProps {
  status: SlotStatus
  className?: string
}

export function Badge({ status, className = '' }: BadgeProps) {
  const config = statusConfig[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className} ${className}`}>
      {config.label}
    </span>
  )
}
