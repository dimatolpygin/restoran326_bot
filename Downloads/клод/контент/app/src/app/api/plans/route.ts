import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { callModel } from '@/lib/cometapi'
import { buildPlanSkeletonPrompt } from '@/lib/prompts'
import { fetchNicheTrends, extractTopResults, resultsToContext } from '@/lib/tavily'

export async function POST(req: Request) {
  const supabase = createServerClient()
  const body = await req.json()

  const { project_id, title, date_from, date_to, posts_per_day, platforms, rubrics: rubricInputs, use_web_search } = body

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', project_id)
    .single()

  if (projectError) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // Create plan
  const { data: plan, error: planError } = await supabase
    .from('content_plans')
    .insert({ project_id, title, date_from, date_to, posts_per_day })
    .select()
    .single()

  if (planError) return NextResponse.json({ error: planError.message }, { status: 500 })

  // Insert rubrics
  const rubricRows = rubricInputs.map((r: { name: string; description?: string; color?: string }) => ({
    plan_id: plan.id,
    name: r.name,
    description: r.description,
    color: r.color,
  }))

  const { data: rubrics, error: rubricError } = await supabase
    .from('rubrics')
    .insert(rubricRows)
    .select()

  if (rubricError) return NextResponse.json({ error: rubricError.message }, { status: 500 })

  // Web search for trends
  let trendsContext = ''
  if (use_web_search && process.env.USE_WEB_SEARCH === 'true') {
    try {
      const trends = await fetchNicheTrends(project.niche)
      const top = extractTopResults(trends, 5, 150)
      trendsContext = resultsToContext(top)
    } catch {
      // non-fatal
    }
  }

  // Build prompt & call AI
  const { system, user } = buildPlanSkeletonPrompt(
    project,
    rubricInputs,
    { dateFrom: date_from, dateTo: date_to, postsPerDay: posts_per_day, platforms },
    trendsContext
  )

  let slots: Array<{
    date: string
    platform: string
    rubric: string
    format: string
    topic: string
    hook: string
    cta: string
  }> = []

  try {
    const response = await callModel(
      'gemini-2.5-flash-lite',
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { max_tokens: 4000 }
    )

    // Strip markdown code fences if model wrapped the JSON
    const cleaned = response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(cleaned)
    slots = parsed.slots ?? []
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[plans] AI generation failed:', msg)
    return NextResponse.json({ error: `AI generation failed: ${msg}` }, { status: 500 })
  }

  // Build rubric name → id map
  const rubricMap = new Map<string, string>()
  rubrics!.forEach((r: { id: string; name: string }) => rubricMap.set(r.name, r.id))

  // Insert slots
  const slotRows = slots.map((s) => ({
    plan_id: plan.id,
    rubric_id: rubricMap.get(s.rubric) ?? null,
    date: s.date,
    platform: s.platform,
    format: s.format ?? 'пост',
    topic: s.topic,
    hook: s.hook,
    cta: s.cta,
    status: 'idea',
  }))

  const { data: insertedSlots, error: slotsError } = await supabase
    .from('content_slots')
    .insert(slotRows)
    .select()

  if (slotsError) return NextResponse.json({ error: slotsError.message }, { status: 500 })

  return NextResponse.json({ plan, slots: insertedSlots, rubrics }, { status: 201 })
}
