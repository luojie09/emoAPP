import { DEFAULT_EMOTION, findEmotionByLabel, findEmotionByScore } from './data'

export const STORAGE_KEY = 'emoapp.entries.v1'

export const moodScale = {
  很差: 1,
  有点差: 2,
  平静: 3,
  开心: 4,
  非常开心: 5,
}

export function getTodayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function getLocalDateTimeParts(date = new Date()) {
  return {
    localDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    localTime: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  }
}

export function getEntryLocalDateKey(entry) {
  const hasDate = typeof entry?.date === 'string' && entry.date.length >= 10
  const hasTime = typeof entry?.time === 'string' && entry.time.length >= 5

  if (hasDate) {
    const fallbackTime = hasTime ? entry.time : '00:00'
    const candidate = new Date(`${entry.date}T${fallbackTime}:00`)
    if (!Number.isNaN(candidate.getTime())) {
      return getLocalDateTimeParts(candidate).localDate
    }
    return entry.date
  }

  const rawCreatedAt = entry?.created_at ?? entry?.createdAt
  if (rawCreatedAt) {
    const createdAtDate = new Date(rawCreatedAt)
    if (!Number.isNaN(createdAtDate.getTime())) {
      return getLocalDateTimeParts(createdAtDate).localDate
    }
  }

  return getTodayKey()
}

export function formatLocalMonthDay(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`)
  if (Number.isNaN(date.getTime())) return formatDayLabel(dateKey)
  return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
}

export function formatDayLabel(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  if (!y || !m || !d) return dateKey
  return `${m}月${d}日`
}

function normalizeEmotion(rawEntry) {
  if (rawEntry?.emotion?.label && rawEntry?.emotion?.emoji && Number(rawEntry?.emotion?.score)) {
    return {
      emoji: rawEntry.emotion.emoji,
      label: rawEntry.emotion.label,
      score: Number(rawEntry.emotion.score),
    }
  }

  if (rawEntry?.mood) {
    const matchByLabel = findEmotionByLabel(rawEntry.mood)
    if (matchByLabel) return matchByLabel

    const legacyScore = moodScale[rawEntry.mood]
    if (legacyScore) return findEmotionByScore(legacyScore)
  }

  if (Number(rawEntry?.score)) {
    return findEmotionByScore(Number(rawEntry.score))
  }

  return DEFAULT_EMOTION
}

function normalizeAiKeywordItem(item) {
  if (!item || typeof item !== 'object') return null
  const word = typeof item.word === 'string' ? item.word.trim() : ''
  const type = item.type === 'negative' ? 'negative' : item.type === 'positive' ? 'positive' : ''
  if (!word || !type) return null
  return { word, type }
}

function normalizeAiKeywords(rawEntry) {
  const source = Array.isArray(rawEntry?.ai_keywords)
    ? rawEntry.ai_keywords
    : Array.isArray(rawEntry?.aiKeywords)
      ? rawEntry.aiKeywords
      : []

  return source.map(normalizeAiKeywordItem).filter(Boolean)
}

function normalizeEntry(rawEntry, index) {
  const emotion = normalizeEmotion(rawEntry)
  const rawCreatedAt = rawEntry?.created_at ?? rawEntry?.createdAt
  const createdAtDate = rawCreatedAt ? new Date(rawCreatedAt) : null
  const hasValidCreatedAt = createdAtDate && !Number.isNaN(createdAtDate.getTime())
  const fallbackDateTime = hasValidCreatedAt ? getLocalDateTimeParts(createdAtDate) : null

  return {
    id: rawEntry?.id ?? `${Date.now()}-${index}`,
    date: rawEntry?.date ?? fallbackDateTime?.localDate ?? getTodayKey(),
    time: rawEntry?.time ?? fallbackDateTime?.localTime ?? '00:00',
    note: typeof rawEntry?.note === 'string' ? rawEntry.note : rawEntry?.text ?? '',
    image: typeof rawEntry?.image === 'string' ? rawEntry.image : rawEntry?.image_url ?? '',
    ai_feedback: typeof rawEntry?.ai_feedback === 'string' ? rawEntry.ai_feedback : rawEntry?.aiFeedback ?? '',
    ai_keywords: normalizeAiKeywords(rawEntry),
    emotion,
    score: emotion.score,
    mood: emotion.label,
    isFavorite: Boolean(rawEntry?.isFavorite ?? rawEntry?.is_favorite),
  }
}

export function readEntries(sourceEntries) {
  if (Array.isArray(sourceEntries)) {
    return sourceEntries.map((entry, index) => normalizeEntry(entry, index))
  }

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((entry, index) => normalizeEntry(entry, index))
  } catch {
    return []
  }
}

export function writeEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function groupEntriesByDay(entries) {
  const grouped = entries.reduce((acc, entry) => {
    const dateKey = getEntryLocalDateKey(entry)
    const bucket = acc[dateKey] ?? []
    bucket.push({ ...entry, date: dateKey })
    acc[dateKey] = bucket
    return acc
  }, {})

  return Object.entries(grouped)
    .map(([date, records]) => {
      const avg = records.reduce((sum, item) => sum + item.score, 0) / records.length
      return {
        date,
        count: records.length,
        avg: Number(avg.toFixed(1)),
        records: [...records].sort((a, b) => b.time.localeCompare(a.time)),
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}
