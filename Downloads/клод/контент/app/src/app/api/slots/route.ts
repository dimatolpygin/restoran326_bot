import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const supabase = createServerClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('content_slots')
    .insert({
      plan_id: body.plan_id,
      rubric_id: body.rubric_id ?? null,
      date: body.date,
      platform: body.platform,
      format: body.format ?? 'пост',
      topic: body.topic ?? null,
      hook: body.hook ?? null,
      cta: body.cta ?? null,
      status: 'idea',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
