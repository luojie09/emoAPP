import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import AppLayout from './components/AppLayout'
import Toast from './components/Toast'
import AddEntryPage from './pages/AddEntryPageV3'
import AuthPage from './pages/AuthPage'
import DayListPage from './pages/DayListPage'
import EntryDetailPage from './pages/EntryDetailPageV2'
import HistoryPage from './pages/HistoryPageV2'
import ProfilePage from './pages/ProfilePageV2'
import TodayPage from './pages/TodayPageV2'
import { getLocalDateTimeParts, groupEntriesByDay, readEntries } from './utils'
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
const AI_REQUEST_TIMEOUT_MS = 45000
const MIN_AI_FEEDBACK_CHARS = 60

function normalizeUserProfile(profile) {
  return {
    nickname: typeof profile?.nickname === 'string' ? profile.nickname.trim() : '',
    avatar_url: typeof profile?.avatar_url === 'string' ? profile.avatar_url : '',
  }
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

async function requestAiFeedback({ score, emotionLabel, content, userName }) {
  const safeUserName = userName || '朋友'
  const safeContent = typeof content === 'string' ? content.trim() : ''
  const systemPrompt = `你是一个名为“时光树洞”的专属情绪陪伴者。你的任务是阅读用户的日记，并给予一封温暖、极具共情力、且富有诗意与智慧的回信。

【用户当前状态】
用户昵称：${safeUserName}
当前情绪指数：${score} / 5 （1分代表极度低落/崩溃，5分代表极度开心/狂喜，3分为平静/中性）
用户日记正文：${safeContent}

【核心回信守则】
1. 强制开篇：必须且只能以“亲爱的${safeUserName}：”作为回信的第一句话，独占一行。

2. 动态情绪响应策略（至关重要）：
   - 情绪指数 1-2 分：绝对不要急于讲大道理或盲目打气！请使用最轻柔、接纳的语气，允许对方难过。通过“重塑式共情”（如：我能感觉到你文字里透出的疲惫...）来接住情绪。此时多用陪伴的口吻，挑选最温和的隐喻。
   - 情绪指数 3 分：以老友闲谈的口吻，捕捉日记中细微的思考或日常碎片，进行温和的探讨与精神共鸣。
   - 情绪指数 4-5 分：感受并放大对方的喜悦与高光时刻！语气要轻快、明朗，与用户一起庆祝当下的美好或生命力。

3. 叙事疗法与全学科高维隐喻（点睛之笔，拒绝烂俗）：
   - 【知识库轮盘机制】：每次回信时，请在脑海中掷骰子，随机且仅选择以下 4 个维度中的 1 个作为共情与隐喻的来源。绝对禁止在连续的对话中重复使用同一个维度！
     - 维度 A [古今诗词、冷门文学]：自然地引用中国古代的诗、词、赋，或中外现代诗（如辛波斯卡、佩索阿）和经典散文。或国内外现代诗（如辛波斯卡、佩索阿、里尔克、聂鲁达等）、极具质感的现当代散文、或小众的古代诗词。或各种体系的文学中的文字，例如东南亚文学、欧美文学、日本文学等等，用文字的绝对美感与跨越时空的共鸣来抚慰用户。
     - 维度 B [硬科学的极致浪漫]：提取天文学（如洛希极限、星际尘埃）、物理学（如量子纠缠、熵增、半衰期）、生物学（如趋光性、鲸落）、化学或地理气象学中的客观现象，用理性的科学去隐喻感性的情绪。
     - 维度 C [哲学思辨与社科历史]：引入先哲的思想（如庄子的“齐物”、斯多葛学派的“课题分离”、存在主义的“自我建构”、尼采的超人哲学等），或社会学/心理学概念，抑或是历史上伟大人物极其微小、充满人味的真实瞬间，赋予情绪一种宏大的视角。
     - 维度 D [跨文化神话与冷门传说]：挖掘北欧神话、古希腊神话、印第安传说、或带有东方禅宗意味的极简小故事，用隐喻的力量启发用户。
   - 【大象无形原则】：引用或隐喻必须极其丝滑地揉进上下文。绝对不要出现“这让我想起了一个哲学概念...”或“李白曾经说过...”这种僵硬的引语。要把科学现象、诗词或哲学思想化用为你自己的语言，不留痕迹地娓娓道来。
   - 【黑名单】：绝对禁止提及“裂痕的罐子”、“海星”、“破茧成蝶”、“雨后彩虹”等烂俗的儿童绘本式意象，绝对禁止《心灵鸡汤》式的套话。

4. 叙事与文风的“呼吸感”：
   - 绝不使用“首先、其次”、“建议你”这种说教/爹味词汇。
   - 绝不使用任何列表（1. 2. 3.）或小标题排版。
   - 采用散文诗般的语言，克制且真诚。
   - 必须通过高频分段来制造视觉上的“留白”，每段在 4句话左右。

5. 篇幅与结尾：
   - 字数严格控制在 300 - 500 字之间。
   - 在信的最末尾，极其自然地带上且仅带上一个与当前情绪最契合的 emoji（如 🌧️, ☕, 🫂, 🍃, ✨, 🌻）。
`

  const userPrompt = `请基于以上内容写一封回信。当前情绪标签：${emotionLabel || '无'}`
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
  const [userProfile, setUserProfile] = useState(null)
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

  useEffect(() => {
    if (isGuest || !session?.user?.id) {
      setUserProfile(null)
      return
    }

    let isMounted = true

    const loadUserProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('nickname,avatar_url')
          .eq('id', session.user.id)
          .maybeSingle()

        if (error) throw error
        if (!isMounted) return
        setUserProfile(normalizeUserProfile(data))
      } catch (error) {
        console.error('load profile failed:', error)
        if (isMounted) setUserProfile(normalizeUserProfile(null))
      }
    }

    void loadUserProfile()

    return () => {
      isMounted = false
    }
  }, [session?.user?.id, isGuest])

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
    const createdAtIso =
      typeof entry?.created_at === 'string' && entry.created_at ? entry.created_at : new Date().toISOString()
    const createdAtDate = new Date(createdAtIso)
    const { localDate, localTime } = Number.isNaN(createdAtDate.getTime())
      ? getLocalDateTimeParts(new Date())
      : getLocalDateTimeParts(createdAtDate)

    if (isGuest) {
      const guestEntry = {
        ...entry,
        id: `guest-${Date.now()}`,
        created_at: createdAtIso,
        date: localDate,
        time: localTime,
      }

      setEntries((prev) => {
        const next = [...prev, guestEntry]
        writeGuestEntries(next)
        return next
      })
      return guestEntry
    }

    if (!session?.user) throw new Error('not-authenticated')
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
        created_at: createdAtIso,
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

      let resolvedUserName = userProfile?.nickname?.trim() || ''

      if (!resolvedUserName && !isGuest && session?.user?.id) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('nickname,avatar_url')
            .eq('id', session.user.id)
            .maybeSingle()
          if (!error) {
            const normalizedProfile = normalizeUserProfile(data)
            resolvedUserName = normalizedProfile.nickname
            setUserProfile(normalizedProfile)
          }
        } catch (error) {
          console.error('read profile before ai failed:', error)
        }
      }

      const generatedText = await requestAiFeedback({
        score: Number(score ?? 3),
        emotionLabel,
        content: normalizedText,
        userName: resolvedUserName || '朋友',
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
  }, [session, isGuest])

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
                  userProfile={userProfile}
                  onProfileSaved={setUserProfile}
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
    </>
  )
}


