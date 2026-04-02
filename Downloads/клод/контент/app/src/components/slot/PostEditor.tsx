'use client'

import { useState } from 'react'
import { TavilyResult } from '@/lib/types'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'

interface PostEditorProps {
  content: string
  onChange: (value: string) => void
  sources?: TavilyResult[]
}

export function PostEditor({ content, onChange, sources }: PostEditorProps) {
  const [sourcesOpen, setSourcesOpen] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-[#737373] font-medium">Текст поста</label>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Нажмите 'Написать пост' для генерации..."
        rows={12}
        className={[
          'bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-[#f5f5f5]',
          'placeholder:text-[#737373] resize-none',
          'focus:outline-none focus:border-[#6366f1] transition-colors',
          'leading-relaxed',
        ].join(' ')}
      />

      {sources && sources.length > 0 && (
        <div className="border border-[#2a2a2a] rounded-lg overflow-hidden">
          <button
            onClick={() => setSourcesOpen((o) => !o)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#737373] hover:bg-[#1a1a1a] transition-colors"
          >
            {sourcesOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Источники ({sources.length})
          </button>
          {sourcesOpen && (
            <div className="flex flex-col divide-y divide-[#2a2a2a] border-t border-[#2a2a2a]">
              {sources.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-[#6366f1] hover:bg-[#1a1a1a] transition-colors"
                >
                  <ExternalLink size={10} className="shrink-0" />
                  <span className="truncate">{s.title}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
