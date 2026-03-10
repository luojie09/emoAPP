import { Link } from 'react-router-dom'
import { formatDayLabel } from '../utils'

export default function HistoryPage({ historyDays }) {
  if (!historyDays.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-medium text-gray-800">历史</h1>
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <p className="text-base text-gray-700">还没有历史记录</p>
          <p className="mt-1 text-sm text-gray-400">先在“今天”页添加一条心情。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-medium text-gray-800">历史</h1>

      <div className="space-y-4">
        {historyDays.map((day) => (
          <Link
            to={`/history/${day.date}`}
            key={day.date}
            className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
          >
            <div>
              <p className="text-base font-medium text-gray-800">
                {formatDayLabel(day.date)}
                <span className="ml-2 text-sm font-normal text-gray-400">{day.count} 条记录</span>
              </p>
              <p className="mt-1 text-sm text-gray-700">平均情绪：{day.avg}</p>
            </div>
            <span className="text-2xl text-gray-400">›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
