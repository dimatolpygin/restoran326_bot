import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { uploadToStorage } from '@/lib/storage'
import { Attachment } from '@/lib/types'

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:5'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = createServerClient()

  const { prompt, aspect_ratio } = (await request.json()) as {
    prompt: string
    aspect_ratio: AspectRatio
  }

  if (!prompt) {
    return NextResponse.json({ error: 'No prompt provided' }, { status: 400 })
  }

  const apiKey = process.env.COMETAPI_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'COMETAPI_KEY not set' }, { status: 500 })
  }

  const response = await fetch(
    'https://api.cometapi.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio: aspect_ratio },
        },
      }),
    },
  )

  if (!response.ok) {
    const errText = await response.text()
    return NextResponse.json({ error: `CometAPI error: ${errText}` }, { status: 502 })
  }

  const result = await response.json()
  const parts = result?.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find(
    (p: { inlineData?: { data: string; mimeType?: string } }) => p.inlineData?.data,
  )

  if (!imagePart) {
    return NextResponse.json({ error: 'No image in response' }, { status: 502 })
  }

  const buffer = Buffer.from(imagePart.inlineData.data, 'base64')
  const { url, path } = await uploadToStorage(id, buffer, 'generated.png', 'image/png')

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
    name: `generated_${Date.now()}.png`,
    uploaded_at: new Date().toISOString(),
    type: 'generated',
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
