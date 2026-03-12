import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import MoodChart from '../components/MoodChart'
import RecordCard from '../components/RecordCard'

const scoreGlowTone = {
  5: 'bg-gradient-to-b from-orange-50 to-slate-50',
  4: 'bg-gradient-to-b from-green-50 to-slate-50',
  3: 'bg-gradient-to-b from-gray-100 to-slate-50',
  2: 'bg-gradient-to-b from-purple-50 to-slate-50',
  1: 'bg-gradient-to-b from-blue-50 to-slate-50',
}

export default function TodayPage({ records, onToggleFavorite }) {
  const chartRecords = useMemo(() => [...records].sort((a, b) => a.time.localeCompare(b.time)), [records])
  const listRecords = useMemo(() => [...records].sort((a, b) => b.time.localeCompare(a.time)), [records])
  const latestRecord = listRecords[0]
  const hasRecords = listRecords.length > 0

  return (
    <div className={`space-y-4 rounded-2xl p-1 ${scoreGlowTone[latestRecord?.score] ?? 'bg-slate-50'}`}>
      <h1 className="text-2xl font-medium text-gray-800">今天</h1>

      <Link
        to="/add"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-4 text-base font-medium text-white"
      >
        <span className="text-lg leading-none">+</span>
        <span>记录现在的心情</span>
      </Link>

      {hasRecords ? (
        <>
          <MoodChart data={chartRecords} />

          <h2 className="pt-1 text-xl font-medium text-gray-800">今天的记录</h2>

          <div className="space-y-4">
            {listRecords.map((record) => (
              <RecordCard key={record.id} record={record} onToggleFavorite={onToggleFavorite} />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <p className="text-base text-gray-700">今天还没有情绪记录</p>
          <p className="mt-1 text-sm text-gray-400">点击上方按钮，记录第一条心情吧。</p>
        </div>
      )}
    </div>
  )
}
