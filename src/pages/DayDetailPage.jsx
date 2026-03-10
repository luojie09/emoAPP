import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import MoodChart from '../components/MoodChart'
import RecordCard from '../components/RecordCard'
import TopBar from '../components/TopBar'
import { formatDayLabel } from '../utils'

export default function DayDetailPage({ entries }) {
  const { date } = useParams()
  const records = useMemo(
    () => entries.filter((entry) => entry.date === date).sort((a, b) => a.time.localeCompare(b.time)),
    [entries, date],
  )

  return (
    <div>
      <TopBar title={formatDayLabel(date ?? '')} />
      {records.length ? (
        <>
          <MoodChart data={records} />
          <h2 className="mb-4 mt-8 text-5xl text-slate-600">这一天的记录</h2>
          {records.map((record) => (
            <RecordCard key={record.id} record={record} />
          ))}
        </>
      ) : (
        <div className="rounded-xl2 bg-card p-8 text-center shadow-soft">
          <p className="mb-2 text-4xl text-slate-600">这一天没有记录</p>
          <p className="text-2xl text-textMuted">请返回历史列表选择其他日期。</p>
        </div>
      )}
    </div>
  )
}
