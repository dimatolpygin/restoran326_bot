'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Send, X as XIcon, Plus, Trash2, RefreshCw, ExternalLink, Image as ImageIcon, AlertTriangle } from 'lucide-react'
import type { RSSSource, FeedItem } from '@/lib/types'

type PeriodValue = 'today' | '3d' | 'week' | 'month' | 'all'

const PERIOD_OPTIONS: { value: PeriodValue; label: string }[] = [
  { value: 'today', label: 'Сегодня' },
  { value: '3d', label: '3 дня' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'all', label: 'Всё' },
]

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function SourceIcon({ type }: { type: 'twitter' | 'telegram' }) {
  if (type === 'twitter') {
    return <XIcon size={12} className="text-[#e7e9ea]" />
  }
  return <Send size={12} className="text-[#2aabee]" />
}

export default function NewsPage() {
  const { id } = useParams<{ id: string }>()

  const [sources, setSources] = useState<RSSSource[]>([])
  const [items, setItems] = useState<FeedItem[]>([])
  const [period, setPeriod] = useState<PeriodValue>('week')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [sourceErrors, setSourceErrors] = useState<Record<string, string>>({})
  const [loadingSources, setLoadingSources] = useState(true)
  const [loadingFeed, setLoadingFeed] = useState(false)

  const [addType, setAddType] = useState<'twitter' | 'telegram'>('telegram')
  const [addHandle, setAddHandle] = useState('')
  const [addName, setAddName] = useState('')
  const [adding, setAdding] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  async function loadSources() {
    setLoadingSources(true)
    try {
      const res = await fetch(`/api/projects/${id}/rss-sources`)
      const data = await res.json()
      setSources(Array.isArray(data) ? data : [])
    } finally {
      setLoadingSources(false)
    }
  }

  const loadFeed = useCallback(async (invalidate = false) => {
    setLoadingFeed(true)
    try {
      if (invalidate) {
        await fetch(`/api/projects/${id}/news`, { method: 'DELETE' })
      }
      const res = await fetch(
        `/api/projects/${id}/news?period=${period}&source=${sourceFilter}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      const result = Array.isArray(data) ? { items: data, sourceErrors: {} } : data
      setItems(result.items ?? [])
      setSourceErrors(result.sourceErrors ?? {})
    } finally {
      setLoadingFeed(false)
    }
  }, [id, period, sourceFilter])

  useEffect(() => { loadSources() }, [id])
  useEffect(() => { loadFeed() }, [loadFeed])

  async function handleAddSource(e: React.FormEvent) {
    e.preventDefault()
    if (!addHandle.trim()) return
    setAdding(true)
    try {
      const res = await fetch(`/api/projects/${id}/rss-sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: addType, handle: addHandle.trim(), name: addName.trim() || undefined }),
      })
      if (res.ok) {
        const newSource = await res.json()
        setSources((prev) => [...prev, newSource])
        setAddHandle('')
        setAddName('')
        setShowAddForm(false)
        loadFeed(false)
      }
    } finally {
      setAdding(false)
    }
  }

  async function handleDeleteSource(sourceId: string) {
    setSources((prev) => prev.filter((s) => s.id !== sourceId))
    await fetch(`/api/projects/${id}/rss-sources/${sourceId}`, { method: 'DELETE' })
    if (sourceFilter === sourceId) setSourceFilter('all')
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — sources */}
      <aside className="w-56 shrink-0 bg-[#111111] border-r border-[#2a2a2a] flex flex-col overflow-y-auto">
        <div className="p-3 border-b border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#737373] uppercase tracking-wide">Источники</span>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="text-[#737373] hover:text-[#f5f5f5] transition-colors"
              title="Добавить источник"
            >
              <Plus size={12} />
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddSource} className="flex flex-col gap-1.5 mb-2">
              <select
                value={addType}
                onChange={(e) => setAddType(e.target.value as 'twitter' | 'telegram')}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#f5f5f5] text-xs rounded px-2 py-1 focus:outline-none focus:border-[#404040]"
              >
                <option value="telegram">Telegram</option>
                <option value="twitter">Twitter/X</option>
              </select>
              <input
                type="text"
                placeholder="@handle или channel"
                value={addHandle}
                onChange={(e) => setAddHandle(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#f5f5f5] text-xs rounded px-2 py-1 focus:outline-none focus:border-[#404040] placeholder:text-[#555]"
              />
              <input
                type="text"
                placeholder="Название (необяз.)"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#f5f5f5] text-xs rounded px-2 py-1 focus:outline-none focus:border-[#404040] placeholder:text-[#555]"
              />
              <button
                type="submit"
                disabled={adding || !addHandle.trim()}
                className="w-full bg-[#2a2a2a] hover:bg-[#333] disabled:opacity-40 text-[#f5f5f5] text-xs rounded px-2 py-1 transition-colors"
              >
                {adding ? 'Добавляем...' : 'Добавить'}
              </button>
            </form>
          )}

          {loadingSources ? (
            <p className="text-[#737373] text-xs">Загрузка...</p>
          ) : sources.length === 0 ? (
            <p className="text-[#555] text-xs">Нет источников</p>
          ) : (
            <div className="flex flex-col gap-1">
              {sources.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-1.5 group"
                >
                  <SourceIcon type={s.type} />
                  <span className="flex-1 text-[#c0c0c0] text-xs truncate">
                    @{s.handle}
                    {s.name && <span className="text-[#555] ml-1">·{s.name}</span>}
                  </span>
                  {sourceErrors[s.id] && (
                    <span title={sourceErrors[s.id]} className="text-[#f59e0b]">
                      <AlertTriangle size={10} />
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteSource(s.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-[#ef4444] transition-all"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Right panel — feed */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filter bar */}
        <div className="shrink-0 border-b border-[#2a2a2a] bg-[#0f0f0f] px-4 py-2 flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodValue)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-[#f5f5f5] text-xs rounded px-2 py-1 focus:outline-none focus:border-[#404040]"
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-[#f5f5f5] text-xs rounded px-2 py-1 focus:outline-none focus:border-[#404040]"
          >
            <option value="all">Все источники</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                @{s.handle}
              </option>
            ))}
          </select>

          <button
            onClick={() => loadFeed(true)}
            disabled={loadingFeed}
            className="flex items-center gap-1 text-[#737373] hover:text-[#f5f5f5] text-xs transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={loadingFeed ? 'animate-spin' : ''} />
            Обновить
          </button>

          <span className="ml-auto text-[#555] text-xs">
            {!loadingFeed && `${items.length} постов`}
          </span>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto p-4">
          {sources.length === 0 && !loadingSources ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Newspaper />
              <p className="text-[#737373] text-sm mt-3">Нет источников</p>
              <p className="text-[#555] text-xs mt-1">
                Добавьте Twitter-аккаунт или Telegram-канал в панели слева
              </p>
            </div>
          ) : !loadingFeed && Object.keys(sourceErrors).length > 0 && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <AlertTriangle size={32} className="text-[#f59e0b] mb-3" />
              <p className="text-[#e5e5e5] text-sm font-medium">Источники недоступны</p>
              <p className="text-[#737373] text-xs mt-1 max-w-xs">
                RSSHub не может подключиться к Telegram/Twitter. Проверьте сеть контейнера RSSHub.
              </p>
              <div className="mt-3 flex flex-col gap-1 text-left">
                {Object.entries(sourceErrors).map(([sid, err]) => {
                  const s = sources.find((x) => x.id === sid)
                  return (
                    <p key={sid} className="text-[#555] text-xs">
                      <span className="text-[#737373]">@{s?.handle ?? sid.slice(0, 8)}</span>
                      {' — '}
                      <span className="text-[#f59e0b]">{err}</span>
                    </p>
                  )
                })}
              </div>
            </div>
          ) : loadingFeed ? (
            <div className="flex flex-col gap-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4 animate-pulse"
                >
                  <div className="h-3 bg-[#2a2a2a] rounded w-32 mb-3" />
                  <div className="h-4 bg-[#2a2a2a] rounded w-full mb-2" />
                  <div className="h-4 bg-[#2a2a2a] rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-[#555] text-sm text-center mt-16">Нет постов за выбранный период</p>
          ) : (
            <div className="flex flex-col gap-3 max-w-2xl">
              {items.map((item) => (
                <FeedCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Newspaper() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#444]">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z" />
    </svg>
  )
}

function FeedCard({ item }: { item: FeedItem }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#333] transition-colors">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <SourceIcon type={item.sourceType} />
        <span className="text-[#737373] text-xs">@{item.sourceHandle}</span>
        <span className="text-[#444] text-xs">·</span>
        <span className="text-[#555] text-xs">{formatDate(item.pubDate)}</span>
      </div>

      {/* Content */}
      {item.title && item.title !== item.content && (
        <p className="text-[#e5e5e5] text-sm font-medium mb-1 line-clamp-2">{item.title}</p>
      )}
      <p className="text-[#a0a0a0] text-xs leading-relaxed line-clamp-4">{item.content}</p>

      {/* Image */}
      {item.imageUrl && !imgError && (
        <div className="mt-3 rounded overflow-hidden border border-[#2a2a2a]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt=""
            className="w-full h-48 object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      )}
      {item.imageUrl && imgError && (
        <div className="mt-3 h-12 flex items-center justify-center gap-1 text-[#444] text-xs border border-[#2a2a2a] rounded">
          <ImageIcon size={12} />
          <span>Изображение недоступно</span>
        </div>
      )}

      {/* Link */}
      {item.link && (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-1 text-[#555] hover:text-[#737373] text-xs transition-colors"
        >
          <ExternalLink size={10} />
          Открыть оригинал
        </a>
      )}
    </div>
  )
}
