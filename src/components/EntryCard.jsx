import { Sparkles, Star } from 'lucide-react'

function formatEntryTimestamp(entry) {
  const rawCreatedAt = entry?.created_at ?? entry?.createdAt
  const rawDate = typeof entry?.date === 'string' ? entry.date : ''
  const rawTime = typeof entry?.time === 'string' ? entry.time : ''

  if (rawCreatedAt) {
    const createdAtDate = new Date(rawCreatedAt)
    if (!Number.isNaN(createdAtDate.getTime())) {
      return `${createdAtDate.getFullYear()}年${String(createdAtDate.getMonth() + 1).padStart(2, '0')}月${String(createdAtDate.getDate()).padStart(2, '0')}日 ${String(createdAtDate.getHours()).padStart(2, '0')}:${String(createdAtDate.getMinutes()).padStart(2, '0')}`
    }
  }

  if (rawDate && rawTime) return `${rawDate} ${rawTime}`
  if (rawDate) return rawDate
  return '时间未知'
}

export default function EntryCard({
  entry,
  onToggleFavorite,
  onOpenImage,
  onCardClick,
  onStartLongPress,
  onClearLongPress,
}) {
  const moodEmoji = entry?.emotion?.emoji ?? '🙂'
  const moodLabel = entry?.emotion?.label ?? entry?.mood ?? '心情记录'
  const noteText = typeof entry?.note === 'string' && entry.note.trim() ? entry.note : '（暂无内容）'
  const imageUrl = typeof entry?.image === 'string' ? entry.image.trim() : ''

  return (
    <article
      data-entry-id={entry?.id}
      className="rounded-[22px] border border-white/70 bg-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm"
      onClick={() => onCardClick?.(entry?.id)}
      onTouchStart={() => onStartLongPress?.(entry?.id)}
      onMouseDown={() => onStartLongPress?.(entry?.id)}
      onTouchEnd={onClearLongPress}
      onMouseUp={onClearLongPress}
      onMouseLeave={onClearLongPress}
      onTouchMove={onClearLongPress}
    >
      <div className="px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-100 bg-transparent text-[22px]">
            {moodEmoji}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[16px] font-semibold text-[#1d1d1f]">{moodLabel}</span>
              {entry?.ai_feedback ? <Sparkles size={14} className="shrink-0 text-[#FF9500]" /> : null}
            </div>
            <p className="mt-1 text-[13px] text-[#8e8e93]">{formatEntryTimestamp(entry)}</p>
          </div>

          <button
            onClick={(event) => {
              event.stopPropagation()
              onToggleFavorite?.(entry?.id)
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            className="ml-2 shrink-0 rounded-xl p-2 transition-colors hover:bg-gray-50"
            aria-label={entry?.isFavorite ? '取消收藏' : '加入收藏'}
          >
            <Star
              size={20}
              fill={entry?.isFavorite ? '#FFCC00' : 'none'}
              stroke={entry?.isFavorite ? '#FFCC00' : '#C7C7CC'}
              strokeWidth={2}
            />
          </button>
        </div>

        <p className="mt-3 text-[15px] leading-relaxed text-[#3c3c43] whitespace-pre-wrap">{noteText}</p>

        {imageUrl ? (
          <img
            src={imageUrl}
            alt="日记图片"
            className="mt-3 h-28 w-28 rounded-lg object-cover cursor-pointer transition-opacity hover:opacity-90"
            onClick={(event) => {
              event.stopPropagation()
              onOpenImage?.(imageUrl)
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          />
        ) : null}
      </div>
    </article>
  )
}
