import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import AppLayout from './components/AppLayout'
import Toast from './components/Toast'
import AddEntryPage from './pages/AddEntryPageModern'
import AuthPage from './pages/AuthPage'
import DayListPage from './pages/DayListPage'
import EntryDetailPage from './pages/EntryDetailPage'
import HistoryPage from './pages/HistoryPageModern'
import ProfilePage from './pages/ProfilePage'
import TodayPage from './pages/TodayPageModern'
import { groupEntriesByDay, readEntries } from './utils'
import { supabase } from './supabaseClient'

function rowToEntry(row) {
  const created = row.created_at ? new Date(row.created_at) : new Date()
  const pad = (v) => String(v).padStart(2, '0')

  return {
    id: row.id,
    date: `${created.getFullYear()}-${pad(created.getMonth() + 1)}-${pad(created.getDate())}`,
    time: `${pad(created.getHours())}:${pad(created.getMinutes())}`,
    emotion: { emoji: row.emoji, label: row.label, score: row.score },
    score: row.score,
    mood: row.label,
    note: row.text ?? '',
    image: row.image_url ?? '',
    isFavorite: Boolean(row.is_favorite),
    ai_feedback: row.ai_feedback ?? '',
  }
}

const GUEST_ENTRIES_KEY = 'guest_entries'

function readGuestEntries() {
  const raw = localStorage.getItem(GUEST_ENTRIES_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return readEntries(Array.isArray(parsed) ? parsed : [])
  } catch {
    return []
  }
}

function writeGuestEntries(entries) {
  localStorage.setItem(GUEST_ENTRIES_KEY, JSON.stringify(entries))
}

function getTabFromPath(pathname) {
  if (pathname.startsWith('/history')) return 'history'
  if (pathname.startsWith('/profile')) return 'profile'
  return 'today'
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [toastMessage, setToastMessage] = useState('')
  const [session, setSession] = useState(null)
  const [isGuest, setIsGuest] = useState(false)
  const [currentTab, setCurrentTab] = useState(() => getTabFromPath(location.pathname))

  const showToast = (message, duration = 1800) => {
    setToastMessage(message)
    window.setTimeout(() => setToastMessage(''), duration)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setCurrentTab(getTabFromPath(location.pathname))
  }, [location.pathname])

  const fetchCloudEntries = async (showSuccessToast = false) => {
    if (!session) return false

    const { data, error } = await supabase
      .from('entries')
      .select('id,user_id,emoji,label,score,text,image_url,is_favorite,created_at,ai_feedback')
      .order('created_at', { ascending: false })

    if (error) {
      showToast('加载数据失败，请稍后重试')
      return false
    }

    setEntries((data ?? []).map(rowToEntry))
    if (showSuccessToast) showToast('云端同步完成')
    return true
  }

  useEffect(() => {
    if (isGuest) {
      setEntries(readGuestEntries())
      return
    }

    if (!session) {
      setEntries([])
      return
    }

    const loadEntries = async () => {
      const { data, error } = await supabase
        .from('entries')
        .select('id,user_id,emoji,label,score,text,image_url,is_favorite,created_at,ai_feedback')
        .order('created_at', { ascending: false })

      if (error) {
        showToast('加载数据失败，请稍后重试')
        return
      }

      setEntries((data ?? []).map(rowToEntry))
    }

    fetchCloudEntries()
  }, [session, isGuest])

  // 🚑 这里是彻底修复后的注册/登录逻辑！
  const handleAuth = async ({ email, password, isSignUp }) => {
    let authResponse;
    if (isSignUp) {
      authResponse = await supabase.auth.signUp({ email, password });
    } else {
      authResponse = await supabase.auth.signInWithPassword({ email, password });
    }

    const { error } = authResponse;

    if (error) {
      showToast(error.message);
      return;
    }

    showToast(isSignUp ? '注册成功！' : '登录成功！');
    setIsGuest(false)
    navigate('/');
  }

  const handleGuestLogin = () => {
    setIsGuest(true)
    setEntries(readGuestEntries())
    navigate('/')
  }

  const handleGoToLogin = () => {
    setIsGuest(false)
    setEntries([])
    navigate('/auth')
  }

  const handleTabChange = (tab) => {
    setCurrentTab(tab)
    if (tab === 'today') navigate('/')
    if (tab === 'history') navigate('/history')
    if (tab === 'profile') navigate('/profile')
  }

  const handleManualSync = async () => {
    if (isGuest || !session) return
    await fetchCloudEntries(true)
  }

  const handleLogout = async () => {
    if (isGuest) {
      setIsGuest(false)
      setEntries([])
      showToast('已退出游客模式')
      navigate('/auth')
      return
    }

    await supabase.auth.signOut()
    showToast('已退出登录')
    navigate('/auth')
  }

  const handleAddEntry = async (entry) => {
    if (isGuest) {
      const guestEntry = {
        ...entry,
        id: `guest-${Date.now()}`,
      }

      setEntries((prev) => {
        const next = [...prev, guestEntry]
        writeGuestEntries(next)
        return next
      })
      return
    }

    if (!session?.user) throw new Error('not-authenticated')

    const dateTimeIso = new Date(`${entry.date}T${entry.time}:00`).toISOString()
    const { data, error } = await supabase
      .from('entries')
      .insert({
        user_id: session.user.id,
        emoji: entry.emotion.emoji,
        label: entry.emotion.label,
        score: entry.score,
        text: entry.note,
        image_url: entry.image,
        is_favorite: entry.isFavorite,
        ai_feedback: entry.ai_feedback ?? null,
        created_at: dateTimeIso,
      })
      .select('id,user_id,emoji,label,score,text,image_url,is_favorite,created_at,ai_feedback')
      .single()

    if (error) throw error

    const appended = rowToEntry(data)
    setEntries((prev) => [...prev, appended])
  }

  const handleToggleFavorite = async (entryId) => {
    const target = entries.find((entry) => entry.id === entryId)
    if (!target) return

    const nextFavorite = !target.isFavorite

    if (isGuest) {
      setEntries((prev) => {
        const next = prev.map((entry) => (entry.id === entryId ? { ...entry, isFavorite: nextFavorite } : entry))
        writeGuestEntries(next)
        return next
      })
      return
    }

    const { error } = await supabase.from('entries').update({ is_favorite: nextFavorite }).eq('id', entryId)

    if (error) {
      showToast('收藏状态更新失败')
      return
    }

    setEntries((prev) => prev.map((entry) => (entry.id === entryId ? { ...entry, isFavorite: nextFavorite } : entry)))
  }

  const handleDeleteEntry = async (entryId) => {
    if (isGuest) {
      setEntries((prev) => {
        const next = prev.filter((entry) => entry.id !== entryId)
        writeGuestEntries(next)
        return next
      })
      showToast('删除成功')
      return true
    }

    const { error } = await supabase.from('entries').delete().eq('id', entryId)

    if (error) {
      showToast('删除失败，请稍后重试')
      return false
    }

    setEntries((prev) => prev.filter((entry) => entry.id !== entryId))
    showToast('删除成功')
    return true
  }

  const handleImportEntries = async (importedEntries) => {
    if (isGuest) {
      const normalized = readEntries(importedEntries)
      if (!normalized.length) return

      const base = Date.now()
      const guestRows = normalized.map((entry, index) => ({
        ...entry,
        id: `guest-${base + index}`,
      }))

      setEntries((prev) => {
        const next = [...prev, ...guestRows]
        writeGuestEntries(next)
        return next
      })
      showToast('导入成功')
      return
    }

    if (!session?.user) return

    const normalized = readEntries(importedEntries)
    if (!normalized.length) return

    const rows = normalized.map((entry) => ({
      user_id: session.user.id,
      emoji: entry.emotion.emoji,
      label: entry.emotion.label,
      score: entry.score,
      text: entry.note,
      image_url: entry.image,
      is_favorite: entry.isFavorite,
      ai_feedback: entry.ai_feedback ?? '',
      created_at: new Date(`${entry.date}T${entry.time}:00`).toISOString(),
    }))

    const { error } = await supabase.from('entries').insert(rows)
    if (error) {
      showToast('导入失败，请确认文件格式正确')
      return
    }

    showToast('数据导入成功！')
    window.setTimeout(() => window.location.reload(), 1500)
  }

  const historyDays = useMemo(() => groupEntriesByDay(entries), [entries])
  const withTabs =
    !location.pathname.startsWith('/add') &&
    !location.pathname.startsWith('/day/') &&
    !location.pathname.startsWith('/history/') &&
    !location.pathname.startsWith('/entry/')

  if (!session && !isGuest) {
    return (
      <>
        <Toast message={toastMessage} />
        <Routes>
          <Route path="/auth" element={<AuthPage onAuth={handleAuth} onGuestLogin={handleGuestLogin} />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </>
    )
  }

  return (
    <>
      <Toast message={toastMessage} />
      {withTabs ? (
        <AppLayout currentTab={currentTab} onTabChange={handleTabChange}>
          <Routes>
            <Route
              path="/"
              element={
                <TodayPage
                  entries={entries}
                  onToggleFavorite={handleToggleFavorite}
                  onLogout={handleLogout}
                  onDeleteEntry={handleDeleteEntry}
                />
              }
            />
            <Route
              path="/history"
              element={
                <HistoryPage
                  historyDays={historyDays}
                  entries={entries}
                  onToggleFavorite={handleToggleFavorite}
                  onDeleteEntry={handleDeleteEntry}
                />
              }
            />
            <Route
              path="/profile"
              element={
                <ProfilePage
                  session={session}
                  isGuest={isGuest}
                  entries={entries}
                  onLogout={handleLogout}
                  onLogin={handleGoToLogin}
                  onImportEntries={handleImportEntries}
                  onToast={showToast}
                  onSync={handleManualSync}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      ) : (
        <div className="mx-auto min-h-screen max-w-md bg-slate-50 px-4 pb-10 pt-5">
          <Routes>
            <Route path="/add" element={<AddEntryPage onSave={handleAddEntry} onToast={showToast} />} />
            <Route
              path="/day/:date"
              element={
                <DayListPage
                  entries={entries}
                  onToggleFavorite={handleToggleFavorite}
                  onDeleteEntry={handleDeleteEntry}
                />
              }
            />
            <Route path="/entry/:id" element={<EntryDetailPage entries={entries} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      )}
    </>
  )
}
