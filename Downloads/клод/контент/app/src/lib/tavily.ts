import { TavilyResult } from './types'
import { cacheGet, cacheSet } from './redis'

const TTL_24H = 86400
const TTL_1H = 3600

async function tavilySearch(params: {
  query: string
  search_depth?: 'basic' | 'advanced'
  topic?: 'general' | 'news'
  max_results?: number
}): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return []

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      api_key: apiKey,
      query: params.query,
      search_depth: params.search_depth ?? 'basic',
      topic: params.topic ?? 'general',
      max_results: params.max_results ?? 5,
      include_answer: false,
    }),
  })

  if (!res.ok) return []

  const data = await res.json()
  return (data.results ?? []) as TavilyResult[]
}

export async function cachedSearch(
  query: string,
  ttl: number,
  opts?: { search_depth?: 'basic' | 'advanced'; topic?: 'general' | 'news' }
): Promise<TavilyResult[]> {
  const key = `tavily:${Buffer.from(query).toString('base64').slice(0, 64)}`
  const cached = await cacheGet(key)
  if (cached) {
    try {
      return JSON.parse(cached)
    } catch {
      // ignore
    }
  }

  const results = await tavilySearch({ query, ...opts })
  await cacheSet(key, JSON.stringify(results), ttl)
  return results
}

export async function fetchNicheTrends(niche: string): Promise<TavilyResult[]> {
  const queries = [
    `${niche} тренды 2025`,
    `${niche} актуальные темы контент`,
    `${niche} новости маркетинг`,
  ]

  const results = await Promise.all(
    queries.map((q) => cachedSearch(q, TTL_24H))
  )

  return results.flat()
}

export async function fetchPostContext(topic: string, niche: string): Promise<TavilyResult[]> {
  const query = `${topic} ${niche}`
  return cachedSearch(query, TTL_24H, { search_depth: 'advanced' })
}

export async function fetchHotNews(niche: string): Promise<TavilyResult[]> {
  return cachedSearch(`${niche} новости`, TTL_1H, { topic: 'news' })
}

export function extractTopResults(results: TavilyResult[], count = 3, maxWords = 200): TavilyResult[] {
  return results
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, count)
    .map((r) => ({
      ...r,
      content: r.content
        .split(' ')
        .slice(0, maxWords)
        .join(' '),
    }))
}

export function resultsToContext(results: TavilyResult[]): string {
  if (!results.length) return ''
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`)
    .join('\n\n')
}
