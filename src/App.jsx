import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import Layout from './components/Layout'
import AddEntryPage from './pages/AddEntryPage'
import DayDetailPage from './pages/DayDetailPage'
import HistoryPage from './pages/HistoryPage'
import TodayPage from './pages/TodayPage'
import { getTodayKey, groupEntriesByDay, readEntries, writeEntries } from './utils'

export default function App() {
  const location = useLocation()
  const [entries, setEntries] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setEntries(readEntries())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    writeEntries(entries)
  }, [entries, ready])

  const todayKey = getTodayKey()
  const todayEntries = useMemo(
    () => entries.filter((entry) => entry.date === todayKey).sort((a, b) => a.time.localeCompare(b.time)),
    [entries, todayKey],
  )

  const historyDays = useMemo(() => groupEntriesByDay(entries), [entries])

  const withTabs = !location.pathname.startsWith('/add') && !location.pathname.startsWith('/history/')

  return withTabs ? (
    <Layout>
      <Routes>
        <Route path="/" element={<TodayPage records={todayEntries} />} />
        <Route path="/history" element={<HistoryPage historyDays={historyDays} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  ) : (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 px-4 pb-10 pt-5">
      <Routes>
        <Route path="/add" element={<AddEntryPage onSave={setEntries} />} />
        <Route path="/history/:date" element={<DayDetailPage entries={entries} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
