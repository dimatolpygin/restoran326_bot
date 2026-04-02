'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { RUBRIC_PRESETS } from '@/lib/types'
import { Plus, X } from 'lucide-react'

interface RubricInput {
  name: string
  description: string
  color: string
}

interface Step3RubricsProps {
  projectId?: string
  planParams: {
    name: string
    niche: string
    product: string
    target_audience: string
    tone: string
    platforms: string[]
    date_from: string
    date_to: string
    posts_per_day: number
  }
  onBack: () => void
  onSubmit: (rubrics: RubricInput[]) => Promise<void>
  submitting: boolean
}

export function Step3Rubrics({ planParams, onBack, onSubmit, submitting }: Step3RubricsProps) {
  const [rubrics, setRubrics] = useState<RubricInput[]>(
    RUBRIC_PRESETS.slice(0, 3).map((p) => ({ name: p.name, description: p.description, color: p.color }))
  )
  const [customName, setCustomName] = useState('')
  const [useWebSearch, setUseWebSearch] = useState(true)

  function togglePreset(preset: (typeof RUBRIC_PRESETS)[number]) {
    const exists = rubrics.some((r) => r.name === preset.name)
    if (exists) {
      setRubrics(rubrics.filter((r) => r.name !== preset.name))
    } else {
      setRubrics([...rubrics, { name: preset.name, description: preset.description, color: preset.color }])
    }
  }

  function addCustom() {
    if (!customName.trim()) return
    setRubrics([...rubrics, { name: customName.trim(), description: '', color: '#6366f1' }])
    setCustomName('')
  }

  function removeRubric(index: number) {
    setRubrics(rubrics.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="text-xs text-[#737373] font-medium">Пресеты рубрик</label>
        <div className="flex flex-wrap gap-2">
          {RUBRIC_PRESETS.map((preset) => {
            const active = rubrics.some((r) => r.name === preset.name)
            return (
              <button
                key={preset.name}
                onClick={() => togglePreset(preset)}
                className={[
                  'px-3 py-1.5 rounded-lg border text-xs transition-colors',
                  active
                    ? 'border-[#6366f1] bg-[#6366f1]/10 text-[#f5f5f5]'
                    : 'border-[#2a2a2a] text-[#737373] hover:border-[#3a3a3a]',
                ].join(' ')}
              >
                {preset.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected rubrics */}
      {rubrics.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[#737373] font-medium">Выбранные рубрики ({rubrics.length})</label>
          <div className="flex flex-wrap gap-2">
            {rubrics.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a]"
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                <span className="text-xs text-[#f5f5f5]">{r.name}</span>
                <button
                  onClick={() => removeRubric(i)}
                  className="text-[#737373] hover:text-[#f5f5f5] transition-colors ml-0.5"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add custom */}
      <div className="flex gap-2">
        <Input
          placeholder="Своя рубрика"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustom()}
          className="flex-1"
        />
        <Button variant="outline" onClick={addCustom} size="md">
          <Plus size={14} />
        </Button>
      </div>

      {/* Web search toggle */}
      <button
        onClick={() => setUseWebSearch((v) => !v)}
        className={[
          'flex items-center justify-between px-4 py-3 rounded-lg border transition-colors',
          useWebSearch ? 'border-[#6366f1] bg-[#6366f1]/10' : 'border-[#2a2a2a] hover:border-[#3a3a3a]',
        ].join(' ')}
      >
        <div className="text-left">
          <div className="text-xs font-medium text-[#f5f5f5]">Учитывать веб-тренды</div>
          <div className="text-[10px] text-[#737373] mt-0.5">Tavily добавит актуальный контекст к плану</div>
        </div>
        <div className={[
          'w-8 h-4.5 rounded-full transition-colors relative shrink-0',
          useWebSearch ? 'bg-[#6366f1]' : 'bg-[#2a2a2a]',
        ].join(' ')}>
          <div className={[
            'absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform',
            useWebSearch ? 'translate-x-4' : 'translate-x-0.5',
          ].join(' ')} />
        </div>
      </button>

      <div className="flex gap-3 mt-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Назад
        </Button>
        <Button
          onClick={() => onSubmit(rubrics)}
          disabled={rubrics.length === 0}
          loading={submitting}
          className="flex-1"
        >
          {submitting ? 'Генерирую план...' : 'Сгенерировать план'}
        </Button>
      </div>
    </div>
  )
}
