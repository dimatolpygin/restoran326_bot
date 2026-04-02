interface WizardLayoutProps {
  step: number
  totalSteps: number
  title: string
  children: React.ReactNode
}

const STEP_LABELS = ['Бриф бренда', 'Параметры плана', 'Рубрики']

export function WizardLayout({ step, totalSteps, title, children }: WizardLayoutProps) {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={[
                'flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0',
                i + 1 === step
                  ? 'bg-[#6366f1] text-white'
                  : i + 1 < step
                  ? 'bg-[#6366f1]/30 text-[#6366f1]'
                  : 'bg-[#1a1a1a] text-[#737373]',
              ].join(' ')}>
                {i + 1}
              </div>
              <span className={[
                'text-xs hidden sm:block',
                i + 1 === step ? 'text-[#f5f5f5]' : 'text-[#737373]',
              ].join(' ')}>
                {STEP_LABELS[i]}
              </span>
              {i < totalSteps - 1 && (
                <div className={[
                  'flex-1 h-px',
                  i + 1 < step ? 'bg-[#6366f1]/40' : 'bg-[#2a2a2a]',
                ].join(' ')} />
              )}
            </div>
          ))}
        </div>
        <h1 className="text-xl font-semibold text-[#f5f5f5]">{title}</h1>
      </div>

      <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-6">
        {children}
      </div>
    </div>
  )
}
