'use client'

import { useState, useEffect } from 'react'
import { ContentSlot, Rubric, SlotStatus, AIModel, TavilyResult } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ModelSelector } from './ModelSelector'
import { PostEditor } from './PostEditor'
import { X, Wand2 } from 'lucide-react'

interface SlotDrawerProps {
  slot: ContentSlot | null
  rubrics: Rubric[]
  onClose: () => void
  onUpdate: (updated: ContentSlot) => void
}

export function SlotDrawer({ slot, rubrics, onClose, onUpdate }: SlotDrawerProps) {
  const [model, setModel] = useState<AIModel>('gemini-2.5-flash-preview-04-17')
  const [useWebSearch, setUseWebSearch] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  const [topic, setTopic] = useState('')
  const [hook, setHook] = useState('')
  const [cta, setCta] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<SlotStatus>('idea')
  const [sources, setSources] = useState<TavilyResult[]>([])

  useEffect(() => {
    if (slot) {
      setTopic(slot.topic ?? '')
      setHook(slot.hook ?? '')
      setCta(slot.cta ?? '')
      setContent(slot.content ?? '')
      setStatus(slot.status)
      setSources((slot.sources as TavilyResult[]) ?? [])
    }
  }, [slot?.id])

  async function handleGenerate() {
    if (!slot) return
    setGenerating(true)
    try {
      const res = await fetch(`/api/slots/${slot.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, use_web_search: useWebSearch }),
      })
      const data = await res.json()
      if (res.ok) {
        setContent(data.slot.content ?? '')
        setStatus(data.slot.status)
        setSources(data.sources ?? [])
        onUpdate(data.slot)
      }
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!slot) return
    setSaving(true)
    try {
      const res = await fetch(`/api/slots/${slot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, hook, cta, content, status }),
      })
      const data = await res.json()
      if (res.ok) onUpdate(data)
    } finally {
      setSaving(false)
    }
  }

  if (!slot) return null

  const rubric = rubrics.find((r) => r.id === slot.rubric_id)
  const dateLabel = new Date(slot.date + 'T00:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long',
  })

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[420px] bg-[#111111] border-l border-[#2a2a2a] z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#737373]">{dateLabel}</span>
            <span className="text-xs text-[#3a3a3a]">·</span>
            <span className="text-xs text-[#737373] capitalize">{slot.platform}</span>
            {rubric && (
              <>
                <span className="text-xs text-[#3a3a3a]">·</span>
                <span className="text-xs" style={{ color: rubric.color ?? '#737373' }}>{rubric.name}</span>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#737373] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Fields */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#737373] font-medium">Тема</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Тема поста"
                className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#737373] focus:outline-none focus:border-[#6366f1] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#737373] font-medium">Крючок</label>
              <input
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                placeholder="Цепляющий первый абзац"
                className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#737373] focus:outline-none focus:border-[#6366f1] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#737373] font-medium">CTA</label>
              <input
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="Призыв к действию"
                className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#737373] focus:outline-none focus:border-[#6366f1] transition-colors"
              />
            </div>
          </div>

          {/* Model selector */}
          <ModelSelector
            model={model}
            onModelChange={setModel}
            useWebSearch={useWebSearch}
            onWebSearchChange={setUseWebSearch}
          />

          {/* Generate button */}
          <Button
            variant="primary"
            onClick={handleGenerate}
            loading={generating}
            className="w-full"
          >
            <Wand2 size={14} />
            {generating ? 'Генерирую...' : 'Написать пост'}
          </Button>

          {/* Post editor */}
          <PostEditor
            content={content}
            onChange={setContent}
            sources={sources}
          />
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-[#2a2a2a] px-4 py-3 flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SlotStatus)}
            className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-[#f5f5f5] focus:outline-none focus:border-[#6366f1] transition-colors"
          >
            <option value="idea">Идея</option>
            <option value="draft">Черновик</option>
            <option value="ready">Готово</option>
            <option value="published">Опубликовано</option>
          </select>

          <Badge status={status} />

          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            loading={saving}
            className="ml-auto"
          >
            Сохранить
          </Button>
        </div>
      </div>
    </>
  )
}
