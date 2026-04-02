import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { uploadToStorage, deleteFromStorage } from '@/lib/storage'
import { Attachment } from '@/lib/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = createServerClient()

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const { url, path } = await uploadToStorage(id, buffer, file.name, file.type)

  const { data: slot, error: fetchError } = await supabase
    .from('content_slots')
    .select('attachments')
    .eq('id', id)
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  const existing: Attachment[] = slot.attachments ?? []
  const newAttachment: Attachment = {
    url,
    path,
    name: file.name,
    uploaded_at: new Date().toISOString(),
    type: 'uploaded',
  }

  const { data: updated, error: updateError } = await supabase
    .from('content_slots')
    .update({ attachments: [...existing, newAttachment] })
    .eq('id', id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = createServerClient()

  const { path } = await request.json()
  if (!path) {
    return NextResponse.json({ error: 'No path provided' }, { status: 400 })
  }

  await deleteFromStorage(path)

  const { data: slot, error: fetchError } = await supabase
    .from('content_slots')
    .select('attachments')
    .eq('id', id)
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  const existing: Attachment[] = slot.attachments ?? []
  const filtered = existing.filter((a) => a.path !== path)

  const { data: updated, error: updateError } = await supabase
    .from('content_slots')
    .update({ attachments: filtered })
    .eq('id', id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json(updated)
}
