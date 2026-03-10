import EmotionTag from './EmotionTag'

export default function RecordCard({ record }) {
  return (
    <article className="mb-4 rounded-xl2 bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center gap-3">
        <EmotionTag mood={record.mood} />
        <span className="text-2xl text-textMuted">{record.time}</span>
      </div>
      <p className="mb-3 text-4xl leading-relaxed text-textMain">{record.note}</p>
      {record.image && <img src={record.image} alt={record.note} className="h-24 w-24 rounded-2xl object-cover" />}
    </article>
  )
}
