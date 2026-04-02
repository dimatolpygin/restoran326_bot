import { Project, Rubric, ContentSlot, Platform, Tone } from './types'

// ─── Plan Skeleton ───────────────────────────────────────────────────────────

export function buildPlanSkeletonPrompt(
  project: Project,
  rubrics: Pick<Rubric, 'name' | 'description'>[],
  params: {
    dateFrom: string
    dateTo: string
    postsPerDay: number
    platforms: Platform[]
  },
  trendsContext?: string
): { system: string; user: string } {
  const toneMap: Record<Tone, string> = {
    expert: 'экспертный и авторитетный',
    friendly: 'дружелюбный и разговорный',
    sales: 'продающий и убедительный',
  }

  const system = `Ты опытный контент-стратег с 10-летним опытом. Твоя задача — создавать детальные контент-планы для бизнеса в социальных сетях. Ты всегда отвечаешь строго в формате JSON без лишних пояснений.`

  const rubricsList = rubrics.map((r) => `- ${r.name}: ${r.description ?? ''}`).join('\n')
  const platformsList = params.platforms.join(', ')
  const trendsSection = trendsContext
    ? `\n\nАктуальные тренды и темы в нише:\n${trendsContext}`
    : ''

  const user = `Создай контент-план для бизнеса.

БРИФ БРЕНДА:
- Название: ${project.name}
- Ниша: ${project.niche}
- Продукт/услуга: ${project.product}
- Целевая аудитория: ${project.target_audience}
- Тон коммуникации: ${toneMap[project.tone]}

ПАРАМЕТРЫ ПЛАНА:
- Период: с ${params.dateFrom} по ${params.dateTo}
- Платформы: ${platformsList}
- Постов в день: ${params.postsPerDay}

РУБРИКИ:
${rubricsList}
${trendsSection}

Верни JSON строго в следующем формате (без markdown, без пояснений):
{
  "slots": [
    {
      "date": "YYYY-MM-DD",
      "platform": "telegram|vk|instagram|x|youtube",
      "rubric": "название рубрики из списка",
      "format": "пост|карусель|видео|сторис|рилс|статья",
      "topic": "конкретная тема поста",
      "hook": "цепляющий первый абзац/крючок",
      "cta": "призыв к действию"
    }
  ]
}

Распредели посты равномерно по датам, платформам и рубрикам. Темы должны быть конкретными, актуальными и релевантными нише.`

  return { system, user }
}

// ─── Post Generation ─────────────────────────────────────────────────────────

const PLATFORM_INSTRUCTIONS: Record<Platform, string> = {
  telegram: `Формат Telegram-поста:
- Длина: 500-1500 символов
- Используй жирный текст **вот так** для акцентов
- Параграфы разделяй пустой строкой
- В конце добавь 3-5 тематических хэштегов`,

  vk: `Формат поста ВКонтакте:
- Длина: 500-2000 символов
- Первые 2-3 предложения — главная мысль (видна до кнопки "показать полностью")
- Параграфы разделяй пустой строкой
- В конце добавь 5-7 хэштегов`,

  instagram: `Формат Instagram-поста:
- Длина: 300-1000 символов
- Начни с мощного крючка в первой строке
- Используй эмодзи умеренно для структуры
- В конце добавь 10-15 хэштегов`,

  x: `Формат поста X (Twitter):
- Длина: максимум 280 символов (или тред)
- Краткость и удар — в первых 5 словах
- Если тред — разбей на части 1/N
- 1-2 хэштега максимум`,

  youtube: `Формат описания YouTube:
- Длина: 500-1000 символов
- Первые 2-3 строки — SEO-описание
- Тайм-коды если есть
- В конце ссылки и хэштеги`,
}

const TONE_INSTRUCTIONS: Record<Tone, string> = {
  expert: 'Пиши экспертно и авторитетно. Опирайся на факты и опыт. Избегай воды и общих фраз.',
  friendly: 'Пиши дружелюбно и разговорно, как будто разговариваешь с другом. Используй "ты" и простой язык.',
  sales: 'Пиши убедительно и продающе. Акцентируй на выгодах для клиента. Создавай ощущение срочности.',
}

export function buildPostPrompt(
  slot: ContentSlot,
  project: Project,
  rubricName?: string,
  webContext?: string
): { system: string; user: string } {
  const system = `Ты профессиональный SMM-специалист и копирайтер. Ты пишешь посты для социальных сетей, которые получают высокий охват и вовлечённость. Ты понимаешь специфику каждой платформы и пишешь строго под неё.`

  const platformInstructions = PLATFORM_INSTRUCTIONS[slot.platform]
  const toneInstruction = TONE_INSTRUCTIONS[project.tone]
  const webSection = webContext
    ? `\n\nАктуальный контекст из интернета:\n${webContext}`
    : ''

  const user = `Напиши пост для ${project.name}.

ПАРАМЕТРЫ ПОСТА:
- Платформа: ${slot.platform}
- Рубрика: ${rubricName ?? 'Общая'}
- Тема: ${slot.topic ?? 'На усмотрение'}
- Формат: ${slot.format}
${slot.hook ? `- Крючок/идея: ${slot.hook}` : ''}
${slot.cta ? `- Призыв к действию: ${slot.cta}` : ''}

БРЕНД:
- Ниша: ${project.niche}
- Продукт: ${project.product}
- Аудитория: ${project.target_audience}
- Тон: ${toneInstruction}
${webSection}

${platformInstructions}

Верни только текст поста, готовый к публикации. Без заголовка "Пост:", без пояснений, без кавычек вокруг текста.`

  return { system, user }
}
