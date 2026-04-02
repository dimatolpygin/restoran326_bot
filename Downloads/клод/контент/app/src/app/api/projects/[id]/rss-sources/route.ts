import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('rss_sources')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()

  const body = await req.json()
  const { type, handle, name } = body

  if (!type || !handle) {
    return NextResponse.json({ error: 'type and handle are required' }, { status: 400 })
  }
  if (type !== 'twitter' && type !== 'telegram') {
    return NextResponse.json({ error: 'type must be twitter or telegram' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('rss_sources')
    .insert({ project_id: id, type, handle: handle.replace(/^@/, ''), name: name ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
