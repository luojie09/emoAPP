import { useMemo, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatAxisLabel(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function getEntryDate(entry) {
  const rawCreatedAt = entry?.created_at ?? entry?.createdAt
  if (rawCreatedAt) {
    const createdAt = new Date(rawCreatedAt)
    if (!Number.isNaN(createdAt.getTime())) return createdAt
  }

  if (entry?.date && entry?.time) {
    const combined = new Date(`${entry.date}T${entry.time}:00`)
    if (!Number.isNaN(combined.getTime())) return combined
  }

  if (entry?.date) {
    const onlyDate = new Date(`${entry.date}T00:00:00`)
    if (!Number.isNaN(onlyDate.getTime())) return onlyDate
  }

  return null
}

function createFallbackValue(index, total) {
  const normalized = total <= 1 ? 0 : index / (total - 1)
  const wave = 3 + Math.sin(normalized * Math.PI * 3) * 0.55 + Math.cos(normalized * Math.PI * 5) * 0.2
  return Number(clamp(wave, 1.4, 4.7).toFixed(2))
}

function buildGroupedScores(entries) {
  const grouped = new Map()

  for (const entry of entries ?? []) {
    if (!entry) continue
    const date = getEntryDate(entry)
    if (!date) continue

    const key = formatDateKey(date)
    const score = Number(entry?.emotion?.score ?? entry?.score ?? 3)
    if (!Number.isFinite(score)) continue

    const current = grouped.get(key) ?? { total: 0, count: 0 }
    current.total += score
    current.count += 1
    grouped.set(key, current)
  }

  return grouped
}

function buildTideSeries(entries, days) {
  const grouped = buildGroupedScores(entries)
  const today = new Date()
  const points = []
  let lastKnownValue = null
  let hasRealPoint = false

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setHours(0, 0, 0, 0)
    date.setDate(today.getDate() - offset)

    const key = formatDateKey(date)
    const bucket = grouped.get(key)
    const fallbackValue = createFallbackValue(days - 1 - offset, days)

    let value = fallbackValue
    if (bucket?.count) {
      value = bucket.total / bucket.count
      lastKnownValue = value
      hasRealPoint = true
    } else if (lastKnownValue != null) {
      value = lastKnownValue * 0.8 + fallbackValue * 0.2
    }

    points.push({
      label: formatAxisLabel(date),
      value: Number(clamp(value, 1, 5).toFixed(2)),
      isReal: Boolean(bucket?.count),
    })
  }

  if (!hasRealPoint) {
    return points.map((point, index) => ({
      ...point,
      value: createFallbackValue(index, days),
    }))
  }

  return points
}

function getTideSummary(series) {
  const values = series.map((item) => Number(item?.value ?? 0)).filter((value) => Number.isFinite(value) && value > 0)
  if (!values.length) return '潮水正安静停泊，等你慢慢听见自己的回声。'

  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length

  if (variance >= 0.55) return '最近的心海有些波澜，起伏里也藏着你正在经历的成长。'
  if (average < 3) return '有些低沉的日子，也是在提醒你，心需要更柔软的照看。'
  if (average >= 4) return '岁月静好，连心绪的潮声都带着安稳而明亮的光。'
  return '潮水正缓缓回稳，你也在自己的节奏里慢慢靠岸。'
}

export default function EmotionalTide({ entries }) {
  const [range, setRange] = useState(7)

  const tideData = useMemo(() => buildTideSeries(entries, range), [entries, range])
  const tideSummary = useMemo(() => getTideSummary(tideData), [tideData])

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="border-l-2 border-[#a08ff0]/80 pl-4 text-[15px] italic leading-7 text-[#8f87a6]">{tideSummary}</div>

      <div className="mt-5 flex items-center gap-3">
        {[7, 30].map((value) => {
          const active = range === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setRange(value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                active ? 'bg-[#f0eeff] text-[#8070c0]' : 'bg-[#f4f1ec] text-[#b3aea6]'
              }`}
            >
              近 {value} 天
            </button>
          )
        })}
      </div>

      <div className="mt-6 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={tideData} margin={{ top: 16, right: 8, left: 8, bottom: 8 }}>
            <defs>
              <linearGradient id={`tide-gradient-${range}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgba(160,143,240,0.2)" stopOpacity={1} />
                <stop offset="95%" stopColor="rgba(160,143,240,0)" stopOpacity={1} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tickMargin={16}
              interval={range === 30 ? 4 : 0}
              tick={{ fill: '#d2cdc5', fontSize: 12 }}
            />
            <YAxis domain={[1, 5]} hide />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#a08ff0"
              strokeWidth={3}
              fill={`url(#tide-gradient-${range})`}
              dot={{ r: 4.5, fill: '#ffffff', stroke: '#a08ff0', strokeWidth: 2 }}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
