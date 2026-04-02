'use client'

import { AIModel, AI_MODELS } from '@/lib/types'
import { Globe } from 'lucide-react'

interface ModelSelectorProps {
  model: AIModel
  onModelChange: (model: AIModel) => void
  useWebSearch: boolean
  onWebSearchChange: (value: boolean) => void
}

export function ModelSelector({ model, onModelChange, useWebSearch, onWebSearchChange }: ModelSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-[#737373] font-medium">Модель</label>
      <div className="flex flex-col gap-1">
        {AI_MODELS.map((m) => (
          <button
            key={m.id}
            onClick={() => onModelChange(m.id)}
            className={[
              'flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors',
              model === m.id
                ? 'border-[#6366f1] bg-[#6366f1]/10'
                : 'border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#111111]',
            ].join(' ')}
          >
            <div>
              <div className="text-xs font-medium text-[#f5f5f5]">{m.label}</div>
              <div className="text-[10px] text-[#737373]">{m.description}</div>
            </div>
            {model === m.id && (
              <div className="w-1.5 h-1.5 rounded-full bg-[#6366f1] shrink-0" />
            )}
          </button>
        ))}
      </div>

      <button
        onClick={() => onWebSearchChange(!useWebSearch)}
        className={[
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors mt-1',
          useWebSearch
            ? 'border-[#6366f1] bg-[#6366f1]/10 text-[#f5f5f5]'
            : 'border-[#2a2a2a] text-[#737373] hover:border-[#3a3a3a]',
        ].join(' ')}
      >
        <Globe size={13} />
        <span className="text-xs">Веб-поиск (Tavily)</span>
        <div className={[
          'ml-auto w-7 h-4 rounded-full transition-colors relative',
          useWebSearch ? 'bg-[#6366f1]' : 'bg-[#2a2a2a]',
        ].join(' ')}>
          <div className={[
            'absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform',
            useWebSearch ? 'translate-x-3.5' : 'translate-x-0.5',
          ].join(' ')} />
        </div>
      </button>
    </div>
  )
}
