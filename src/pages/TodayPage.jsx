import { Link } from 'react-router-dom'
import MoodChart from '../components/MoodChart'
import RecordCard from '../components/RecordCard'

export default function TodayPage({ records }) {
  const hasRecords = records.length > 0

  return (
    <div className="space-y-4">
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
          <MoodChart data={records} />

          <h2 className="pt-1 text-xl font-medium text-gray-800">今天的记录</h2>

          <div className="space-y-4">
            {records.map((record) => (
              <RecordCard key={record.id} record={record} />
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
