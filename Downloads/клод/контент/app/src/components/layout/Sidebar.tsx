'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, FolderOpen, Newspaper } from 'lucide-react'

const navItems = [
  { href: '/projects', icon: FolderOpen, label: 'Проекты' },
  { href: '/projects/new', icon: LayoutGrid, label: 'Новый проект' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 bg-[#111111] border-r border-[#2a2a2a] flex flex-col min-h-screen">
      <div className="px-4 py-5 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <Newspaper size={18} className="text-[#6366f1]" />
          <span className="text-sm font-semibold text-[#f5f5f5]">Content Planner</span>
        </div>
      </div>

      <nav className="flex flex-col gap-1 p-2 flex-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/projects' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-[#1a1a1a] text-[#f5f5f5]'
                  : 'text-[#737373] hover:text-[#f5f5f5] hover:bg-[#1a1a1a]',
              ].join(' ')}
            >
              <Icon size={15} />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
