import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import AppLayout from './components/AppLayout'
import Toast from './components/Toast'
import AddEntryPage from './pages/AddEntryPageV3'
import AuthPage from './pages/AuthPage'
import DayListPage from './pages/DayListPage'
import EntryDetailPage from './pages/EntryDetailPageV2'
import HistoryPage from './pages/HistoryPageV2'
import InsightPage from './pages/Insight'
import ProfilePage from './pages/ProfilePageV2'
import TodayPage from './pages/TodayPageV2'
import { getLocalDateTimeParts, groupEntriesByDay, readEntries } from './utils'
import { supabase } from './supabaseClient'

const ENTRY_SELECT_WITH_KEYWORDS = 'id,user_id,emoji,label,score,text,image_url,is_favorite,created_at,ai_feedback,keywords'
const ENTRY_SELECT_BASE = 'id,user_id,emoji,label,score,text,image_url,is_favorite,created_at,ai_feedback'

function isMissingKeywordsColumnError(error) {
  const raw = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''} ${error?.code ?? ''}`.toLowerCase()
  return raw.includes('keywords') && (raw.includes('column') || raw.includes('schema') || raw.includes('select'))
}

async function fetchEntriesRows() {
  let result = await supabase.from('entries').select(ENTRY_SELECT_WITH_KEYWORDS).order('created_at', { ascending: false })

  if (result.error && isMissingKeywordsColumnError(result.error)) {
    result = await supabase.from('entries').select(ENTRY_SELECT_BASE).order('created_at', { ascending: false })
  }

  return result
}

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
    ai_keywords: normalizeAiKeywords(row.ai_keywords ?? row.keywords ?? []),
  }
}

const GUEST_ENTRIES_KEY = 'guest_entries'
const PENDING_AI_TASKS_KEY = 'pending_ai_tasks'
const AI_FEEDBACK_OVERRIDES_KEY = 'ai_feedback_overrides'
const AI_KEYWORDS_OVERRIDES_KEY = 'ai_keywords_overrides'
const AI_REQUEST_TIMEOUT_MS = 120000
const AI_RETRY_BASE_DELAY_MS = 15000
const AI_RETRY_MAX_DELAY_MS = 5 * 60 * 1000
const MIN_AI_FEEDBACK_CHARS = 60

function normalizeAiKeywordItem(item) {
  if (!item || typeof item !== 'object') return null

  const word = typeof item.word === 'string' ? item.word.trim() : ''
  const type = item.type === 'negative' ? 'negative' : item.type === 'positive' ? 'positive' : ''
  if (!word || !type) return null

  const cleanedWord = word.replace(/[^\u4e00-\u9fa5A-Za-z]/g, '').trim()
  if (!cleanedWord || cleanedWord.length < 2 || cleanedWord.length > 4) return null

  const blacklist = ['图片', '视频', '分享', 'jpeg', 'jpg', 'png', 'gif', '链接']
  if (blacklist.includes(cleanedWord.toLowerCase())) return null

  return { word: cleanedWord, type }
}

function normalizeAiKeywords(value) {
  if (!Array.isArray(value)) return []

  const seen = new Set()
  const normalized = []

  for (const item of value) {
    const keyword = normalizeAiKeywordItem(item)
    if (!keyword) continue
    const dedupeKey = `${keyword.type}:${keyword.word}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    normalized.push(keyword)
    if (normalized.length >= 2) break
  }

  return normalized
}

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
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((task) => ({
        entryId: task?.entryId,
        text: typeof task?.text === 'string' ? task.text : '',
        score: Number(task?.score ?? 3),
        emotionLabel: typeof task?.emotionLabel === 'string' ? task.emotionLabel : '',
        attemptCount: Number.isFinite(Number(task?.attemptCount)) ? Number(task.attemptCount) : 0,
        nextRetryAt: Number.isFinite(Number(task?.nextRetryAt)) ? Number(task.nextRetryAt) : 0,
      }))
      .filter((task) => task.entryId && task.text)
  } catch {
    return []
  }
}

function writePendingAiTasks(tasks) {
  localStorage.setItem(PENDING_AI_TASKS_KEY, JSON.stringify(tasks))
}

function getNextAiRetryDelay(attemptCount) {
  return Math.min(AI_RETRY_MAX_DELAY_MS, AI_RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attemptCount))
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

function readAiKeywordsOverrides() {
  const raw = localStorage.getItem(AI_KEYWORDS_OVERRIDES_KEY)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAiKeywordsOverrides(overrides) {
  localStorage.setItem(AI_KEYWORDS_OVERRIDES_KEY, JSON.stringify(overrides))
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

function setAiKeywordsOverride(entryId, keywords) {
  if (!entryId) return
  const normalized = normalizeAiKeywords(keywords)
  if (!normalized.length) return
  const overrides = readAiKeywordsOverrides()
  overrides[String(entryId)] = normalized
  writeAiKeywordsOverrides(overrides)
}

function removeAiKeywordsOverride(entryId) {
  if (!entryId) return
  const key = String(entryId)
  const overrides = readAiKeywordsOverrides()
  if (!(key in overrides)) return
  delete overrides[key]
  writeAiKeywordsOverrides(overrides)
}

function applyAiFeedbackOverrides(entries) {
  const overrides = readAiFeedbackOverrides()
  const keywordOverrides = readAiKeywordsOverrides()
  if (!entries?.length || (!Object.keys(overrides).length && !Object.keys(keywordOverrides).length)) return entries

  return entries.map((entry) => {
    const key = String(entry.id)
    const overrideValue = overrides[key]
    const cloudValue = typeof entry.ai_feedback === 'string' ? entry.ai_feedback.trim() : ''
    const keywordOverrideValue = normalizeAiKeywords(keywordOverrides[key])

    let nextEntry = entry
    if (typeof overrideValue === 'string' && overrideValue.trim() && !cloudValue) {
      nextEntry = { ...nextEntry, ai_feedback: overrideValue }
    }
    if (keywordOverrideValue.length && !(Array.isArray(nextEntry.ai_keywords) && nextEntry.ai_keywords.length)) {
      nextEntry = { ...nextEntry, ai_keywords: keywordOverrideValue }
    }
    return nextEntry
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

function cleanupSyncedAiKeywordsOverrides(entries) {
  if (!entries?.length) return
  const overrides = readAiKeywordsOverrides()
  if (!Object.keys(overrides).length) return

  let changed = false
  for (const entry of entries) {
    const key = String(entry.id)
    const cloudKeywords = normalizeAiKeywords(entry.ai_keywords)
    if (cloudKeywords.length && overrides[key]) {
      delete overrides[key]
      changed = true
    }
  }

  if (changed) writeAiKeywordsOverrides(overrides)
}

function getTabFromPath(pathname) {
  if (pathname.startsWith('/history')) return 'history'
  if (pathname.startsWith('/insight')) return 'insight'
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

function parseAiResponsePayload(payload) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const directReply = typeof payload.reply === 'string' ? payload.reply.trim() : ''
    if (directReply) {
      return {
        reply: directReply,
        keywords: normalizeAiKeywords(payload.keywords),
      }
    }
  }

  const rawText = extractAiText(payload)
  if (!rawText) return { reply: null, keywords: [] }

  const normalizedText = String(rawText)
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  const tryParse = (value) => {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  const parsed =
    tryParse(normalizedText) ??
    (() => {
      const startIndex = normalizedText.indexOf('{')
      const endIndex = normalizedText.lastIndexOf('}')
      if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) return null
      return tryParse(normalizedText.slice(startIndex, endIndex + 1))
    })()

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : ''
    return {
      reply: reply || null,
      keywords: normalizeAiKeywords(parsed.keywords),
    }
  }

  return { reply: normalizedText || null, keywords: [] }
}

async function requestAiFeedback({ score, emotionLabel, content, userName }) {
  const safeUserName = userName || '朋友'
  const safeContent = typeof content === 'string' ? content.trim() : ''
  const safeScore = Number.isFinite(Number(score)) ? Number(score) : 3
  const granularMetaphors = [
    '中国古代诗词（侧重引用李白、苏轼等豪放派的豁达与磅礴意象）',
    '中国古代诗词（侧重引用婉约派的细腻与温柔意象）',
    '欧美现代诗（如辛波斯卡、佩索阿、里尔克等，侧重生活哲理与现代人的精神共鸣）',
    '极具质感的现当代散文或细腻的日本文学/东南亚文学片段',
    '天文学的极致浪漫（必须且只能使用天文学现象，如洛希极限、星际尘埃、双星系统、事件视界等）',
    '物理与化学的冷峻浪漫（必须且只能使用理化概念，如量子纠缠、熵增、半衰期、化学键、结晶等）',
    '生物学的坚韧隐喻（必须且只能使用生物现象，如趋光性、鲸落、共生关系、休眠期、细胞更新等）',
    '地理气象学的宏大视角（必须且只能使用地质/气象现象，如洋流、季风、地壳运动、喀斯特地貌、极光等）',
    '东方古典哲学（侧重庄子的“齐物”或老子的自然无为、顺应规律）',
    '斯多葛学派智慧（侧重课题分离、控制二分法、保持内在的绝对稳定）',
    '西方现代哲学（侧重存在主义的“自我建构”、尼采的超人哲学，赋予痛苦以意义）',
    '社科历史的人文微光（讲述历史上伟大人物极其微小、充满人味的真实瞬间，或有趣的心理学/社会学效应）',
    '北欧或古希腊神话中的隐喻与意象',
    '印第安传说或冷门的小众跨文化古老传说',
    '带有东方禅宗意味的极简小故事或寓言',
  ]
  const randomMetaphor = granularMetaphors[Math.floor(Math.random() * granularMetaphors.length)]

  const systemPrompt = `你是一个名为“时光树洞”的专属情绪陪伴者。你的任务是阅读用户的日记，并给予一封温暖、极具共情力、且富有诗意与智慧的回信。

【用户当前状态】
用户昵称：${safeUserName}
当前情绪指数：${safeScore} / 5 （1分代表极度低落/崩溃，5分代表极度开心/狂喜，3分为平静/中性）
用户日记正文：${safeContent}

【核心回信守则】
1. 强制开篇：必须且只能以“亲爱的${safeUserName}：”作为回信的第一句话，独占一行。

2. 动态情绪响应策略（至关重要）：
   - 情绪指数 1-2 分：绝对不要急于讲大道理或盲目打气！请使用最轻柔、接纳的语气，允许对方难过。通过“重塑式共情”（如：我能感觉到你文字里透出的疲惫...）来接住情绪。此时多用陪伴的口吻，挑选最温和的隐喻。
   - 情绪指数 3 分：以老友闲谈的口吻，捕捉日记中细微的思考或日常碎片，进行温和的探讨与精神共鸣。
   - 情绪指数 4-5 分：感受并放大对方的喜悦与高光时刻！语气要轻快、明朗，与用户一起庆祝当下的美好或生命力。

3. 叙事疗法与高维隐喻（点睛之笔，拒绝烂俗）：
   - 【本次回信强制使用的隐喻维度】：${randomMetaphor}
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

【强制输出格式与生活碎片提炼法则】
你必须且只能返回一个合法的 JSON 格式对象，绝对不要包含任何 Markdown 标记。
JSON 结构如下：
{
  "reply": "这里是你生成的那封300-500字的回信正文",
  "keywords": [
    {"word": "词汇1", "type": "positive"},
    {"word": "词汇2", "type": "negative"}
  ]
}

【Keywords 提炼最高准则】（违背将导致系统崩溃！）
1. 词汇性质（核心变化）：绝对不要提取空泛的情绪词（如“开心”、“难过”）。你必须提取日记中引发该情绪的核心事件、具体事物、或具有画面感的意象。
   - 示例 1：用户很开心，日记提到去公园感受春天。正确提取 -> {"word": "春日", "type": "positive"}
   - 示例 2：用户很崩溃，日记提到今天面试搞砸了。正确提取 -> {"word": "面试", "type": "negative"}
   - 示例 3：用户很平静，日记提到喝了一杯好喝的拿铁。正确提取 -> {"word": "咖啡", "type": "positive"}
2. 长度与字数：必须严格提炼为 2 到 4 个汉字的精简词汇。绝对禁止提取短语或句子。
3. 黑名单（绝对禁止提取）：
   - 彻底屏蔽系统/技术词汇：图片、视频、分享、jpeg、链接等。
   - 彻底屏蔽口语化废话、代词、动词短语：我想、他想、那么、然后、在这里、哈哈、不管怎么样、觉得好累等。
4. 分类依据（基于该事物在日记中带给用户的感受）：
   - "positive"（能量源泉）：在日记中带给用户治愈、美好、希望、力量的事物/事件。
   - "negative"（需要和解）：在日记中给用户带来压力、挫败、消耗、焦虑的事物/事件。
5. 数量：每次最多只提炼 1 到 2 个最核心的生活碎片词汇，宁缺毋滥。如果没有具体的具象词，可以返回空数组 []。
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
    const normalized = parseAiResponsePayload(json)
    if (!normalized.reply) {
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
  const aiInFlightRef = useRef(new Set())
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

    const { data, error } = await fetchEntriesRows()

    if (error) {
      showToast('鍔犺浇鏁版嵁澶辫触锛岃绋嶅悗閲嶈瘯')
      return false
    }

    const mappedEntries = (data ?? []).map(rowToEntry)
    cleanupSyncedAiFeedbackOverrides(mappedEntries)
    cleanupSyncedAiKeywordsOverrides(mappedEntries)
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
      const { data, error } = await fetchEntriesRows()

      if (error) {
        showToast('鍔犺浇鏁版嵁澶辫触锛岃绋嶅悗閲嶈瘯')
        return
      }

      const mappedEntries = (data ?? []).map(rowToEntry)
      cleanupSyncedAiFeedbackOverrides(mappedEntries)
      cleanupSyncedAiKeywordsOverrides(mappedEntries)
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
    if (tab === 'insight') navigate('/insight')
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
    const insertPayload = {
      user_id: session.user.id,
      emoji: entry.emotion.emoji,
      label: entry.emotion.label,
      score: entry.score,
      text: entry.note,
      image_url: entry.image,
      is_favorite: entry.isFavorite,
      ai_feedback: entry.ai_feedback ?? null,
      keywords: normalizeAiKeywords(entry.ai_keywords ?? entry.keywords ?? []),
      created_at: createdAtIso,
    }
    let insertResult = await supabase.from('entries').insert(insertPayload).select(ENTRY_SELECT_WITH_KEYWORDS).single()

    if (insertResult.error && isMissingKeywordsColumnError(insertResult.error)) {
      const { keywords, ...fallbackPayload } = insertPayload
      insertResult = await supabase.from('entries').insert(fallbackPayload).select(ENTRY_SELECT_BASE).single()
    }

    const { data, error } = insertResult

    if (error) throw error

    const appended = rowToEntry(data)
    setEntries((prev) => [...prev, appended])
    return appended
  }

  const enqueuePendingAiTask = (task) => {
    if (!task?.entryId || !task?.text) return
    const existing = readPendingAiTasks()
    const currentTask = existing.find((item) => String(item.entryId) === String(task.entryId))
    const deduped = existing.filter((item) => String(item.entryId) !== String(task.entryId))
    deduped.push({
      entryId: task.entryId,
      text: task.text,
      score: Number(task?.score ?? currentTask?.score ?? 3),
      emotionLabel: task?.emotionLabel ?? currentTask?.emotionLabel ?? '',
      attemptCount: currentTask?.attemptCount ?? 0,
      nextRetryAt: currentTask?.nextRetryAt ?? 0,
    })
    writePendingAiTasks(deduped)
  }

  const removePendingAiTask = (entryId) => {
    const next = readPendingAiTasks().filter((item) => String(item.entryId) !== String(entryId))
    writePendingAiTasks(next)
  }

  const schedulePendingAiRetry = (entryId) => {
    if (!entryId) return
    const next = readPendingAiTasks().map((item) => {
      if (String(item.entryId) !== String(entryId)) return item
      const attemptCount = Number(item?.attemptCount ?? 0) + 1
      return {
        ...item,
        attemptCount,
        nextRetryAt: Date.now() + getNextAiRetryDelay(attemptCount),
      }
    })
    writePendingAiTasks(next)
  }

  const generateAndSaveAIFeedback = async (newEntryId, text, score, emotionLabel = '') => {
    const taskKey = String(newEntryId ?? '')
    if (!taskKey) return 'fatal'
    if (aiInFlightRef.current.has(taskKey)) return 'inflight'
    aiInFlightRef.current.add(taskKey)

    try {
      const normalizedText = typeof text === 'string' ? text.trim() : ''
      if (!newEntryId || !normalizedText) {
        removePendingAiTask(newEntryId)
        return 'fatal'
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

      const aiResult = await requestAiFeedback({
        score: Number(score ?? 3),
        emotionLabel,
        content: normalizedText,
        userName: resolvedUserName || '朋友',
      })
      const generatedText = typeof aiResult?.reply === 'string' ? aiResult.reply.trim() : ''
      const generatedKeywords = normalizeAiKeywords(aiResult?.keywords)

      if (!generatedText) {
        return 'retry'
      }

      if (isGuest) {
        const localEntries = readGuestEntries()
        const next = localEntries.map((entry) =>
          String(entry.id) === String(newEntryId)
            ? { ...entry, ai_feedback: generatedText, ai_keywords: generatedKeywords }
            : entry,
        )
        writeGuestEntries(next)
        setEntries(next)
        removePendingAiTask(newEntryId)
        return 'success'
      }

      if (!session?.user) {
        return 'retry'
      }

      const updateAiFeedback = async (content) =>
        supabase
          .from('entries')
          .update({ ai_feedback: content, keywords: generatedKeywords })
          .eq('user_id', session.user.id)
          .eq('id', newEntryId)
          .select('id, ai_feedback, keywords')
          .maybeSingle()

      let feedbackToSave = generatedText
      let updateResult = await updateAiFeedback(feedbackToSave)
      if (updateResult.error && isMissingKeywordsColumnError(updateResult.error)) {
        updateResult = await supabase
          .from('entries')
          .update({ ai_feedback: feedbackToSave })
          .eq('user_id', session.user.id)
          .eq('id', newEntryId)
          .select('id, ai_feedback')
          .maybeSingle()
      }
      let retryCount = 0

      while (updateResult.error && isAiFeedbackTooLongError(updateResult.error) && retryCount < 4) {
        const shrunk = shrinkAiFeedback(feedbackToSave)
        if (!shrunk || shrunk === feedbackToSave) break
        feedbackToSave = shrunk
        retryCount += 1
        updateResult = await updateAiFeedback(feedbackToSave)
        if (updateResult.error && isMissingKeywordsColumnError(updateResult.error)) {
          updateResult = await supabase
            .from('entries')
            .update({ ai_feedback: feedbackToSave })
            .eq('user_id', session.user.id)
            .eq('id', newEntryId)
            .select('id, ai_feedback')
            .maybeSingle()
        }
      }

      const { data, error } = updateResult

      if (error) {
        console.error('AI feedback update failed:', error)
        setAiFeedbackOverride(newEntryId, feedbackToSave)
        setAiKeywordsOverride(newEntryId, generatedKeywords)
        setEntries((prev) =>
          prev.map((entry) =>
            String(entry.id) === String(newEntryId)
              ? { ...entry, ai_feedback: feedbackToSave, ai_keywords: generatedKeywords }
              : entry,
          ),
        )
        removePendingAiTask(newEntryId)
        return 'success'
      }

      if (!data) {
        console.error('AI feedback update affected 0 rows:', {
          entryId: newEntryId,
          userId: session.user.id,
        })
        setAiFeedbackOverride(newEntryId, feedbackToSave)
        setAiKeywordsOverride(newEntryId, generatedKeywords)
        setEntries((prev) =>
          prev.map((entry) =>
            String(entry.id) === String(newEntryId)
              ? { ...entry, ai_feedback: feedbackToSave, ai_keywords: generatedKeywords }
              : entry,
          ),
        )
        removePendingAiTask(newEntryId)
        return 'success'
      }

      removeAiFeedbackOverride(newEntryId)
      setAiKeywordsOverride(newEntryId, generatedKeywords)
      setEntries((prev) =>
        prev.map((entry) =>
          String(entry.id) === String(newEntryId)
            ? { ...entry, ai_feedback: feedbackToSave, ai_keywords: generatedKeywords }
            : entry,
        ),
      )
      removePendingAiTask(newEntryId)
      void fetchCloudEntries()
      return 'success'
    } catch (error) {
      console.error('generateAndSaveAIFeedback failed:', error)
      return 'retry'
    } finally {
      aiInFlightRef.current.delete(taskKey)
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
      const now = Date.now()
      const tasks = readPendingAiTasks().filter((task) => !task.nextRetryAt || task.nextRetryAt <= now)
      if (!tasks.length) return

      pendingAiProcessorRef.current = true

      try {
        for (const task of tasks) {
          const result = await generateAndSaveAIFeedback(task.entryId, task.text, task.score, task.emotionLabel)
          if (result === 'fatal') {
            removePendingAiTask(task.entryId)
          } else if (result === 'retry') {
            schedulePendingAiRetry(task.entryId)
          }
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
      removePendingAiTask(entryId)
      removeAiFeedbackOverride(entryId)
      removeAiKeywordsOverride(entryId)
      showToast('鍒犻櫎鎴愬姛')
      return true
    }

    const { error } = await supabase.from('entries').delete().eq('id', entryId)

    if (error) {
      showToast('鍒犻櫎澶辫触锛岃绋嶅悗閲嶈瘯')
      return false
    }

    setEntries((prev) => prev.filter((entry) => entry.id !== entryId))
    removePendingAiTask(entryId)
    removeAiFeedbackOverride(entryId)
    removeAiKeywordsOverride(entryId)
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
      keywords: normalizeAiKeywords(entry.ai_keywords ?? entry.keywords ?? []),
      created_at: new Date(`${entry.date}T${entry.time}:00`).toISOString(),
    }))

    let importResult = await supabase.from('entries').insert(rows)
    if (importResult.error && isMissingKeywordsColumnError(importResult.error)) {
      const fallbackRows = rows.map(({ keywords, ...rest }) => rest)
      importResult = await supabase.from('entries').insert(fallbackRows)
    }

    const { error } = importResult
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
            <Route path="/insight" element={<InsightPage entries={entries} />} />
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


