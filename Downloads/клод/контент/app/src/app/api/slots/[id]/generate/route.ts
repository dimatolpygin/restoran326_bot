import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { callModel } from '@/lib/cometapi'
import { buildPostPrompt } from '@/lib/prompts'
import { fetchPostContext, extractTopResults, resultsToContext } from '@/lib/tavily'
import { AIModel } from '@/lib/types'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()
  const body = await req.json()

  const model: AIModel = body.model ?? 'gemini-2.5-flash-preview-04-17'
  const useWebSearch: boolean = body.use_web_search ?? false

  // Fetch slot + plan + project + rubric
  const { data: slot, error: slotError } = await supabase
    .from('content_slots')
    .select('*, content_plans(*, projects(*))')
    .eq('id', id)
    .single()

  if (slotError) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })

  const plan = slot.content_plans
  const project = plan.projects

  let rubricName: string | undefined
  if (slot.rubric_id) {
    const { data: rubric } = await supabase
      .from('rubrics')
      .select('name')
      .eq('id', slot.rubric_id)
      .single()
    rubricName = rubric?.name
  }

  // Web search for post context
  let webContext = ''
  let sources: { title: string; url: string }[] = []

  if (useWebSearch && process.env.USE_WEB_SEARCH === 'true' && slot.topic) {
    try {
      const results = await fetchPostContext(slot.topic, project.niche)
      const top = extractTopResults(results, 3, 200)
      webContext = resultsToContext(top)
      sources = top.map((r: { title: string; url: string }) => ({ title: r.title, url: r.url }))
    } catch {
      // non-fatal
    }
  }

  // Build prompt & generate
  const { system, user } = buildPostPrompt(slot, project, rubricName, webContext)

  let content: string
  try {
    content = await callModel(
      model,
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { max_tokens: 2000 }
    )
  } catch (e) {
    return NextResponse.json({ error: `AI generation failed: ${e}` }, { status: 500 })
  }

  // Update slot
  const { data: updated, error: updateError } = await supabase
    .from('content_slots')
    .update({
      content,
      model_used: model,
      status: 'draft',
      sources: sources.length ? sources : null,
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ slot: updated, sources })
}
