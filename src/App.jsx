import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import Layout from './components/Layout'
import Toast from './components/Toast'
import AddEntryPage from './pages/AddEntryPage'
import DayDetailPage from './pages/DayDetailPage'
import HistoryPage from './pages/HistoryPage'
import TodayPage from './pages/TodayPage'
import { getTodayKey, groupEntriesByDay, readEntries, writeEntries } from './utils'

export default function App() {
  const location = useLocation()
  const [entries, setEntries] = useState([])
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    setEntries(readEntries())
  }, [])

  const showToast = (message, duration = 1800) => {
    setToastMessage(message)
    window.setTimeout(() => setToastMessage(''), duration)
  }

  const handleAddEntry = (entry) => {
    const nextEntries = [...entries, entry]
    writeEntries(nextEntries)
    setEntries(nextEntries)
  }

  const handleToggleFavorite = (entryId) => {
    const nextEntries = entries.map((entry) =>
      entry.id === entryId ? { ...entry, isFavorite: !entry.isFavorite } : entry,
    )
    writeEntries(nextEntries)
    setEntries(nextEntries)
  }

  const todayKey = getTodayKey()
  const todayEntries = useMemo(
    () => entries.filter((entry) => entry.date === todayKey).sort((a, b) => b.time.localeCompare(a.time)),
    [entries, todayKey],
  )

  const historyDays = useMemo(() => groupEntriesByDay(entries), [entries])

  const withTabs = !location.pathname.startsWith('/add') && !location.pathname.startsWith('/history/')

  return (
    <>
      <Toast message={toastMessage} />
      {withTabs ? (
        <Layout>
          <Routes>
            <Route path="/" element={<TodayPage records={todayEntries} onToggleFavorite={handleToggleFavorite} />} />
            <Route path="/history" element={<HistoryPage historyDays={historyDays} onToast={showToast} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      ) : (
        <div className="mx-auto min-h-screen max-w-md bg-slate-50 px-4 pb-10 pt-5">
          <Routes>
            <Route path="/add" element={<AddEntryPage onSave={handleAddEntry} onToast={showToast} />} />
            <Route
              path="/history/:date"
              element={<DayDetailPage entries={entries} onToggleFavorite={handleToggleFavorite} />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      )}
    </>
  )
}
