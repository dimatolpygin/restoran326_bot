import { NextResponse } from 'next/server'
import { fetchNicheTrends, fetchHotNews, extractTopResults } from '@/lib/tavily'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const niche = searchParams.get('niche')
  const type = searchParams.get('type') ?? 'trends'

  if (!niche) return NextResponse.json({ error: 'niche param required' }, { status: 400 })

  try {
    if (type === 'news') {
      const results = await fetchHotNews(niche)
      return NextResponse.json(extractTopResults(results, 10, 300))
    } else {
      const results = await fetchNicheTrends(niche)
      return NextResponse.json(extractTopResults(results, 10, 300))
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
