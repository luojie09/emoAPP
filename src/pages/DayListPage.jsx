import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Sparkles, Star } from 'lucide-react'
import ImageModal from '../components/ImageModal'
import { formatLocalMonthDay, getEntryLocalDateKey } from '../utils'

const moodColors = {
  5: '#34C759',
  4: '#5AC8FA',
  3: '#FFCC00',
  2: '#FF9500',
  1: '#FF3B30',
}

export default function DayListPage({ entries, onToggleFavorite, onDeleteEntry }) {
  const navigate = useNavigate()
  const { date } = useParams()
  const [selectedImage, setSelectedImage] = useState(null)
  const longPressTimerRef = useRef(null)
  const longPressTriggeredRef = useRef(false)

  const targetDate = useMemo(() => decodeURIComponent(date ?? ''), [date])

  const dayEntries = useMemo(
    () =>
      (entries ?? [])
        .filter((entry) => getEntryLocalDateKey(entry) === targetDate)
        .sort((a, b) => b.time.localeCompare(a.time)),
    [entries, targetDate],
  )

  const clearLongPress = () => {
    if (!longPressTimerRef.current) return
    window.clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = null
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

  return (
    <div className="-mx-4 -mt-5 min-h-screen bg-[#f2f2f7]">
      <div className="bg-white border-b border-gray-200/60 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} className="text-gray-700" strokeWidth={2} />
          </button>
          <h1 className="text-[17px] font-semibold text-black absolute left-1/2 transform -translate-x-1/2">
            {formatLocalMonthDay(targetDate)}
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 py-4">
        {dayEntries.length ? (
          <div className="space-y-3">
            {dayEntries.map((entry) => {
              const moodScore = Number(entry?.emotion?.score ?? entry?.score ?? 3)
              const moodColor = moodColors[moodScore] ?? '#8E8E93'

              return (
                <div
                  key={entry.id}
                  className="bg-white rounded-[20px] shadow-sm px-4 py-4"
                  onClick={() => handleCardClick(entry.id)}
                  onTouchStart={() => startLongPress(entry.id)}
                  onMouseDown={() => startLongPress(entry.id)}
                  onTouchEnd={clearLongPress}
                  onMouseUp={clearLongPress}
                  onMouseLeave={clearLongPress}
                  onTouchMove={clearLongPress}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ backgroundColor: `${moodColor}20` }}
                      >
                        {entry?.emotion?.emoji ?? '🙂'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[17px] font-semibold truncate">
                            {entry?.emotion?.label ?? entry?.mood ?? '心情'}
                          </span>
                          {entry?.ai_feedback ? <Sparkles size={14} className="text-[#FF9500]" /> : null}
                        </div>
                        <p className="text-[14px] text-[#8e8e93]">{`${entry.date} ${entry.time}`}</p>
                      </div>
                    </div>

                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggleFavorite?.(entry.id)
                      }}
                      onMouseDown={(event) => event.stopPropagation()}
                      onTouchStart={(event) => event.stopPropagation()}
                      className="flex-shrink-0 p-2 -mr-2 -mt-1"
                    >
                      <Star
                        size={20}
                        fill={entry.isFavorite ? '#FFCC00' : 'none'}
                        stroke={entry.isFavorite ? '#FFCC00' : '#C7C7CC'}
                        strokeWidth={2}
                      />
                    </button>
                  </div>

                  {entry.note ? (
                    <p className="mt-3 text-[15px] text-[#3c3c43] leading-relaxed whitespace-pre-wrap">{entry.note}</p>
                  ) : null}

                  {entry.image ? (
                    <img
                      src={entry.image}
                      alt="日记图片"
                      className="mt-3 h-28 w-28 rounded-lg object-cover cursor-pointer hover:opacity-90"
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedImage(entry.image)
                      }}
                      onMouseDown={(event) => event.stopPropagation()}
                      onTouchStart={(event) => event.stopPropagation()}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-[20px] shadow-sm p-6 text-center text-[#8e8e93]">这一天还没有记录</div>
        )}
      </div>

      {selectedImage && <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />}
    </div>
  )
}
