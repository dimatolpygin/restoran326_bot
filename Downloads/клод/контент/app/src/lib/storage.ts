import { createServerClient } from './supabase'

const BUCKET = 'slot-attachments'

export async function uploadToStorage(
  slotId: string,
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<{ url: string; path: string }> {
  const supabase = createServerClient()
  const path = `${slotId}/${Date.now()}_${filename}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: mimeType,
    upsert: false,
  })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

export async function deleteFromStorage(path: string): Promise<void> {
  const supabase = createServerClient()
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw new Error(`Storage delete failed: ${error.message}`)
}
