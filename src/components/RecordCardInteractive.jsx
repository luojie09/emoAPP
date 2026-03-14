import EmotionTag from './EmotionTag'

const scoreBorderTone = {
  5: 'border-orange-400',
  4: 'border-green-400',
  3: 'border-gray-300',
  2: 'border-purple-400',
  1: 'border-blue-400',
}

export default function RecordCardInteractive({ record, onToggleFavorite, onImageClick }) {
  const hasNote = Boolean(record.note?.trim()) && record.note !== '(无备注)'

  return (
    <article
      className={`rounded-2xl border-l-4 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${
        scoreBorderTone[record.score] ?? 'border-gray-300'
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <EmotionTag emotion={record.emotion} />
          <span className="text-sm text-gray-400">{record.time}</span>
        </div>
        <button onClick={() => onToggleFavorite?.(record.id)} className="text-sm text-gray-500">
          {record.isFavorite ? '★' : '☆'} 星标
        </button>
      </div>

      {hasNote ? (
        <p className="mb-3 whitespace-pre-wrap text-base leading-relaxed text-gray-700">{record.note}</p>
      ) : (
        <p className="mb-3 text-sm leading-relaxed text-gray-400">没有留下文字</p>
      )}

      {record.image && (
        <img
          src={record.image}
          alt={hasNote ? record.note : '心情图片'}
          onClick={() => onImageClick?.(record.image)}
          className="h-20 w-20 cursor-pointer rounded-xl object-cover transition hover:opacity-90"
        />
      )}
    </article>
  )
}
