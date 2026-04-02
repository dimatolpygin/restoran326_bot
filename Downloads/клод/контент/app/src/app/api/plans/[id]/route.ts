import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()

  const [{ data: plan, error: planError }, { data: slots, error: slotsError }, { data: rubrics, error: rubricsError }] =
    await Promise.all([
      supabase.from('content_plans').select('*').eq('id', id).single(),
      supabase.from('content_slots').select('*').eq('plan_id', id).order('date'),
      supabase.from('rubrics').select('*').eq('plan_id', id),
    ])

  if (planError) return NextResponse.json({ error: planError.message }, { status: 404 })
  if (slotsError) return NextResponse.json({ error: slotsError.message }, { status: 500 })
  if (rubricsError) return NextResponse.json({ error: rubricsError.message }, { status: 500 })

  return NextResponse.json({ plan, slots, rubrics })
}
