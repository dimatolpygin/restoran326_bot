import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { fetchSourceFeed, invalidateSourceCache } from '@/lib/rsshub'
import type { RSSSource, FeedItem } from '@/lib/types'

interface NewsResponse {
  items: FeedItem[]
  sourceErrors: Record<string, string>
}

function getPeriodCutoff(period: string): Date | null {
  const now = new Date()
  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    case '3d': {
      const d = new Date(now)
      d.setDate(d.getDate() - 3)
      return d
    }
    case 'week': {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      return d
    }
    case 'month': {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 1)
      return d
    }
    default:
      return null
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') ?? 'week'
  const sourceFilter = searchParams.get('source') ?? 'all'

  const supabase = createServerClient()
  const { data: sources, error } = await supabase
    .from('rss_sources')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!sources || sources.length === 0) return NextResponse.json({ items: [], sourceErrors: {} })

  const filtered: RSSSource[] =
    sourceFilter === 'all'
      ? sources
      : sources.filter((s: RSSSource) => s.id === sourceFilter)

  const results = await Promise.allSettled(filtered.map((s: RSSSource) => fetchSourceFeed(s)))

  const sourceErrors: Record<string, string> = {}
  const allItems: FeedItem[] = results.flatMap((r, i) => {
    if (r.status === 'fulfilled') {
      if (r.value.error) sourceErrors[filtered[i].id] = r.value.error
      return r.value.items
    }
    sourceErrors[filtered[i].id] = 'failed'
    return []
  })

  const cutoff = getPeriodCutoff(period)
  const filtered2 = cutoff
    ? allItems.filter((item) => new Date(item.pubDate) >= cutoff)
    : allItems

  filtered2.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  const response: NewsResponse = { items: filtered2, sourceErrors }
  return NextResponse.json(response)
}

// DELETE — invalidate cache for all sources of this project
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()
  const { data: sources } = await supabase
    .from('rss_sources')
    .select('*')
    .eq('project_id', id)

  if (sources) {
    await Promise.allSettled((sources as RSSSource[]).map(invalidateSourceCache))
  }

  return NextResponse.json({ success: true })
}
