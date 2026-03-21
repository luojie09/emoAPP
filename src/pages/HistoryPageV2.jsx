import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import EntryCard from '../components/EntryCard'
import ImageModal from '../components/ImageModal'

function parseEntryDate(entry) {
  if (!entry) return null

  const rawCreatedAt = entry?.created_at ?? entry?.createdAt
  if (rawCreatedAt) {
    const createdAtDate = new Date(rawCreatedAt)
    if (!Number.isNaN(createdAtDate.getTime())) return createdAtDate
  }

  const rawDate = typeof entry?.date === 'string' ? entry.date : ''
  const rawTime = typeof entry?.time === 'string' ? entry.time : '00:00'
  if (!rawDate) return null

  const combined = new Date(`${rawDate}T${rawTime}:00`)
  if (!Number.isNaN(combined.getTime())) return combined

  const fallbackDate = new Date(rawDate)
  return Number.isNaN(fallbackDate.getTime()) ? null : fallbackDate
}

function formatVisibleMonth(entry) {
  const date = parseEntryDate(entry)
  if (!date) return '未知时间'
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
}

function getEntryDateKey(entry) {
  const date = parseEntryDate(entry)
  if (!date) return 'unknown'
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatGroupDate(entry) {
  const date = parseEntryDate(entry)
  if (!date) return '未知日期'
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

export default function HistoryPageV2({ entries, onToggleFavorite, onDeleteEntry }) {
  const navigate = useNavigate()
  const scrollContainerRef = useRef(null)
  const longPressTimerRef = useRef(null)
  const hideBubbleTimerRef = useRef(null)
  const scrollRafRef = useRef(null)
  const longPressTriggeredRef = useRef(false)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedImage, setSelectedImage] = useState(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const [currentVisibleDate, setCurrentVisibleDate] = useState('')

  const sortedEntries = useMemo(() => {
    return [...(entries ?? [])]
      .filter((entry) => entry?.id)
      .sort((left, right) => {
        const leftTime = parseEntryDate(left)?.getTime() ?? 0
        const rightTime = parseEntryDate(right)?.getTime() ?? 0
        return rightTime - leftTime
      })
  }, [entries])

  const starredEntries = useMemo(() => sortedEntries.filter((entry) => entry?.isFavorite === true), [sortedEntries])

  const visibleEntries = activeTab === 'starred' ? starredEntries : sortedEntries

  const groupCounts = useMemo(() => {
    return visibleEntries.reduce((acc, entry) => {
      const key = getEntryDateKey(entry)
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})
  }, [visibleEntries])

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const startLongPress = (entryId) => {
    clearLongPress()
    longPressTriggeredRef.current = false
    longPressTimerRef.current = window.setTimeout(async () => {
      longPressTriggeredRef.current = true
      const confirmed = window.confirm('确定要彻底删除这条记录吗？')
      if (!confirmed) return
      await onDeleteEntry?.(entryId)
    }, 600)
  }

  const handleCardClick = (entryId) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      return
    }

    navigate(`/entry/${entryId}`)
  }

  const updateCurrentVisibleDate = () => {
    const container = scrollContainerRef.current
    if (!container) return

    const cards = Array.from(container.querySelectorAll('[data-entry-id]'))
    if (!cards.length) {
      setCurrentVisibleDate('')
      return
    }

    const containerTop = container.getBoundingClientRect().top
    const activeCard =
      cards.find((card) => card.getBoundingClientRect().bottom >= containerTop + 32) ?? cards[cards.length - 1]

    const monthLabel = activeCard?.getAttribute('data-month-label') ?? ''
    setCurrentVisibleDate(monthLabel)
  }

  const handleScroll = () => {
    setIsScrolling(true)

    if (hideBubbleTimerRef.current) {
      window.clearTimeout(hideBubbleTimerRef.current)
    }

    hideBubbleTimerRef.current = window.setTimeout(() => {
      setIsScrolling(false)
    }, 800)

    if (scrollRafRef.current) return

    scrollRafRef.current = window.requestAnimationFrame(() => {
      updateCurrentVisibleDate()
      scrollRafRef.current = null
    })
  }

  useEffect(() => {
    setCurrentVisibleDate(visibleEntries[0] ? formatVisibleMonth(visibleEntries[0]) : '')
  }, [visibleEntries])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    container.scrollTo({ top: 0 })
    setIsScrolling(false)
  }, [activeTab])

  useEffect(() => {
    return () => {
      clearLongPress()
      if (hideBubbleTimerRef.current) window.clearTimeout(hideBubbleTimerRef.current)
      if (scrollRafRef.current) window.cancelAnimationFrame(scrollRafRef.current)
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-1 flex-col overflow-hidden bg-[#f7f6f2]">
      <div className="shrink-0 px-4 pt-[max(env(safe-area-inset-top),_24px)] pb-4">
        <h1 className="text-3xl font-serif font-bold text-[#1a1814]">历史记录</h1>
        <p className="mt-2 text-sm text-gray-400">共 {sortedEntries.length} 条记录</p>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => setActiveTab('all')}
            className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'all' ? 'bg-[#1a1814] text-white' : 'bg-[#f0ede8] text-gray-500'
            }`}
          >
            全部记录
          </button>
          <button
            onClick={() => setActiveTab('starred')}
            className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'starred' ? 'bg-[#1a1814] text-white' : 'bg-[#f0ede8] text-gray-500'
            }`}
          >
            ☆ 我的收藏
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full min-h-0 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+100px)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {visibleEntries.length ? (
            <div className="px-0 pb-4">
              {visibleEntries.map((entry, index) => {
                if (!entry || !entry.id) return null

                const currentDateKey = getEntryDateKey(entry)
                const previousDateKey = index > 0 ? getEntryDateKey(visibleEntries[index - 1]) : null
                const shouldRenderGroupLabel = index === 0 || currentDateKey !== previousDateKey

                return (
                  <div key={entry.id}>
                    {shouldRenderGroupLabel ? (
                      <div className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-gray-500">
                        <span>🗓️</span>
                        <span>{formatGroupDate(entry)}</span>
                        <span className="text-xs text-gray-400">{groupCounts[currentDateKey] ?? 0} 条记录</span>
                      </div>
                    ) : null}

                    <EntryCard
                      entry={entry}
                      monthLabel={formatVisibleMonth(entry)}
                      onToggleFavorite={onToggleFavorite}
                      onOpenImage={setSelectedImage}
                      onCardClick={handleCardClick}
                      onStartLongPress={startLongPress}
                      onClearLongPress={clearLongPress}
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-4 pb-28">
              <div className="rounded-[24px] border border-black/5 bg-white px-6 py-12 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f0eeff] text-[#a08ff0]">
                  <CalendarClock size={26} strokeWidth={2.1} />
                </div>
                <h2 className="mt-4 text-[18px] font-semibold text-[#1a1814]">
                  {activeTab === 'starred' ? '还没有收藏的记录' : '还没有历史记录'}
                </h2>
                <p className="mt-2 text-[14px] leading-6 text-[#8e8e93]">
                  {activeTab === 'starred'
                    ? '看到想珍藏的心情时，点亮右上角的星标，它就会出现在这里。'
                    : '当你写下新的日记后，它们会在这里按时间顺序慢慢铺开。'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-200 ${
            isScrolling && currentVisibleDate ? 'translate-x-0 opacity-100' : 'translate-x-3 opacity-0'
          }`}
        >
          <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 text-[13px] font-semibold text-[#5c564e] shadow-[0_14px_30px_rgba(15,23,42,0.12)] backdrop-blur-md">
            {currentVisibleDate}
          </div>
        </div>
      </div>

      {selectedImage ? <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} /> : null}
    </div>
  )
}


