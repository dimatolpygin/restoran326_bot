'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WizardLayout } from '@/components/wizard/WizardLayout'
import { Step1Brief } from '@/components/wizard/Step1Brief'
import { Step2Params } from '@/components/wizard/Step2Params'
import { Step3Rubrics } from '@/components/wizard/Step3Rubrics'
import { Tone, Platform } from '@/lib/types'

const STEP_TITLES = ['Расскажите о бренде', 'Параметры контент-плана', 'Рубрики контента']

export default function NewProjectPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const today = new Date()
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())

  const [step1, setStep1] = useState({
    name: '',
    niche: '',
    product: '',
    target_audience: '',
    tone: 'friendly' as Tone,
  })

  const [step2, setStep2] = useState({
    date_from: today.toISOString().slice(0, 10),
    date_to: nextMonth.toISOString().slice(0, 10),
    platforms: ['telegram'] as Platform[],
    posts_per_day: 1,
  })

  async function handleSubmit(rubrics: { name: string; description: string; color: string }[]) {
    setSubmitting(true)
    try {
      // Create project
      const projectRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: step1.name,
          niche: step1.niche,
          product: step1.product,
          target_audience: step1.target_audience,
          tone: step1.tone,
          platforms: step2.platforms,
        }),
      })

      if (!projectRes.ok) throw new Error('Failed to create project')
      const project = await projectRes.json()

      // Generate plan
      const planRes = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          title: `${step1.name} — ${step2.date_from}`,
          date_from: step2.date_from,
          date_to: step2.date_to,
          posts_per_day: step2.posts_per_day,
          platforms: step2.platforms,
          rubrics,
          use_web_search: true,
        }),
      })

      if (!planRes.ok) throw new Error('Failed to generate plan')
      const { plan } = await planRes.json()

      router.push(`/projects/${project.id}?plan=${plan.id}`)
    } catch (e) {
      console.error(e)
      setSubmitting(false)
    }
  }

  return (
    <WizardLayout step={step} totalSteps={3} title={STEP_TITLES[step - 1]}>
      {step === 1 && (
        <Step1Brief
          data={step1}
          onChange={setStep1}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <Step2Params
          data={step2}
          onChange={setStep2}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <Step3Rubrics
          planParams={{ ...step1, ...step2 }}
          onBack={() => setStep(2)}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
    </WizardLayout>
  )
}
