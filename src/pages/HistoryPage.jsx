import { Link } from 'react-router-dom'
import { formatDayLabel } from '../utils'

export default function HistoryPage({ historyDays }) {
  if (!historyDays.length) {
    return (
      <div>
        <h1 className="mb-6 text-4xl font-semibold">历史</h1>
        <div className="rounded-xl2 bg-card p-7 text-center shadow-soft">
          <p className="mb-1.5 text-2xl text-slate-600">还没有历史记录</p>
          <p className="text-sm text-textMuted">先在“今天”页添加一条心情。</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 text-4xl font-semibold">历史</h1>
      {historyDays.map((day) => (
        <Link to={`/history/${day.date}`} key={day.date} className="mb-3 flex items-center justify-between rounded-xl2 bg-card p-4 shadow-soft">
          <div>
            <p className="mb-1 text-2xl font-medium">
              {formatDayLabel(day.date)}
              <span className="ml-2 text-lg font-normal text-textMuted">{day.count} 条记录</span>
            </p>
            <p className="text-xl text-slate-600">平均情绪：{day.avg}</p>
          </div>
          <span className="text-4xl text-textMuted">›</span>
        </Link>
      ))}
    </div>
  )
}
