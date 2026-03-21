import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Star } from 'lucide-react'
import ImageModal from '../components/ImageModal'
import MoodAvatar from '../components/MoodAvatar'

function formatNavTime(entry) {
  if (!entry?.date && !entry?.time) return ''
  return `${entry?.date ?? ''} · ${entry?.time ?? ''}`.trim()
}

function formatDetailTime(rawTime) {
  if (typeof rawTime !== 'string' || !rawTime.includes(':')) return rawTime || ''

  const [hourText = '0', minuteText = '00'] = rawTime.split(':')
  const hour = Number(hourText)
  if (Number.isNaN(hour)) return rawTime

  const period = hour >= 12 ? '下午' : '上午'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${period} ${displayHour}:${minuteText}`
}

function getEntryTimestamp(entry) {
  const rawCreatedAt = entry?.created_at ?? entry?.createdAt
  if (rawCreatedAt) {
    const createdAt = new Date(rawCreatedAt)
    if (!Number.isNaN(createdAt.getTime())) return createdAt.getTime()
  }

  if (entry?.date && entry?.time) {
    const combined = new Date(`${entry.date}T${entry.time}:00`)
    if (!Number.isNaN(combined.getTime())) return combined.getTime()
  }

  return 0
}

export default function EntryDetailPageV2({ entries }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [selectedImage, setSelectedImage] = useState(null)
  const touchStartXRef = useRef(0)
  const touchEndXRef = useRef(0)

  const entry = useMemo(() => (entries ?? []).find((item) => String(item.id) === String(id)), [entries, id])
  const adjacentEntryIds = useMemo(() => {
    const currentTimestamp = getEntryTimestamp(entry)
    if (!entry || !currentTimestamp) return { prevEntryId: null, nextEntryId: null }

    let prevCandidate = null
    let nextCandidate = null

    for (const item of entries ?? []) {
      if (!item || String(item.id) === String(entry.id)) continue
      const itemTimestamp = getEntryTimestamp(item)
      if (!itemTimestamp) continue

      if (itemTimestamp < currentTimestamp) {
        if (!prevCandidate || itemTimestamp > getEntryTimestamp(prevCandidate)) {
          prevCandidate = item
        }
      }

      if (itemTimestamp > currentTimestamp) {
        if (!nextCandidate || itemTimestamp < getEntryTimestamp(nextCandidate)) {
          nextCandidate = item
        }
      }
    }

    return {
      prevEntryId: prevCandidate?.id ?? null,
      nextEntryId: nextCandidate?.id ?? null,
    }
  }, [entries, entry])
  const displayTime = formatNavTime(entry)
  const replyText = typeof entry?.ai_feedback === 'string' ? entry.ai_feedback.trim() : ''
  const detailTime = formatDetailTime(entry?.time)

  const handleTouchStart = (event) => {
    touchStartXRef.current = event.changedTouches?.[0]?.clientX ?? 0
  }

  const handleTouchEnd = (event) => {
    touchEndXRef.current = event.changedTouches?.[0]?.clientX ?? 0
    const delta = touchStartXRef.current - touchEndXRef.current

    if (delta > 50) {
      if (adjacentEntryIds.nextEntryId) {
        navigate(`/entry/${adjacentEntryIds.nextEntryId}`)
      } else {
        console.info('已经是最新一条记录')
      }
      return
    }

    if (delta < -50) {
      if (adjacentEntryIds.prevEntryId) {
        navigate(`/entry/${adjacentEntryIds.prevEntryId}`)
      } else {
        console.info('已经是最后一条记录')
      }
    }
  }

  if (!entry) {
    return (
      <div className="-mx-4 -mt-5 min-h-screen bg-[#f7f6f2] p-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center rounded-lg px-2 py-1 text-gray-700 hover:bg-white/70"
        >
          <ChevronLeft size={22} />
          <span className="ml-1 text-sm">返回</span>
        </button>
        <div className="rounded-[22px] border border-black/5 bg-white p-6 text-center text-[#8e8e93] shadow-sm">
          未找到这条记录
        </div>
      </div>
    )
  }

  return (
    <div
      className="-mx-4 -mt-5 min-h-screen bg-[#f7f6f2] pb-8"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="border-b border-gray-200/50 bg-transparent px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-2 -ml-2 text-gray-500 transition-colors hover:bg-white/70 active:bg-white/90"
          >
            <ChevronLeft size={22} className="text-gray-500" strokeWidth={2} />
          </button>

          <div className="flex-1 text-center text-sm font-medium text-gray-400">{displayTime}</div>

          <button className="rounded-lg p-2" aria-label={entry?.isFavorite ? '已收藏' : '未收藏'}>
            <Star
              size={21}
              fill={entry?.isFavorite ? '#e8a87c' : 'none'}
              stroke={entry?.isFavorite ? '#e8a87c' : '#c8c2ba'}
              strokeWidth={2}
            />
          </button>
        </div>
      </div>

      <div className="mx-4 mt-4 rounded-[22px] border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <MoodAvatar emoji={entry?.emotion?.emoji ?? '🙂'} className="h-11 w-11 flex-shrink-0 !bg-[#f5f4f0] text-2xl" />
          <div>
            <h1 className="text-[20px] font-semibold text-gray-900">{entry?.emotion?.label ?? entry?.mood ?? '心情'}</h1>
            <p className="mt-1 text-xs text-gray-400">{detailTime}</p>
          </div>
        </div>

        <div className="mt-4 whitespace-pre-wrap font-serif text-[15px] leading-[1.85] text-gray-600">
          {entry?.note ?? ''}
        </div>

        {entry.image ? (
          <div className="mt-4">
            <img
              src={entry.image}
              alt="日记配图"
              className="w-full cursor-pointer rounded-xl object-cover"
              onClick={() => setSelectedImage(entry.image)}
            />
          </div>
        ) : null}
      </div>

      <div className="relative mx-4 mt-3 overflow-hidden rounded-[22px] border border-[#dddaf8] bg-gradient-to-br from-[#e8e6f9] via-[#ede8f5] to-[#f0eaf5] p-5 shadow-sm">
        <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-[#d2c8ff]/30" />

        <div className="relative z-10">
          <div className="flex items-center">
            <span className="text-base leading-none">🌳</span>
            <span className="ml-2 text-xs font-medium tracking-wide text-[#1a1814]">
              {replyText ? '来自时光树洞的回音…' : '回信正在途中…'}
            </span>
          </div>

          <div className="relative z-10 mt-3 whitespace-pre-wrap font-serif text-[15px] leading-[1.9] text-[#4a4068]">
            {replyText || '时光树洞正在认真读这篇心情，回信很快就会抵达。'}
          </div>
        </div>
      </div>

      {selectedImage && <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />}
    </div>
  )
}
