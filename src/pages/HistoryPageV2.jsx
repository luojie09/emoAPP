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

  const starredEntries = useMemo(
    () => sortedEntries.filter((entry) => entry?.isFavorite === true),
    [sortedEntries],
  )

  const visibleEntries = activeTab === 'starred' ? starredEntries : sortedEntries

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

    // Use requestAnimationFrame as a lightweight throttle for frequent scroll events.
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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f2f2f7]">
      <div className="shrink-0 pb-4">
        <div className="bg-gradient-to-b from-white to-[#f2f2f7] px-2 pt-2 pb-5">
          <h1 className="bg-gradient-to-r from-[#1d1d1f] to-[#86868b] bg-clip-text text-[34px] font-bold tracking-tight text-transparent">
            历史记录
          </h1>
          <p className="mt-2 text-[14px] text-[#8e8e93]">
            {activeTab === 'starred' ? `已收藏 ${starredEntries.length} 条回忆` : `共 ${sortedEntries.length} 条记录，按时间倒序查看`}
          </p>
        </div>

        <div className="px-1 pt-1">
          <div className="flex rounded-[14px] bg-gradient-to-br from-gray-100 to-gray-200/60 p-1 shadow-inner">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 rounded-[12px] px-4 py-2.5 text-[13px] font-semibold transition-all duration-200 ${
                activeTab === 'all' ? 'bg-white text-black shadow-md shadow-gray-300/40' : 'text-[#3c3c43]/70'
              }`}
            >
              全部记录
            </button>
            <button
              onClick={() => setActiveTab('starred')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-[12px] px-4 py-2.5 text-[13px] font-semibold transition-all duration-200 ${
                activeTab === 'starred' ? 'bg-white text-black shadow-md shadow-gray-300/40' : 'text-[#3c3c43]/70'
              }`}
            >
              <span className={activeTab === 'starred' ? 'text-[#FFCC00]' : 'opacity-60'}>★</span>
              我的收藏
            </button>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full min-h-0 overflow-y-auto pr-1"
        >
          {visibleEntries.length ? (
            <div className="space-y-3 pr-3 pb-28">
              {visibleEntries.map((entry) => {
                if (!entry || !entry.id) return null

                return (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onToggleFavorite={onToggleFavorite}
                    onOpenImage={setSelectedImage}
                    onCardClick={handleCardClick}
                    onStartLongPress={startLongPress}
                    onClearLongPress={clearLongPress}
                  />
                )
              })}
            </div>
          ) : (
            <div className="px-2 pb-28">
              <div className="rounded-[24px] border border-white/70 bg-white/90 px-6 py-12 text-center shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#007AFF]/10 text-[#007AFF]">
                  <CalendarClock size={26} strokeWidth={2.1} />
                </div>
                <h2 className="mt-4 text-[18px] font-semibold text-[#1d1d1f]">
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
          className={`pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 transition-all duration-200 ${
            isScrolling && currentVisibleDate ? 'translate-x-0 opacity-100' : 'translate-x-3 opacity-0'
          }`}
        >
          <div className="rounded-2xl border border-white/60 bg-white/70 px-3 py-2 text-[13px] font-semibold text-slate-700 shadow-[0_14px_30px_rgba(15,23,42,0.12)] backdrop-blur-md">
            {currentVisibleDate}
          </div>
        </div>
      </div>

      {selectedImage ? <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} /> : null}
    </div>
  )
}
