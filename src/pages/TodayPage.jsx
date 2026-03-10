import { Link } from 'react-router-dom'
import MoodChart from '../components/MoodChart'
import RecordCard from '../components/RecordCard'

export default function TodayPage({ records }) {
  const hasRecords = records.length > 0

  return (
    <div>
      <h1 className="mb-6 text-4xl font-semibold">今天</h1>
      <Link to="/add" className="mb-6 flex h-14 items-center justify-center gap-2 rounded-xl2 bg-primary text-xl font-medium text-white shadow-soft">
        <span className="text-2xl leading-none">+</span>
        <span>记录现在的心情</span>
      </Link>

      {hasRecords ? (
        <>
          <MoodChart data={records} />
          <h2 className="mb-3 mt-6 text-2xl font-medium text-slate-600">今天的记录</h2>
          {records.map((record) => (
            <RecordCard key={record.id} record={record} />
          ))}
        </>
      ) : (
        <div className="rounded-xl2 bg-card p-7 text-center shadow-soft">
          <p className="mb-1.5 text-2xl text-slate-600">今天还没有情绪记录</p>
          <p className="text-sm text-textMuted">点击上方按钮，记录第一条心情吧。</p>
        </div>
      )}
    </div>
  )
}
