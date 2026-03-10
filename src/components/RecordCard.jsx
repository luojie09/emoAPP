import EmotionTag from './EmotionTag'

export default function RecordCard({ record }) {
  const hasNote = Boolean(record.note?.trim()) && record.note !== '（无备注）'

  return (
    <article className="mb-3.5 rounded-xl2 bg-card p-4 shadow-soft">
      <div className="mb-2.5 flex items-center gap-2.5">
        <EmotionTag mood={record.mood} />
        <span className="text-base text-textMuted">{record.time}</span>
      </div>
      {hasNote ? (
        <p className="mb-3 text-xl leading-relaxed text-textMain">{record.note}</p>
      ) : (
        <p className="mb-3 text-base leading-relaxed text-textMuted">没有留下文字</p>
      )}
      {record.image && <img src={record.image} alt={hasNote ? record.note : '心情图片'} className="h-20 w-20 rounded-2xl object-cover" />}
    </article>
  )
}
