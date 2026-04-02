import { cacheGet, cacheSet } from './redis'
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

export async function fetchSourceFeed(source: RSSSource): Promise<FeedItem[]> {
  const path =
    source.type === 'twitter'
      ? `/twitter/user/${source.handle}`
      : `/telegram/channel/${source.handle}`

  const url = `${RSSHUB_BASE}${path}?format=json`
  const cacheKey = `rsshub:${Buffer.from(url).toString('base64').slice(0, 64)}`

  const cached = await cacheGet(cacheKey)
  if (cached) return JSON.parse(cached) as FeedItem[]

  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  } catch {
    return []
  }

  if (!res.ok) return []

  let data: { items?: unknown[] }
  try {
    data = await res.json()
  } catch {
    return []
  }

  const items: FeedItem[] = ((data.items ?? []) as Record<string, unknown>[])
    .slice(0, 30)
    .map((item, i) => ({
      id: `${source.id}-${i}`,
      sourceId: source.id,
      sourceType: source.type,
      sourceHandle: source.handle,
      title: (item.title as string) ?? '',
      content: stripHtml((item.description as string) ?? (item.title as string) ?? ''),
      imageUrl:
        (item.enclosure as { url?: string } | undefined)?.url ??
        extractFirstImage((item.description as string) ?? ''),
      link: (item.link as string) ?? '',
      pubDate: (item.pubDate as string) ?? new Date().toISOString(),
    }))

  await cacheSet(cacheKey, JSON.stringify(items), TTL)
  return items
}
