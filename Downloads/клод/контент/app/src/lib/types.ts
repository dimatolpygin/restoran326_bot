export type Platform = 'telegram' | 'vk' | 'instagram' | 'x' | 'youtube'
export type Tone = 'expert' | 'friendly' | 'sales'
export type SlotStatus = 'idea' | 'draft' | 'ready' | 'published'
export type AIModel = 'gemini-2.5-flash-preview-04-17' | 'claude-haiku-4-5-20251001' | 'gemini-2.5-flash-lite'
export type PlanStatus = 'active' | 'archived'

export interface Project {
  id: string
  name: string
  niche: string
  product: string
  target_audience: string
  tone: Tone
  platforms: Platform[]
  created_at: string
  updated_at: string
}

export interface ContentPlan {
  id: string
  project_id: string
  title: string
  date_from: string
  date_to: string
  posts_per_day: number
  status: PlanStatus
  created_at: string
  updated_at: string
}

export interface Rubric {
  id: string
  plan_id: string
  name: string
  description?: string
  color?: string
  created_at: string
}

export interface Attachment {
  url: string
  path: string
  name: string
  uploaded_at: string
  type: 'uploaded' | 'generated'
}

export interface ContentSlot {
  id: string
  plan_id: string
  rubric_id?: string | null
  date: string
  platform: Platform
  format: string
  topic?: string | null
  hook?: string | null
  cta?: string | null
  content?: string | null
  model_used?: string | null
  status: SlotStatus
  sources?: TavilyResult[] | null
  attachments?: Attachment[]
  created_at: string
  updated_at: string
}

export interface TavilyResult {
  title: string
  url: string
  content: string
  score?: number
}

export interface AIModelOption {
  id: AIModel
  label: string
  description: string
}

export const AI_MODELS: AIModelOption[] = [
  {
    id: 'gemini-2.5-flash-preview-04-17',
    label: 'Gemini 2.5 Flash',
    description: 'Быстрый и мощный',
  },
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Claude Haiku 4.5',
    description: 'Точный и краткий',
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash-Lite',
    description: 'Экономичный',
  },
]

export const PLATFORM_LABELS: Record<Platform, string> = {
  telegram: 'Telegram',
  vk: 'ВКонтакте',
  instagram: 'Instagram',
  x: 'X',
  youtube: 'YouTube',
}

export interface RSSSource {
  id: string
  project_id: string
  type: 'twitter' | 'telegram'
  handle: string
  name?: string
  created_at: string
}

export interface FeedItem {
  id: string
  sourceId: string
  sourceType: 'twitter' | 'telegram'
  sourceHandle: string
  title: string
  content: string
  imageUrl?: string
  link: string
  pubDate: string
}

export const RUBRIC_PRESETS = [
  { name: 'Польза', description: 'Полезные советы, гайды, инструкции', color: '#3b82f6' },
  { name: 'Кейсы', description: 'Истории успеха, кейсы клиентов', color: '#8b5cf6' },
  { name: 'Продажи', description: 'Продающие посты, офферы', color: '#ef4444' },
  { name: 'Лайфстайл', description: 'Закулисье, команда, ценности', color: '#f59e0b' },
  { name: 'Вовлечение', description: 'Опросы, вопросы, дискуссии', color: '#10b981' },
]
