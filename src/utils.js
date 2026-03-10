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

export function readEntries() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
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
