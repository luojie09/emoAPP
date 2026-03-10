import { Link } from 'react-router-dom'
import MoodChart from '../components/MoodChart'
import RecordCard from '../components/RecordCard'

export default function TodayPage({ records }) {
  const hasRecords = records.length > 0

  return (
    <div>
      <h1 className="mb-8 text-6xl font-medium">今天</h1>
      <Link to="/add" className="mb-8 flex h-16 items-center justify-center gap-3 rounded-xl2 bg-primary text-4xl text-white shadow-soft">
        <span className="text-5xl">+</span>
        <span>记录现在的心情</span>
      </Link>

      {hasRecords ? (
        <>
          <MoodChart data={records} />
          <h2 className="mb-4 mt-8 text-5xl text-slate-600">今天的记录</h2>
          {records.map((record) => (
            <RecordCard key={record.id} record={record} />
          ))}
        </>
      ) : (
        <div className="rounded-xl2 bg-card p-8 text-center shadow-soft">
          <p className="mb-2 text-4xl text-slate-600">今天还没有心情记录</p>
          <p className="text-2xl text-textMuted">点击上方按钮，记录第一条心情吧。</p>
        </div>
      )}
    </div>
  )
}
