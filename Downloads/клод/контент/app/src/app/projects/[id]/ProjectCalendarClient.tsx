'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Project, ContentPlan, ContentSlot, Rubric, PLATFORM_LABELS, Platform, TavilyResult } from '@/lib/types'
import { CalendarView } from '@/components/calendar/CalendarView'
import { SlotDrawer } from '@/components/slot/SlotDrawer'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ChevronLeft, Flame, Plus, Send, Users, Camera, X as XIcon, Video } from 'lucide-react'
import Link from 'next/link'

const platformIcons: Record<Platform, React.ElementType> = {
  telegram: Send,
  vk: Users,
  instagram: Camera,
  x: XIcon,
  youtube: Video,
}

interface Props {
  project: Project
  plans: ContentPlan[]
  activePlanId: string | null
  initialSlots: ContentSlot[]
  initialRubrics: Rubric[]
}

export function ProjectCalendarClient({
  project,
  plans,
  activePlanId: initialPlanId,
  initialSlots,
  initialRubrics,
}: Props) {
  const router = useRouter()
  const [activePlanId, setActivePlanId] = useState(initialPlanId)
  const [slots, setSlots] = useState<ContentSlot[]>(initialSlots)
  const [rubrics, setRubrics] = useState<Rubric[]>(initialRubrics)
  const [openSlot, setOpenSlot] = useState<ContentSlot | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [hotNews, setHotNews] = useState<TavilyResult[]>([])
  const [loadingNews, setLoadingNews] = useState(false)
  const [newsOpen, setNewsOpen] = useState(false)

  async function switchPlan(planId: string) {
    setLoadingPlan(true)
    setActivePlanId(planId)
    router.push(`/projects/${project.id}?plan=${planId}`, { scroll: false })

    try {
      const res = await fetch(`/api/plans/${planId}`)
      const data = await res.json()
      setSlots(data.slots ?? [])
      setRubrics(data.rubrics ?? [])
    } finally {
      setLoadingPlan(false)
    }
  }

  async function fetchHotNews() {
    setLoadingNews(true)
    setNewsOpen(true)
    try {
      const res = await fetch(`/api/search?niche=${encodeURIComponent(project.niche)}&type=news`)
      const data = await res.json()
      setHotNews(Array.isArray(data) ? data : [])
    } finally {
      setLoadingNews(false)
    }
  }

  function handleSlotUpdate(updated: ContentSlot) {
    setSlots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    setOpenSlot(updated)
  }

  const handleAddSlot = useCallback(
    async (date: Date) => {
      if (!activePlanId) return
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: activePlanId,
          date: dateStr,
          platform: project.platforms[0] ?? 'telegram',
          format: 'пост',
          status: 'idea',
        }),
      })
      const newSlot = await res.json()
      setSlots((prev) => [...prev, newSlot])
      setOpenSlot(newSlot)
    },
    [activePlanId, project.platforms]
  )

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-[#111111] border-r border-[#2a2a2a] flex flex-col">
        {/* Project info */}
        <div className="p-4 border-b border-[#2a2a2a]">
          <Link
            href="/projects"
            className="flex items-center gap-1.5 text-[#737373] hover:text-[#f5f5f5] text-xs mb-3 transition-colors"
          >
            <ChevronLeft size={12} />
            Все проекты
          </Link>
          <h2 className="text-sm font-semibold text-[#f5f5f5] truncate">{project.name}</h2>
          <p className="text-xs text-[#737373] mt-0.5 truncate">{project.niche}</p>

          <div className="flex items-center gap-1 mt-2">
            {project.platforms.map((p: Platform) => {
              const Icon = platformIcons[p]
              return (
                <div
                  key={p}
                  title={PLATFORM_LABELS[p]}
                  className="w-5 h-5 flex items-center justify-center rounded bg-[#1a1a1a] border border-[#2a2a2a]"
                >
                  <Icon size={10} className="text-[#737373]" />
                </div>
              )
            })}
          </div>
        </div>

        {/* Plans */}
        <div className="p-3 border-b border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#737373] uppercase tracking-wide">Планы</span>
            <Link href={`/projects/new`}>
              <button className="text-[#737373] hover:text-[#f5f5f5] transition-colors">
                <Plus size={12} />
              </button>
            </Link>
          </div>
          <div className="flex flex-col gap-1">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => switchPlan(plan.id)}
                className={[
                  'w-full text-left px-2 py-1.5 rounded text-xs transition-colors truncate',
                  activePlanId === plan.id
                    ? 'bg-[#1a1a1a] text-[#f5f5f5]'
                    : 'text-[#737373] hover:text-[#f5f5f5] hover:bg-[#1a1a1a]',
                ].join(' ')}
              >
                {plan.title}
              </button>
            ))}
          </div>
        </div>

        {/* Rubrics */}
        {rubrics.length > 0 && (
          <div className="p-3 border-b border-[#2a2a2a]">
            <span className="text-[10px] text-[#737373] uppercase tracking-wide block mb-2">Рубрики</span>
            <div className="flex flex-col gap-1">
              {rubrics.map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-xs text-[#737373]">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color ?? '#737373' }} />
                  <span className="truncate">{r.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hot news */}
        <div className="p-3 flex-1">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHotNews}
            loading={loadingNews}
            className="w-full"
          >
            <Flame size={12} />
            Горячие темы
          </Button>

          {newsOpen && hotNews.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              {hotNews.slice(0, 5).map((n, i) => (
                <a
                  key={i}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-[#737373] hover:text-[#f5f5f5] transition-colors leading-tight"
                >
                  {n.title}
                </a>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {loadingPlan ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size={24} />
          </div>
        ) : !activePlanId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <p className="text-sm text-[#737373] mb-4">Нет активных планов</p>
            <Link href="/projects/new">
              <Button size="sm">
                <Plus size={14} />
                Создать план
              </Button>
            </Link>
          </div>
        ) : (
          <CalendarView
            slots={slots}
            onSlotClick={setOpenSlot}
            onAddSlot={handleAddSlot}
          />
        )}
      </div>

      {/* Drawer */}
      <SlotDrawer
        slot={openSlot}
        rubrics={rubrics}
        onClose={() => setOpenSlot(null)}
        onUpdate={handleSlotUpdate}
      />
    </div>
  )
}
