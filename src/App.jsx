import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import AppLayout from './components/AppLayout'
import SetupProfileModal from './components/SetupProfileModal'
import Toast from './components/Toast'
import AddEntryPage from './pages/AddEntryPageV2'
import AuthPage from './pages/AuthPage'
import DayListPage from './pages/DayListPage'
import EntryDetailPage from './pages/EntryDetailPageV2'
import HistoryPage from './pages/HistoryPageV2'
import ProfilePage from './pages/ProfilePage'
import TodayPage from './pages/TodayPageV2'
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
const PENDING_AI_TASKS_KEY = 'pending_ai_tasks'
const AI_FEEDBACK_OVERRIDES_KEY = 'ai_feedback_overrides'
const GUEST_PROFILE_KEY = 'guest_profile'
const USER_PROFILE_CACHE_PREFIX = 'user_profile_'
const AI_REQUEST_TIMEOUT_MS = 45000
const MIN_AI_FEEDBACK_CHARS = 60

function getUserProfileCacheKey(userId) {
  return `${USER_PROFILE_CACHE_PREFIX}${String(userId ?? '')}`
}

function readGuestProfile() {
  const raw = localStorage.getItem(GUEST_PROFILE_KEY)
  if (!raw) return { nickname: '', avatar: '' }

  try {
    const parsed = JSON.parse(raw)
    return {
      nickname: typeof parsed?.nickname === 'string' ? parsed.nickname.trim() : '',
      avatar: typeof parsed?.avatar === 'string' ? parsed.avatar : '',
    }
  } catch {
    return { nickname: '', avatar: '' }
  }
}

function writeGuestProfile(profile) {
  localStorage.setItem(
    GUEST_PROFILE_KEY,
    JSON.stringify({
      nickname: typeof profile?.nickname === 'string' ? profile.nickname.trim() : '',
      avatar: typeof profile?.avatar === 'string' ? profile.avatar : '',
    }),
  )
}

function readUserProfileCache(userId) {
  if (!userId) return { nickname: '', avatar: '' }
  const raw = localStorage.getItem(getUserProfileCacheKey(userId))
  if (!raw) return { nickname: '', avatar: '' }

  try {
    const parsed = JSON.parse(raw)
    return {
      nickname: typeof parsed?.nickname === 'string' ? parsed.nickname.trim() : '',
      avatar: typeof parsed?.avatar === 'string' ? parsed.avatar : '',
    }
  } catch {
    return { nickname: '', avatar: '' }
  }
}

function writeUserProfileCache(userId, profile) {
  if (!userId) return
  localStorage.setItem(
    getUserProfileCacheKey(userId),
    JSON.stringify({
      nickname: typeof profile?.nickname === 'string' ? profile.nickname.trim() : '',
      avatar: typeof profile?.avatar === 'string' ? profile.avatar : '',
    }),
  )
}

function isAiFeedbackTooLongError(error) {
  const raw = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''} ${error?.code ?? ''}`.toLowerCase()
  return raw.includes('22001') || raw.includes('too long') || raw.includes('character varying')
}

function shrinkAiFeedback(text) {
  const normalized = String(text ?? '').trim()
  if (normalized.length <= MIN_AI_FEEDBACK_CHARS) return normalized
  const nextLength = Math.max(MIN_AI_FEEDBACK_CHARS, Math.floor(normalized.length * 0.6))
  return `${normalized.slice(0, nextLength).trimEnd()}...`
}

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

function readPendingAiTasks() {
  const raw = localStorage.getItem(PENDING_AI_TASKS_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writePendingAiTasks(tasks) {
  localStorage.setItem(PENDING_AI_TASKS_KEY, JSON.stringify(tasks))
}

function readAiFeedbackOverrides() {
  const raw = localStorage.getItem(AI_FEEDBACK_OVERRIDES_KEY)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAiFeedbackOverrides(overrides) {
  localStorage.setItem(AI_FEEDBACK_OVERRIDES_KEY, JSON.stringify(overrides))
}

function setAiFeedbackOverride(entryId, aiFeedback) {
  if (!entryId) return
  const normalized = typeof aiFeedback === 'string' ? aiFeedback.trim() : ''
  if (!normalized) return
  const overrides = readAiFeedbackOverrides()
  overrides[String(entryId)] = normalized
  writeAiFeedbackOverrides(overrides)
}

function removeAiFeedbackOverride(entryId) {
  if (!entryId) return
  const key = String(entryId)
  const overrides = readAiFeedbackOverrides()
  if (!(key in overrides)) return
  delete overrides[key]
  writeAiFeedbackOverrides(overrides)
}

function applyAiFeedbackOverrides(entries) {
  const overrides = readAiFeedbackOverrides()
  if (!entries?.length || !Object.keys(overrides).length) return entries

  return entries.map((entry) => {
    const key = String(entry.id)
    const overrideValue = overrides[key]
    const cloudValue = typeof entry.ai_feedback === 'string' ? entry.ai_feedback.trim() : ''
    if (typeof overrideValue === 'string' && overrideValue.trim() && !cloudValue) {
      return { ...entry, ai_feedback: overrideValue }
    }
    return entry
  })
}

function cleanupSyncedAiFeedbackOverrides(entries) {
  if (!entries?.length) return
  const overrides = readAiFeedbackOverrides()
  if (!Object.keys(overrides).length) return

  let changed = false
  for (const entry of entries) {
    const key = String(entry.id)
    const cloudValue = typeof entry.ai_feedback === 'string' ? entry.ai_feedback.trim() : ''
    if (cloudValue && overrides[key]) {
      delete overrides[key]
      changed = true
    }
  }

  if (changed) writeAiFeedbackOverrides(overrides)
}

function getTabFromPath(pathname) {
  if (pathname.startsWith('/history')) return 'history'
  if (pathname.startsWith('/profile')) return 'profile'
  return 'today'
}

function extractAiText(payload) {
  const primary = payload?.content ?? payload?.choices?.[0]?.message?.content
  let normalized = ''

  if (typeof primary === 'string') {
    normalized = primary.trim()
  } else if (Array.isArray(primary)) {
    normalized = primary
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && typeof item.text === 'string') return item.text
        return ''
      })
      .join('')
      .trim()
  }

  if (!normalized) {
    const fallback = payload?.choices?.[0]?.message?.reasoning_content ?? payload?.reasoning_content
    normalized = typeof fallback === 'string' ? fallback.trim() : ''
  }

  return normalized || null
}

async function requestAiFeedback({ score, emotionLabel, text, userNickname }) {
  const currentNickname = userNickname || '朋友'
  const systemPrompt = `你是一个名为“时光树洞”的专属情绪陪伴者。你的任务是阅读用户的日记，并给予一封温暖、极具共情力且富有智慧的回信。

【核心规则】
1. 润物无声的呼应（极其重要）：绝对不要像做阅读理解一样大段复述、总结或引用用户的原话！请用“默契老友”的视角，极其轻巧、自然地提及日记里的细节。营造出“心领神会”的默契感，拒绝做内容摘要。
2. 情感同频与承接：
   - 面对高分（4-5分）：做快乐的放大器，陪他们一起庆祝生活中的小确幸，分享这份明媚。
   - 面对平淡（3分）：做安静的倾听者，认可日常的平静也是一种难得的力量。
   - 面对低分（1-2分）：做绝对安全的情绪底座。接纳负能量，不喊“一切都会好起来”的空洞口号。
3. 叙事疗法与哲理升华（点睛之笔）：
   - 拒绝干巴巴的大道理。在合适的时候，请以“分享”的姿态，自然地引入一句恰当的中外古诗词、文学大家的名言；或者讲述一个简短、有内涵的中外传说与寓言故事来作为隐喻。
   - 引用必须极其贴切自然，绝不能生搬硬套或显得幼稚。要通过优美的意象或故事去启发用户，让他们自己找到内心的平静。
4. 语气与口吻：使用第一人称（我）与第二人称（你）对话。语言要像散文诗一样温柔、真诚、克制，带有淡淡的治愈感。如果需要给出建议，必须是“启发式”和“探讨式”的，绝对不能居高临下或带有“爹味”。
5. 格式与篇幅：字数严格控制在 300 到 500 字之间（根据情绪深度自行把控）。
【信件格式强制要求】：你的回信第一行必须严格以“亲爱的${currentNickname}：”开头，单独成行！然后再另起一行开始正文。
绝对不要使用任何列表（如 1. 2. 3.）或小标题。务必适当分段（每段 2-3 句话即可），保持排版的高度呼吸感。结尾自然地带一个温暖的 emoji（如 ✨, 🫂, ☕, 🍃, 🦋）。`

  const userPrompt = `【今日心情】：${score}分\n【情绪标签】：${emotionLabel || '无'}\n【日记正文】：${text}`
  const body = {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS)

  try {
    const proxyResponse = await fetch('/api/treehole-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!proxyResponse.ok) {
      const errorText = await proxyResponse.text().catch(() => '')
      console.error('AI proxy request failed:', proxyResponse.status, errorText)
      return null
    }

    const json = await proxyResponse.json()
    const normalized = extractAiText(json)
    if (!normalized) {
      console.error('AI proxy response was empty:', json)
    }
    return normalized
  } catch (error) {
    console.error('AI proxy request threw:', error)
    return null
  } finally {
    window.clearTimeout(timer)
  }
}
export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const pendingAiProcessorRef = useRef(false)
  const [entries, setEntries] = useState([])
  const [toastMessage, setToastMessage] = useState('')
  const [session, setSession] = useState(null)
  const [isGuest, setIsGuest] = useState(false)
  const [userProfile, setUserProfile] = useState({ nickname: '', avatar: '' })
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const [isProfileSetupRequired, setIsProfileSetupRequired] = useState(false)
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

  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      if (isGuest) {
        const guestProfile = readGuestProfile()
        if (!cancelled) {
          setUserProfile(guestProfile)
          setIsProfileSetupRequired(false)
          setIsProfileLoading(false)
        }
        return
      }

      if (!session?.user) {
        if (!cancelled) {
          setUserProfile({ nickname: '', avatar: '' })
          setIsProfileSetupRequired(false)
          setIsProfileLoading(false)
        }
        return
      }

      if (!cancelled) setIsProfileLoading(true)

      const userId = session.user.id
      const metadata = session.user.user_metadata ?? {}
      let nickname = typeof metadata.nickname === 'string' ? metadata.nickname.trim() : ''
      let avatar = typeof metadata.avatar_url === 'string' ? metadata.avatar_url : ''

      if (!nickname) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('nickname,avatar_url')
            .eq('id', userId)
            .maybeSingle()
          if (data) {
            nickname = typeof data.nickname === 'string' ? data.nickname.trim() : nickname
            avatar = typeof data.avatar_url === 'string' ? data.avatar_url : avatar
          }
        } catch {
          // If profiles table is not available, continue with metadata/cache.
        }
      }

      const cached = readUserProfileCache(userId)
      if (!nickname && cached.nickname) nickname = cached.nickname
      if (!avatar && cached.avatar) avatar = cached.avatar

      if (nickname) {
        writeUserProfileCache(userId, { nickname, avatar })
      }

      if (!cancelled) {
        setUserProfile({ nickname, avatar })
        setIsProfileSetupRequired(!nickname)
        setIsProfileLoading(false)
      }
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [session, isGuest])

  const fetchCloudEntries = async (showSuccessToast = false) => {
    if (!session) return false

    const { data, error } = await supabase
      .from('entries')
      .select('id,user_id,emoji,label,score,text,image_url,is_favorite,created_at,ai_feedback')
      .order('created_at', { ascending: false })

    if (error) {
      showToast('鍔犺浇鏁版嵁澶辫触锛岃绋嶅悗閲嶈瘯')
      return false
    }

    const mappedEntries = (data ?? []).map(rowToEntry)
    cleanupSyncedAiFeedbackOverrides(mappedEntries)
    setEntries(applyAiFeedbackOverrides(mappedEntries))
    if (showSuccessToast) showToast('浜戠鍚屾瀹屾垚')
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
        showToast('鍔犺浇鏁版嵁澶辫触锛岃绋嶅悗閲嶈瘯')
        return
      }

      const mappedEntries = (data ?? []).map(rowToEntry)
      cleanupSyncedAiFeedbackOverrides(mappedEntries)
      setEntries(applyAiFeedbackOverrides(mappedEntries))
    }

    fetchCloudEntries()
  }, [session, isGuest])

  const handleAuth = async ({ email, password, isSignUp }) => {
    const authResponse = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    const { error } = authResponse
    if (error) {
      showToast(error.message)
      return
    }

    showToast(isSignUp ? '注册成功' : '登录成功')
    setIsGuest(false)
    navigate('/')
  }

  const handleGuestLogin = () => {
    setIsGuest(true)
    setEntries(readGuestEntries())
    setUserProfile(readGuestProfile())
    setIsProfileSetupRequired(false)
    navigate('/')
  }

  const handleGoToLogin = () => {
    setIsGuest(false)
    setEntries([])
    setUserProfile({ nickname: '', avatar: '' })
    setIsProfileSetupRequired(false)
    navigate('/auth')
  }

  const handleSaveUserProfile = async ({ nickname, avatar }) => {
    const normalizedNickname = String(nickname ?? '').trim()
    const normalizedAvatar = typeof avatar === 'string' ? avatar : ''
    if (!normalizedNickname) throw new Error('nickname-required')

    if (isGuest) {
      const next = { nickname: normalizedNickname, avatar: normalizedAvatar }
      writeGuestProfile(next)
      setUserProfile(next)
      setIsProfileSetupRequired(false)
      return next
    }

    if (!session?.user) throw new Error('not-authenticated')

    const userId = session.user.id
    let hasAnySuccess = false
    let latestError = null

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        nickname: normalizedNickname,
        avatar_url: normalizedAvatar || null,
      },
    })
    if (authError) {
      latestError = authError
    } else {
      hasAnySuccess = true
    }

    try {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        nickname: normalizedNickname,
        avatar_url: normalizedAvatar || null,
        updated_at: new Date().toISOString(),
      })
      if (profileError) {
        latestError = profileError
      } else {
        hasAnySuccess = true
      }
    } catch (error) {
      latestError = error
    }

    if (!hasAnySuccess && latestError) {
      throw latestError
    }

    const next = { nickname: normalizedNickname, avatar: normalizedAvatar }
    writeUserProfileCache(userId, next)
    setUserProfile(next)
    setIsProfileSetupRequired(false)
    return next
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
      setUserProfile({ nickname: '', avatar: '' })
      setIsProfileSetupRequired(false)
      showToast('已退出游客模式')
      navigate('/auth')
      return
    }

    await supabase.auth.signOut()
    setUserProfile({ nickname: '', avatar: '' })
    setIsProfileSetupRequired(false)
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
      return guestEntry
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
    return appended
  }

  const enqueuePendingAiTask = (task) => {
    if (!task?.entryId || !task?.text) return
    const existing = readPendingAiTasks()
    const deduped = existing.filter((item) => String(item.entryId) !== String(task.entryId))
    deduped.push(task)
    writePendingAiTasks(deduped)
  }

  const removePendingAiTask = (entryId) => {
    const next = readPendingAiTasks().filter((item) => String(item.entryId) !== String(entryId))
    writePendingAiTasks(next)
  }

  const generateAndSaveAIFeedback = async (newEntryId, text, score, emotionLabel = '') => {
    try {
      const normalizedText = typeof text === 'string' ? text.trim() : ''
      if (!newEntryId || !normalizedText) {
        removePendingAiTask(newEntryId)
        return false
      }

      const generatedText = await requestAiFeedback({
        score: Number(score ?? 3),
        emotionLabel,
        text: normalizedText,
        userNickname: userProfile.nickname,
      })
      if (!generatedText) return false

      if (isGuest) {
        const localEntries = readGuestEntries()
        const next = localEntries.map((entry) =>
          String(entry.id) === String(newEntryId) ? { ...entry, ai_feedback: generatedText } : entry,
        )
        writeGuestEntries(next)
        setEntries(next)
        removePendingAiTask(newEntryId)
        return true
      }

      if (!session?.user) return false

      const updateAiFeedback = async (content) =>
        supabase
          .from('entries')
          .update({ ai_feedback: content })
          .eq('user_id', session.user.id)
          .eq('id', newEntryId)
          .select('id, ai_feedback')
          .maybeSingle()

      let feedbackToSave = generatedText
      let updateResult = await updateAiFeedback(feedbackToSave)
      let retryCount = 0

      while (updateResult.error && isAiFeedbackTooLongError(updateResult.error) && retryCount < 4) {
        const shrunk = shrinkAiFeedback(feedbackToSave)
        if (!shrunk || shrunk === feedbackToSave) break
        feedbackToSave = shrunk
        retryCount += 1
        updateResult = await updateAiFeedback(feedbackToSave)
      }

      const { data, error } = updateResult

      if (error) {
        console.error('AI feedback update failed:', error)
        setAiFeedbackOverride(newEntryId, feedbackToSave)
        setEntries((prev) =>
          prev.map((entry) => (String(entry.id) === String(newEntryId) ? { ...entry, ai_feedback: feedbackToSave } : entry)),
        )
        removePendingAiTask(newEntryId)
        return true
      }

      if (!data) {
        console.error('AI feedback update affected 0 rows:', {
          entryId: newEntryId,
          userId: session.user.id,
        })
        setAiFeedbackOverride(newEntryId, feedbackToSave)
        setEntries((prev) =>
          prev.map((entry) => (String(entry.id) === String(newEntryId) ? { ...entry, ai_feedback: feedbackToSave } : entry)),
        )
        removePendingAiTask(newEntryId)
        return true
      }

      removeAiFeedbackOverride(newEntryId)
      setEntries((prev) =>
        prev.map((entry) => (String(entry.id) === String(newEntryId) ? { ...entry, ai_feedback: feedbackToSave } : entry)),
      )
      removePendingAiTask(newEntryId)
      void fetchCloudEntries()
      return true
    } catch (error) {
      console.error('generateAndSaveAIFeedback failed:', error)
      return false
    }
  }

  useEffect(() => {
    if (!Array.isArray(entries) || !entries.length) return

    const existingTasks = readPendingAiTasks()
    const queuedIds = new Set(existingTasks.map((item) => String(item.entryId)))
    const nextTasks = [...existingTasks]

    for (const entry of entries) {
      const noteText = typeof entry?.note === 'string' ? entry.note.trim() : ''
      const replyText = typeof entry?.ai_feedback === 'string' ? entry.ai_feedback.trim() : ''
      if (!noteText || replyText) continue

      const entryId = String(entry.id)
      if (queuedIds.has(entryId)) continue

      queuedIds.add(entryId)
      nextTasks.push({
        entryId: entry.id,
        text: noteText,
        score: Number(entry?.emotion?.score ?? entry?.score ?? 3),
        emotionLabel: entry?.emotion?.label ?? entry?.mood ?? '',
      })
    }

    if (nextTasks.length !== existingTasks.length) {
      writePendingAiTasks(nextTasks)
    }
  }, [entries])

  useEffect(() => {
    const processPendingAiTasks = async () => {
      if (pendingAiProcessorRef.current) return
      const tasks = readPendingAiTasks()
      if (!tasks.length) return

      pendingAiProcessorRef.current = true

      try {
        for (const task of tasks) {
          await generateAndSaveAIFeedback(task.entryId, task.text, task.score, task.emotionLabel)
        }
      } finally {
        pendingAiProcessorRef.current = false
      }
    }

    void processPendingAiTasks()

    const intervalId = window.setInterval(() => {
      void processPendingAiTasks()
    }, 15000)

    return () => window.clearInterval(intervalId)
  }, [session, isGuest, userProfile.nickname])

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
      showToast('鍒犻櫎鎴愬姛')
      return true
    }

    const { error } = await supabase.from('entries').delete().eq('id', entryId)

    if (error) {
      showToast('鍒犻櫎澶辫触锛岃绋嶅悗閲嶈瘯')
      return false
    }

    setEntries((prev) => prev.filter((entry) => entry.id !== entryId))
    showToast('鍒犻櫎鎴愬姛')
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
      showToast('瀵煎叆鎴愬姛')
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
      showToast('瀵煎叆澶辫触锛岃纭鏂囦欢鏍煎紡姝ｇ‘')
      return
    }

    showToast('数据导入成功')
    window.setTimeout(() => window.location.reload(), 1500)
  }

  const historyDays = useMemo(() => groupEntriesByDay(entries), [entries])
  const withTabs =
    !location.pathname.startsWith('/add') &&
    !location.pathname.startsWith('/day/') &&
    !location.pathname.startsWith('/history/') &&
    !location.pathname.startsWith('/entry/')

  if (session && !isGuest && isProfileLoading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-slate-50">
        <div className="text-sm text-gray-500">正在准备你的树洞...</div>
      </div>
    )
  }

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
                  userProfile={userProfile}
                  entries={entries}
                  onLogout={handleLogout}
                  onLogin={handleGoToLogin}
                  onSaveProfile={handleSaveUserProfile}
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
            <Route
              path="/add"
              element={
                <AddEntryPage
                  onSave={handleAddEntry}
                  onQueueAiTask={enqueuePendingAiTask}
                  onToast={showToast}
                  onGenerateAiFeedback={generateAndSaveAIFeedback}
                />
              }
            />
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

      <SetupProfileModal
        isOpen={Boolean(session && !isGuest && isProfileSetupRequired)}
        forceSetup
        initialNickname={userProfile.nickname}
        initialAvatar={userProfile.avatar}
        onSave={async (profile) => {
          await handleSaveUserProfile(profile)
          showToast('资料已保存')
        }}
        onError={() => showToast('保存资料失败，请稍后重试')}
      />
    </>
  )
}


