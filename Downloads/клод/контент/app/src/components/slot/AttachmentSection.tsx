'use client'

import { useRef, useState } from 'react'
import { Upload, Sparkles, X, Loader2 } from 'lucide-react'
import { Attachment, ContentSlot } from '@/lib/types'
import { Button } from '@/components/ui/Button'

interface AttachmentSectionProps {
  slotId: string
  attachments: Attachment[]
  onUpdate: (slot: ContentSlot) => void
}

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:5'

const ASPECT_RATIOS: AspectRatio[] = ['1:1', '16:9', '9:16', '4:5']

export function AttachmentSection({ slotId, attachments, onUpdate }: AttachmentSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [showGenerateForm, setShowGenerateForm] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/slots/${slotId}/attachments`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      onUpdate(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(path: string) {
    setDeleting(path)
    setError(null)
    try {
      const res = await fetch(`/api/slots/${slotId}/attachments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Delete failed')
      onUpdate(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления')
    } finally {
      setDeleting(null)
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/slots/${slotId}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), aspect_ratio: aspectRatio }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      onUpdate(data)
      setShowGenerateForm(false)
      setPrompt('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка генерации')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs text-[#737373] font-medium">Вложения</label>

      {/* Action buttons */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#737373] border border-[#2a2a2a] hover:border-[#3a3a3a] hover:text-[#f5f5f5] transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          Загрузить
        </button>

        <button
          onClick={() => setShowGenerateForm((v) => !v)}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors',
            showGenerateForm
              ? 'border-[#6366f1] text-[#6366f1]'
              : 'border-[#2a2a2a] text-[#737373] hover:border-[#3a3a3a] hover:text-[#f5f5f5]',
          ].join(' ')}
        >
          <Sparkles size={13} />
          Сгенерировать
        </button>
      </div>

      {/* Generate form */}
      {showGenerateForm && (
        <div className="flex flex-col gap-2 p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Промпт для изображения..."
            rows={3}
            className="bg-transparent text-sm text-[#f5f5f5] placeholder:text-[#737373] focus:outline-none resize-none"
          />
          <div className="flex items-center gap-2">
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              className="bg-[#111111] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs text-[#f5f5f5] focus:outline-none focus:border-[#6366f1]"
            >
              {ASPECT_RATIOS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerate}
              loading={generating}
              className="ml-auto"
            >
              {generating ? 'Генерирую...' : 'Генерировать'}
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {/* Image grid */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {attachments.map((a) => (
            <div key={a.path} className="relative group rounded-lg overflow-hidden bg-[#0a0a0a] border border-[#2a2a2a]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url}
                alt={a.name}
                className="w-full aspect-square object-cover"
              />
              <button
                onClick={() => handleDelete(a.path)}
                disabled={deleting === a.path}
                className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
              >
                {deleting === a.path
                  ? <Loader2 size={12} className="animate-spin" />
                  : <X size={12} />
                }
              </button>
              {a.type === 'generated' && (
                <span className="absolute bottom-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[#6366f1]/80 text-white">
                  <Sparkles size={9} />
                  AI
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
