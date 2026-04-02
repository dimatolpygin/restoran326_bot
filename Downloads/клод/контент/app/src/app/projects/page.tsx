import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import { Project, PLATFORM_LABELS, Platform } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Send, Users, Camera, Twitter, Youtube, Plus, FolderOpen } from 'lucide-react'

const platformIcons: Record<Platform, React.ElementType> = {
  telegram: Send,
  vk: Users,
  instagram: Camera,
  x: Twitter,
  youtube: Youtube,
}

async function getProjects(): Promise<Project[]> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
}

async function getPlanCounts(): Promise<Record<string, number>> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('content_plans')
    .select('project_id')
    .eq('status', 'active')

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.project_id] = (counts[row.project_id] ?? 0) + 1
  }
  return counts
}

export default async function ProjectsPage() {
  const [projects, planCounts] = await Promise.all([getProjects(), getPlanCounts()])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[#f5f5f5]">Проекты</h1>
          <p className="text-xs text-[#737373] mt-0.5">{projects.length} проектов</p>
        </div>
        <Link href="/projects/new">
          <Button size="sm">
            <Plus size={14} />
            Создать проект
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FolderOpen size={40} className="text-[#2a2a2a] mb-4" />
          <h2 className="text-sm font-medium text-[#f5f5f5] mb-1">Нет проектов</h2>
          <p className="text-xs text-[#737373] mb-4">Создайте первый контент-план для вашего бизнеса</p>
          <Link href="/projects/new">
            <Button size="sm">
              <Plus size={14} />
              Создать проект
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#3a3a3a] transition-colors cursor-pointer group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-[#f5f5f5] group-hover:text-white transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-xs text-[#737373] mt-0.5">{project.niche}</p>
                  </div>
                  <span className="text-[10px] text-[#737373] bg-[#1a1a1a] px-2 py-0.5 rounded border border-[#2a2a2a]">
                    {planCounts[project.id] ?? 0} планов
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {project.platforms.map((p: Platform) => {
                    const Icon = platformIcons[p]
                    return (
                      <div
                        key={p}
                        title={PLATFORM_LABELS[p]}
                        className="w-6 h-6 flex items-center justify-center rounded bg-[#1a1a1a] border border-[#2a2a2a]"
                      >
                        <Icon size={11} className="text-[#737373]" />
                      </div>
                    )
                  })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
