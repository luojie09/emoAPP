import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import MoodChart from '../components/MoodChart'
import RecordCard from '../components/RecordCard'
import TopBar from '../components/TopBar'
import { formatDayLabel } from '../utils'

export default function DayDetailPage({ entries }) {
  const { date } = useParams()

  const dayRecords = useMemo(() => entries.filter((entry) => entry.date === date), [entries, date])
  const chartRecords = useMemo(() => [...dayRecords].sort((a, b) => a.time.localeCompare(b.time)), [dayRecords])
  const listRecords = useMemo(() => [...dayRecords].sort((a, b) => b.time.localeCompare(a.time)), [dayRecords])

  return (
    <div className="space-y-4 pt-3">
      <TopBar title={formatDayLabel(date ?? '')} />

      {listRecords.length ? (
        <>
          <MoodChart data={chartRecords} />
          <h2 className="text-xl font-medium text-gray-800">这一天的记录</h2>
          <div className="space-y-4">
            {listRecords.map((record) => (
              <RecordCard key={record.id} record={record} />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <p className="text-base text-gray-700">这一天没有记录</p>
          <p className="mt-1 text-sm text-gray-400">请返回历史列表选择其他日期。</p>
        </div>
      )}
    </div>
  )
}
