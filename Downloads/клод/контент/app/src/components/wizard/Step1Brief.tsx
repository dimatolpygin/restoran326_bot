'use client'

import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Tone } from '@/lib/types'

interface Step1Data {
  name: string
  niche: string
  product: string
  target_audience: string
  tone: Tone
}

interface Step1BriefProps {
  data: Step1Data
  onChange: (data: Step1Data) => void
  onNext: () => void
}

const toneOptions: { value: Tone; label: string; desc: string }[] = [
  { value: 'expert', label: 'Экспертный', desc: 'Авторитет и факты' },
  { value: 'friendly', label: 'Дружелюбный', desc: 'Разговорный стиль' },
  { value: 'sales', label: 'Продающий', desc: 'Фокус на конверсии' },
]

export function Step1Brief({ data, onChange, onNext }: Step1BriefProps) {
  const set = (key: keyof Step1Data, val: string) => onChange({ ...data, [key]: val })

  const isValid = data.name && data.niche && data.product && data.target_audience

  return (
    <div className="flex flex-col gap-5">
      <Input
        label="Название проекта"
        placeholder="Например: Кофейня Roast"
        value={data.name}
        onChange={(e) => set('name', e.target.value)}
      />

      <Input
        label="Ниша / сфера бизнеса"
        placeholder="Например: кофейни, IT-продукт, фитнес"
        value={data.niche}
        onChange={(e) => set('niche', e.target.value)}
      />

      <Textarea
        label="Продукт или услуга"
        placeholder="Что вы предлагаете клиентам?"
        rows={3}
        value={data.product}
        onChange={(e) => set('product', e.target.value)}
      />

      <Textarea
        label="Целевая аудитория"
        placeholder="Кто ваши клиенты? Возраст, интересы, боли..."
        rows={3}
        value={data.target_audience}
        onChange={(e) => set('target_audience', e.target.value)}
      />

      <div className="flex flex-col gap-2">
        <label className="text-xs text-[#737373] font-medium">Тон коммуникации</label>
        <div className="grid grid-cols-3 gap-2">
          {toneOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => set('tone', opt.value)}
              className={[
                'flex flex-col items-start p-3 rounded-lg border transition-colors text-left',
                data.tone === opt.value
                  ? 'border-[#6366f1] bg-[#6366f1]/10'
                  : 'border-[#2a2a2a] hover:border-[#3a3a3a]',
              ].join(' ')}
            >
              <span className="text-xs font-medium text-[#f5f5f5]">{opt.label}</span>
              <span className="text-[10px] text-[#737373] mt-0.5">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <Button onClick={onNext} disabled={!isValid} className="mt-2">
        Далее
      </Button>
    </div>
  )
}
