import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { deleteFromStorage } from '@/lib/storage'
import { Attachment } from '@/lib/types'

export async function POST() {
  const supabase = createServerClient()

  const { data: slots, error } = await supabase
    .from('content_slots')
    .select('id, attachments')
    .not('attachments', 'eq', '[]')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)

  let deleted = 0

  for (const slot of slots ?? []) {
    const attachments: Attachment[] = slot.attachments ?? []
    const old = attachments.filter((a) => new Date(a.uploaded_at) < cutoff)
    if (old.length === 0) continue

    for (const a of old) {
      try {
        await deleteFromStorage(a.path)
        deleted++
      } catch {
        // continue on individual failures
      }
    }

    const remaining = attachments.filter((a) => new Date(a.uploaded_at) >= cutoff)
    await supabase
      .from('content_slots')
      .update({ attachments: remaining })
      .eq('id', slot.id)
  }

  return NextResponse.json({ deleted })
}
