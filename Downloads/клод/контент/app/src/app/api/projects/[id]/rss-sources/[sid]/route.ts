import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const { id, sid } = await params
  const supabase = createServerClient()

  const { error } = await supabase
    .from('rss_sources')
    .delete()
    .eq('id', sid)
    .eq('project_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
