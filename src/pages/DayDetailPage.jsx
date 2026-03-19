import { useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Star } from 'lucide-react'
import ImageModal from '../components/ImageModal'
import MoodAvatar from '../components/MoodAvatar'
import TopBar from '../components/TopBar'
import { formatDayLabel, getEntryLocalDateKey } from '../utils'

export default function DayDetailPage({ entries, onToggleFavorite, onDeleteEntry }) {
  const { date } = useParams()
  const [selectedImage, setSelectedImage] = useState(null)
  const longPressTimerRef = useRef(null)

  const listRecords = useMemo(
    () =>
      (entries ?? [])
        .filter((entry) => getEntryLocalDateKey(entry) === date)
        .sort((a, b) => b.time.localeCompare(a.time)),
    [entries, date],
  )

  const clearLongPress = () => {
    if (!longPressTimerRef.current) return
    window.clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = null
  }

  const startLongPress = (entryId) => {
    clearLongPress()
    longPressTimerRef.current = window.setTimeout(async () => {
      const confirmed = window.confirm('确定要彻底删除这条记录吗？')
      if (!confirmed) return
      await onDeleteEntry?.(entryId)
    }, 600)
  }

  return (
    <div className="space-y-4 pt-3">
      <TopBar title={formatDayLabel(date ?? '')} />

      {listRecords.length ? (
        <div className="space-y-3">
          {listRecords.map((entry) => {
            return (
              <div
                key={entry.id}
                className="bg-white rounded-[20px] shadow-sm"
                onTouchStart={() => startLongPress(entry.id)}
                onMouseDown={() => startLongPress(entry.id)}
                onTouchEnd={clearLongPress}
                onMouseUp={clearLongPress}
                onMouseLeave={clearLongPress}
                onTouchMove={clearLongPress}
              >
                <div className="px-4 py-4 flex items-start gap-3">
                  <MoodAvatar emoji={entry?.emotion?.emoji ?? '🙂'} className="h-12 w-12 shrink-0 text-2xl" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[17px] font-semibold">{entry?.emotion?.label ?? entry?.mood ?? '心情'}</span>
                      <span className="text-[15px] text-[#8e8e93]">{entry.time}</span>
                    </div>
                    {entry.note ? (
                      <p className="text-[15px] text-[#3c3c43] leading-snug whitespace-pre-wrap">{entry.note}</p>
                    ) : null}

                    {entry.image ? (
                      <img
                        src={entry.image}
                        alt="心情图片"
                        className="mt-3 h-20 w-20 rounded-xl object-cover cursor-pointer"
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedImage(entry.image)
                        }}
                        onMouseDown={(event) => event.stopPropagation()}
                        onTouchStart={(event) => event.stopPropagation()}
                      />
                    ) : null}
                  </div>

                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      onToggleFavorite?.(entry.id)
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                    onTouchStart={(event) => event.stopPropagation()}
                    className="flex-shrink-0 ml-2 p-2 -mr-2"
                  >
                    <Star
                      size={20}
                      fill={entry.isFavorite ? '#FFCC00' : 'none'}
                      stroke={entry.isFavorite ? '#FFCC00' : '#C7C7CC'}
                      strokeWidth={2}
                    />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-[20px] shadow-sm p-6 text-center text-[#8e8e93]">这一天没有记录</div>
      )}

      {selectedImage && <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />}
    </div>
  )
}
