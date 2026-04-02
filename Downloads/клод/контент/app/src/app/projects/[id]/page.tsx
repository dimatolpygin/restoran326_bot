import { createServerClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { ProjectCalendarClient } from './ProjectCalendarClient'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ plan?: string }>
}

export default async function ProjectPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { plan: planId } = await searchParams

  const supabase = createServerClient()

  const [{ data: project }, { data: plans }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase
      .from('content_plans')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!project) notFound()

  const activePlanId = planId ?? plans?.[0]?.id ?? null

  let slots = []
  let rubrics = []

  if (activePlanId) {
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from('content_slots').select('*').eq('plan_id', activePlanId).order('date'),
      supabase.from('rubrics').select('*').eq('plan_id', activePlanId),
    ])
    slots = s ?? []
    rubrics = r ?? []
  }

  return (
    <ProjectCalendarClient
      project={project}
      plans={plans ?? []}
      activePlanId={activePlanId}
      initialSlots={slots}
      initialRubrics={rubrics}
    />
  )
}
