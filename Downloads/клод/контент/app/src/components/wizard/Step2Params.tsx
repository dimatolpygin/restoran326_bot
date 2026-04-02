'use client'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Platform, PLATFORM_LABELS } from '@/lib/types'
import { Send, Users, Camera, X as XIcon, Video } from 'lucide-react'

const PLATFORMS: { value: Platform; icon: React.ElementType }[] = [
  { value: 'telegram', icon: Send },
  { value: 'vk', icon: Users },
  { value: 'instagram', icon: Camera },
  { value: 'x', icon: XIcon },
  { value: 'youtube', icon: Video },
]

interface Step2Data {
  date_from: string
  date_to: string
  platforms: Platform[]
  posts_per_day: number
}

interface Step2ParamsProps {
  data: Step2Data
  onChange: (data: Step2Data) => void
  onNext: () => void
  onBack: () => void
}

export function Step2Params({ data, onChange, onNext, onBack }: Step2ParamsProps) {
  const set = <K extends keyof Step2Data>(key: K, val: Step2Data[K]) =>
    onChange({ ...data, [key]: val })

  function togglePlatform(p: Platform) {
    const current = data.platforms
    if (current.includes(p)) {
      set('platforms', current.filter((x) => x !== p))
    } else {
      set('platforms', [...current, p])
    }
  }

  const isValid = data.date_from && data.date_to && data.platforms.length > 0

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Дата начала"
          type="date"
          value={data.date_from}
          onChange={(e) => set('date_from', e.target.value)}
        />
        <Input
          label="Дата окончания"
          type="date"
          value={data.date_to}
          onChange={(e) => set('date_to', e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-[#737373] font-medium">Платформы</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(({ value, icon: Icon }) => {
            const active = data.platforms.includes(value)
            return (
              <button
                key={value}
                onClick={() => togglePlatform(value)}
                className={[
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors',
                  active
                    ? 'border-[#6366f1] bg-[#6366f1]/10 text-[#f5f5f5]'
                    : 'border-[#2a2a2a] text-[#737373] hover:border-[#3a3a3a]',
                ].join(' ')}
              >
                <Icon size={12} />
                {PLATFORM_LABELS[value]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-[#737373] font-medium">
          Постов в день: <span className="text-[#f5f5f5]">{data.posts_per_day}</span>
        </label>
        <input
          type="range"
          min={1}
          max={3}
          value={data.posts_per_day}
          onChange={(e) => set('posts_per_day', Number(e.target.value))}
          className="w-full accent-[#6366f1]"
        />
        <div className="flex justify-between text-[10px] text-[#737373]">
          <span>1</span>
          <span>2</span>
          <span>3</span>
        </div>
      </div>

      <div className="flex gap-3 mt-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Назад
        </Button>
        <Button onClick={onNext} disabled={!isValid} className="flex-1">
          Далее
        </Button>
      </div>
    </div>
  )
}
