import { Star } from 'lucide-react'
import MoodAvatar from './MoodAvatar'

function parseEntryDate(entry) {
  const rawCreatedAt = entry?.created_at ?? entry?.createdAt
  if (rawCreatedAt) {
    const createdAtDate = new Date(rawCreatedAt)
    if (!Number.isNaN(createdAtDate.getTime())) return createdAtDate
  }

  const rawDate = typeof entry?.date === 'string' ? entry.date : ''
  const rawTime = typeof entry?.time === 'string' ? entry.time : '00:00'

  if (rawDate) {
    const combined = new Date(`${rawDate}T${rawTime}:00`)
    if (!Number.isNaN(combined.getTime())) return combined
  }

  return null
}

function formatEntryTime(entry) {
  const date = parseEntryDate(entry)
  if (date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  if (typeof entry?.time === 'string' && entry.time) return entry.time
  return '--:--'
}

function normalizeTags(entry) {
  if (Array.isArray(entry?.tags)) return entry.tags.filter(Boolean)
  if (typeof entry?.tag === 'string' && entry.tag.trim()) return [entry.tag.trim()]
  return []
}

export default function EntryCard({
  entry,
  onToggleFavorite,
  onOpenImage,
  onCardClick,
  onStartLongPress,
  onClearLongPress,
  monthLabel,
}) {
  const moodEmoji = entry?.emotion?.emoji ?? '🙂'
  const moodLabel = entry?.emotion?.label ?? entry?.mood ?? '心情记录'
  const noteText = typeof entry?.note === 'string' && entry.note.trim() ? entry.note : '（暂无内容）'
  const imageUrl = typeof entry?.image === 'string' ? entry.image.trim() : ''
  const aiPreview =
    typeof entry?.ai_feedback === 'string' && entry.ai_feedback.trim()
      ? entry.ai_feedback.trim()
      : '有时候情绪像一阵风，不必急着给它定论，先允许它从你心里轻轻经过。'
  const tags = normalizeTags(entry)

  return (
    <article
      data-entry-id={entry?.id}
      data-month-label={monthLabel ?? ''}
      className="mx-4 mb-3 rounded-[20px] border border-black/5 bg-white p-4 shadow-sm transition-transform active:scale-[0.99]"
      onClick={() => onCardClick?.(entry?.id)}
      onTouchStart={() => onStartLongPress?.(entry?.id)}
      onMouseDown={() => onStartLongPress?.(entry?.id)}
      onTouchEnd={onClearLongPress}
      onMouseUp={onClearLongPress}
      onMouseLeave={onClearLongPress}
      onTouchMove={onClearLongPress}
    >
      <div className="flex items-start gap-3">
        <MoodAvatar emoji={moodEmoji} className="h-10 w-10 shrink-0 !bg-[#f0eeff] text-xl" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[17px] font-semibold text-[#1a1814]">{moodLabel}</span>
                <span className="text-sm text-[#c0b8e8]">✉</span>
              </div>
              <p className="mt-1 text-[13px] text-gray-400">{formatEntryTime(entry)}</p>
            </div>

            <button
              onClick={(event) => {
                event.stopPropagation()
                onToggleFavorite?.(entry?.id)
              }}
              onMouseDown={(event) => event.stopPropagation()}
              onTouchStart={(event) => event.stopPropagation()}
              className="shrink-0 rounded-lg p-1"
              aria-label={entry?.isFavorite ? '取消收藏' : '加入收藏'}
            >
              <Star
                size={20}
                fill={entry?.isFavorite ? '#e8a87c' : 'none'}
                stroke={entry?.isFavorite ? '#e8a87c' : '#c8c2ba'}
                strokeWidth={2}
              />
            </button>
          </div>

          <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-gray-600">{noteText}</p>

          {tags.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={`${entry?.id}-${tag}`}
                  className="rounded-lg border border-[#e0dcf8] bg-[#f0eeff] px-2.5 py-0.5 text-xs text-[#9080d0]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          {imageUrl ? (
            <img
              src={imageUrl}
              alt="日记图片"
              className="mt-3 h-28 w-28 cursor-pointer rounded-xl object-cover transition-opacity hover:opacity-90"
              onClick={(event) => {
                event.stopPropagation()
                onOpenImage?.(imageUrl)
              }}
              onMouseDown={(event) => event.stopPropagation()}
              onTouchStart={(event) => event.stopPropagation()}
            />
          ) : null}

          <div className="mt-3 border-t border-[#f0ede8] pt-3">
            <div className="flex gap-3">
              <span className="text-base leading-none">🌿</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[#a08ff0]">树洞回音</p>
                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-gray-500">{aiPreview}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
