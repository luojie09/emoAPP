import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import Layout from './components/Layout'
import Toast from './components/Toast'
import AddEntryPage from './pages/AddEntryPage'
import AuthPage from './pages/AuthPage'
import DayDetailPage from './pages/DayDetailPage'
import HistoryPage from './pages/HistoryPageModern'
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
  }
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [toastMessage, setToastMessage] = useState('')
  const [session, setSession] = useState(null)

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
    if (!session) {
      setEntries([])
      return
    }

    const loadEntries = async () => {
      const { data, error } = await supabase
        .from('entries')
        .select('id,user_id,emoji,label,score,text,image_url,is_favorite,created_at')
        .order('created_at', { ascending: false })

      if (error) {
        showToast('加载数据失败，请稍后重试')
        return
      }

      setEntries((data ?? []).map(rowToEntry))
    }

    loadEntries()
  }, [session])

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
    navigate('/');
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    showToast('已退出登录')
    navigate('/auth')
  }

  const handleAddEntry = async (entry) => {
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
        created_at: dateTimeIso,
      })
      .select('id,user_id,emoji,label,score,text,image_url,is_favorite,created_at')
      .single()

    if (error) throw error

    const appended = rowToEntry(data)
    setEntries((prev) => [...prev, appended])
  }

  const handleToggleFavorite = async (entryId) => {
    const target = entries.find((entry) => entry.id === entryId)
    if (!target) return

    const nextFavorite = !target.isFavorite
    const { error } = await supabase.from('entries').update({ is_favorite: nextFavorite }).eq('id', entryId)

    if (error) {
      showToast('收藏状态更新失败')
      return
    }

    setEntries((prev) => prev.map((entry) => (entry.id === entryId ? { ...entry, isFavorite: nextFavorite } : entry)))
  }

  const handleDeleteEntry = async (entryId) => {
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
  const withTabs = !location.pathname.startsWith('/add') && !location.pathname.startsWith('/history/')

  if (!session) {
    return (
      <>
        <Toast message={toastMessage} />
        <Routes>
          <Route path="/auth" element={<AuthPage onAuth={handleAuth} />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </>
    )
  }

  return (
    <>
      <Toast message={toastMessage} />
      {withTabs ? (
        <Layout>
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
                  onToast={showToast}
                  onImportEntries={handleImportEntries}
                  onLogout={handleLogout}
                  onToggleFavorite={handleToggleFavorite}
                  onDeleteEntry={handleDeleteEntry}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      ) : (
        <div className="mx-auto min-h-screen max-w-md bg-slate-50 px-4 pb-10 pt-5">
          <Routes>
            <Route path="/add" element={<AddEntryPage onSave={handleAddEntry} onToast={showToast} />} />
            <Route
              path="/history/:date"
              element={<DayDetailPage entries={entries} onToggleFavorite={handleToggleFavorite} onDeleteEntry={handleDeleteEntry} />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      )}
    </>
  )
}
