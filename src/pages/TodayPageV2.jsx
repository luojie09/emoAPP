import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Star } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import ImageModal from '../components/ImageModal'
import MoodAvatar from '../components/MoodAvatar'

function getTodayKey() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function getGreetingLabel() {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'GOOD MORNING'
  if (hour >= 12 && hour < 19) return 'GOOD AFTERNOON'
  return 'GOOD EVENING'
}

function formatHeaderDate(todayKey) {
  const date = new Date(`${todayKey}T00:00:00`)
  if (Number.isNaN(date.getTime())) return todayKey

  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 · ${weekdays[date.getDay()]}`
}

export default function TodayPageV2({ entries, onToggleFavorite, onDeleteEntry }) {
  const navigate = useNavigate()
  const [selectedImage, setSelectedImage] = useState(null)
  const longPressTimerRef = useRef(null)
  const longPressTriggeredRef = useRef(false)

  const todayKey = useMemo(() => getTodayKey(), [])
  const todayRecords = useMemo(
    () =>
      (entries ?? [])
        .filter((entry) => entry.date === todayKey)
        .sort((a, b) => b.time.localeCompare(a.time)),
    [entries, todayKey],
  )

  const averageMood = useMemo(() => {
    if (!todayRecords.length) return 0
    const total = todayRecords.reduce((sum, entry) => sum + Number(entry?.emotion?.score ?? entry?.score ?? 3), 0)
    return Number((total / todayRecords.length).toFixed(1))
  }, [todayRecords])

  const emotionData = useMemo(() => {
    const asc = [...todayRecords].sort((a, b) => a.time.localeCompare(b.time))
    const mapped = asc.map((entry) => ({
      time: entry.time,
      value: Number(entry?.emotion?.score ?? entry?.score ?? 3),
    }))

    if (mapped.length === 1) return [mapped[0], { ...mapped[0], time: `${mapped[0].time} ` }]
    return mapped
  }, [todayRecords])

  const moodBadge = useMemo(() => {
    if (averageMood >= 4) {
      return {
        label: '↑ 心情不错',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-600',
      }
    }

    if (averageMood >= 3) {
      return {
        label: '→ 情绪平稳',
        className: 'border-blue-200 bg-blue-50 text-blue-600',
      }
    }

    if (averageMood > 0) {
      return {
        label: '↓ 有些低落',
        className: 'border-orange-200 bg-orange-50 text-orange-600',
      }
    }

    return {
      label: '- 暂无记录',
      className: 'border-gray-200 bg-gray-50 text-gray-400',
    }
  }, [averageMood])

  const clearLongPress = () => {
    if (!longPressTimerRef.current) return
    window.clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = null
  }

  const startLongPress = (entryId) => {
    clearLongPress()
    longPressTriggeredRef.current = false
    longPressTimerRef.current = window.setTimeout(async () => {
      longPressTriggeredRef.current = true
      const confirmed = window.confirm('确定要彻底删除这条记录吗？')
      if (!confirmed) return
      await onDeleteEntry?.(entryId)
    }, 600)
  }

  const handleCardClick = (entryId) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      return
    }
    navigate(`/entry/${entryId}`)
  }

  return (
    <div className="-mx-4 -mt-6 min-h-screen bg-[#f7f6f2] px-4 pt-6 pb-28">
      <div className="px-1">
        <p className="mb-1 text-[11px] tracking-[0.32em] text-gray-400">{getGreetingLabel()}</p>
        <h1 className="text-3xl font-serif font-bold text-gray-900">今天</h1>
        <p className="mt-1 text-xs text-gray-400">{formatHeaderDate(todayKey)}</p>
      </div>

      <div className="mt-5 rounded-[22px] border border-black/5 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] text-gray-400">今日情绪均值</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-tight text-gray-900">{averageMood.toFixed(1)}</span>
              <span className="text-xl text-gray-300">/5</span>
            </div>
          </div>

          <span className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${moodBadge.className}`}>
            {moodBadge.label}
          </span>
        </div>

        <div className="mt-4 h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={emotionData} margin={{ top: 8, right: 2, left: 0, bottom: 0 }}>
              <YAxis domain={[1, 5]} hide />
              <defs>
                <linearGradient id="colorMoodTodayV2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a08ff0" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#a08ff0" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="#a08ff0"
                strokeWidth={2.5}
                fill="url(#colorMoodTodayV2)"
                strokeLinecap="round"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={() => navigate('/add')}
          className="flex w-full items-center gap-3 rounded-[20px] border-0 bg-gradient-to-br from-[#a08ff0] to-[#c47bbf] p-4 transition-transform active:scale-95"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
            <Plus size={20} strokeWidth={2.5} />
          </span>
          <span className="flex flex-col items-start text-left">
            <span className="text-[18px] font-semibold text-white">记录此刻心情</span>
            <span className="mt-0.5 text-sm text-white/70">把这一刻留下来</span>
          </span>
        </button>
      </div>

      <div className="mt-7 flex items-end justify-between px-1">
        <h2 className="text-[26px] font-serif font-bold text-gray-900">今日记录</h2>
        <span className="text-xs text-gray-400">{todayRecords.length} 条</span>
      </div>

      <div className="mt-3 px-0.5 pb-4">
        {todayRecords.length ? (
          <div className="space-y-3">
            {todayRecords.map((entry) => {
              return (
                <div
                  key={entry.id}
                  className="rounded-[18px] border border-black/5 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                  onClick={() => handleCardClick(entry.id)}
                  onTouchStart={() => startLongPress(entry.id)}
                  onMouseDown={() => startLongPress(entry.id)}
                  onTouchEnd={clearLongPress}
                  onMouseUp={clearLongPress}
                  onMouseLeave={clearLongPress}
                  onTouchMove={clearLongPress}
                >
                  <div className="flex items-start gap-3">
                    <MoodAvatar emoji={entry?.emotion?.emoji ?? '🙂'} className="h-9 w-9 shrink-0 !bg-[#f5f4f0] text-lg" />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[16px] font-semibold text-gray-900">
                          {entry?.emotion?.label ?? entry?.mood ?? '心情'}
                        </span>
                        <span className="rounded-lg bg-purple-50 px-2 py-0.5 text-[10px] text-[#9080d0]">✦ 回信</span>
                      </div>
                      <p className="mt-1 text-[13px] text-gray-400">{entry.time}</p>
                    </div>

                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggleFavorite?.(entry.id)
                      }}
                      onMouseDown={(event) => event.stopPropagation()}
                      onTouchStart={(event) => event.stopPropagation()}
                      className="ml-auto rounded-lg p-2"
                    >
                      <Star
                        size={20}
                        fill={entry.isFavorite ? '#e6a364' : 'none'}
                        stroke={entry.isFavorite ? '#e6a364' : '#d5d0ca'}
                        strokeWidth={2}
                      />
                    </button>
                  </div>

                  {entry.note ? (
                    <p className="mt-3 line-clamp-3 text-[15px] leading-7 text-[#5f5b57]">{entry.note}</p>
                  ) : null}

                  {entry.image ? (
                    <img
                      src={entry.image}
                      alt="心情图片"
                      className="mt-3 h-28 w-28 cursor-pointer rounded-2xl object-cover hover:opacity-90"
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedImage(entry.image)
                      }}
                      onMouseDown={(event) => event.stopPropagation()}
                      onTouchStart={(event) => event.stopPropagation()}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-[20px] border border-black/5 bg-white px-6 py-10 text-center text-sm text-gray-400 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            今天还没有记录，去留下第一条心情吧。
          </div>
        )}
      </div>

      {selectedImage && <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />}
    </div>
  )
}
