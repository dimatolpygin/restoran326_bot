import { cacheGet, cacheSet, cacheDel } from './redis'
import type { RSSSource, FeedItem } from './types'

const RSSHUB_BASE = process.env.RSSHUB_BASE_URL ?? 'http://localhost:1200'
const TTL = 60 * 30 // 30 min

function extractFirstImage(html: string): string | undefined {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return m?.[1]
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
}

// JSON Feed 1.0/1.1 item shape (what RSSHub returns with ?format=json)
interface JsonFeedItem {
  id?: string
  url?: string
  title?: string
  content_html?: string
  content_text?: string
  image?: string                               // top-level image
  date_published?: string
  attachments?: Array<{ url: string; mime_type?: string }>
  // some RSSHub routes also include legacy rss-style fields
  link?: string
  description?: string
  pubDate?: string
  enclosure?: { url?: string }
}

export function cacheKeyForSource(source: RSSSource): string {
  const path =
    source.type === 'twitter'
      ? `/twitter/user/${source.handle}`
      : `/telegram/channel/${source.handle}`
  const url = `${RSSHUB_BASE}${path}?format=json`
  return `rsshub:${Buffer.from(url).toString('base64').slice(0, 64)}`
}

export async function invalidateSourceCache(source: RSSSource): Promise<void> {
  await cacheDel(cacheKeyForSource(source))
}

const ERROR_TTL = 30 // 30s for failed fetches

export interface FetchResult {
  items: FeedItem[]
  error?: string
}

export async function fetchSourceFeed(source: RSSSource): Promise<FetchResult> {
  const path =
    source.type === 'twitter'
      ? `/twitter/user/${source.handle}`
      : `/telegram/channel/${source.handle}`

  const url = `${RSSHUB_BASE}${path}?format=json`
  const cacheKey = cacheKeyForSource(source)

  const cached = await cacheGet(cacheKey)
  if (cached) return JSON.parse(cached) as FetchResult

  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  } catch {
    const result: FetchResult = { items: [], error: 'timeout' }
    await cacheSet(cacheKey, JSON.stringify(result), ERROR_TTL)
    return result
  }

  if (!res.ok) {
    const result: FetchResult = { items: [], error: `HTTP ${res.status}` }
    await cacheSet(cacheKey, JSON.stringify(result), ERROR_TTL)
    return result
  }

  let data: { items?: JsonFeedItem[]; error?: unknown }
  try {
    data = await res.json()
  } catch {
    const result: FetchResult = { items: [], error: 'invalid response' }
    await cacheSet(cacheKey, JSON.stringify(result), ERROR_TTL)
    return result
  }

  // RSSHub returns {"error":{...}} for failed routes even with status 200
  if (data.error) {
    const msg = (data.error as { message?: string })?.message ?? 'rsshub error'
    const result: FetchResult = { items: [], error: msg }
    await cacheSet(cacheKey, JSON.stringify(result), ERROR_TTL)
    return result
  }

  const rawItems: JsonFeedItem[] = data.items ?? []

  const items: FeedItem[] = rawItems.slice(0, 30).map((item, i) => {
    // Prefer JSON Feed fields, fall back to legacy RSS fields
    const html = item.content_html ?? item.description ?? ''
    const text = item.content_text ?? stripHtml(html)
    const link = item.url ?? item.link ?? ''
    const pubDate = item.date_published ?? item.pubDate ?? new Date().toISOString()

    // Image: top-level image > first attachment with image mime > <img> in HTML
    const firstImageAttachment = item.attachments?.find((a) =>
      a.mime_type?.startsWith('image/')
    )?.url
    const imageUrl =
      item.image ??
      firstImageAttachment ??
      item.enclosure?.url ??
      extractFirstImage(html)

    return {
      id: item.id ?? `${source.id}-${i}`,
      sourceId: source.id,
      sourceType: source.type,
      sourceHandle: source.handle,
      title: item.title ?? '',
      content: text.slice(0, 500),
      imageUrl,
      link,
      pubDate,
    }
  })

  const result: FetchResult = { items }
  await cacheSet(cacheKey, JSON.stringify(result), TTL)
  return result
}
