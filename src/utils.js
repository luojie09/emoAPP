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
  return new Date().toISOString().slice(0, 10)
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

function normalizeEntry(rawEntry, index) {
  const emotion = normalizeEmotion(rawEntry)
  return {
    id: rawEntry?.id ?? `${Date.now()}-${index}`,
    date: rawEntry?.date ?? getTodayKey(),
    time: rawEntry?.time ?? '00:00',
    note: typeof rawEntry?.note === 'string' ? rawEntry.note : '',
    image: typeof rawEntry?.image === 'string' ? rawEntry.image : '',
    emotion,
    score: emotion.score,
    mood: emotion.label,
  }
}

export function readEntries() {
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
    const bucket = acc[entry.date] ?? []
    bucket.push(entry)
    acc[entry.date] = bucket
    return acc
  }, {})

  return Object.entries(grouped)
    .map(([date, records]) => {
      const avg = records.reduce((sum, item) => sum + item.score, 0) / records.length
      return {
        date,
        count: records.length,
        avg: Number(avg.toFixed(1)),
        records: [...records].sort((a, b) => a.time.localeCompare(b.time)),
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}
