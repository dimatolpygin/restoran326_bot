'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Newspaper } from 'lucide-react'

export function ProjectTabNav({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  const isNews = pathname.endsWith('/news')

  return (
    <div className="shrink-0 border-b border-[#2a2a2a] bg-[#111111] flex items-center px-4 h-10 gap-1">
      <Link
        href={`/projects/${projectId}`}
        className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
          !isNews
            ? 'bg-[#1a1a1a] text-[#f5f5f5] border border-[#2a2a2a]'
            : 'text-[#737373] hover:text-[#f5f5f5]'
        }`}
      >
        <CalendarDays size={12} />
        Календарь
      </Link>
      <Link
        href={`/projects/${projectId}/news`}
        className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
          isNews
            ? 'bg-[#1a1a1a] text-[#f5f5f5] border border-[#2a2a2a]'
            : 'text-[#737373] hover:text-[#f5f5f5]'
        }`}
      >
        <Newspaper size={12} />
        Новости
      </Link>
    </div>
  )
}
