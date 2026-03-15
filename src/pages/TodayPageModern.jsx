import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Sparkles, Star } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import ImageModal from '../components/ImageModal'

const moodColors = {
  5: '#34C759',
  4: '#5AC8FA',
  3: '#FFCC00',
  2: '#FF9500',
  1: '#FF3B30',
}

function getTodayKey() {
  const now = new Date()
  const pad = (v) => String(v).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export default function TodayPageModern({ entries, onToggleFavorite, onLogout, onDeleteEntry }) {
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

    if (mapped.length === 1) {
      return [mapped[0], { ...mapped[0], time: `${mapped[0].time} ` }]
    }
    return mapped
  }, [todayRecords])

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
    <div className="min-h-screen bg-[#f2f2f7]">
      <div className="bg-white px-6 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-[34px] font-bold tracking-tight">今天</h1>
          <button onClick={onLogout} className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700">
            退出登录
          </button>
        </div>
      </div>

      <div className="px-4 pt-5 pb-4">
        <div className="bg-white rounded-[20px] p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-[13px] text-[#8e8e93] mb-1">本日平均</p>
            <div className="flex items-baseline gap-2">
              <span className="text-[34px] font-semibold tracking-tight">{averageMood.toFixed(1)}</span>
              <span className="text-[17px] text-[#8e8e93]">/ 5</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={emotionData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <YAxis domain={[1, 5]} hide />
              <defs>
                <linearGradient id="colorMoodToday" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="#007AFF"
                strokeWidth={2.5}
                fill="url(#colorMoodToday)"
                strokeLinecap="round"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={() => navigate('/add')}
          className="w-full bg-[#007AFF] hover:bg-[#0051D5] active:bg-[#004FC7] text-white rounded-[14px] py-3.5 flex items-center justify-center gap-2 font-semibold text-[17px] shadow-sm transition-colors"
        >
          <Plus size={20} strokeWidth={2.5} />
          <span>记录心情</span>
        </button>
      </div>

      <div className="px-6 py-3">
        <h2 className="text-[22px] font-bold">今日记录</h2>
      </div>

      <div className="px-4 pb-8">
        {todayRecords.length ? (
          <div className="space-y-3">
            {todayRecords.map((entry) => {
              const moodScore = Number(entry?.emotion?.score ?? entry?.score ?? 3)
              const moodColor = moodColors[moodScore] ?? '#8E8E93'

              return (
                <div
                  key={entry.id}
                  className="bg-white rounded-[20px] shadow-sm"
                  onClick={() => handleCardClick(entry.id)}
                  onTouchStart={() => startLongPress(entry.id)}
                  onMouseDown={() => startLongPress(entry.id)}
                  onTouchEnd={clearLongPress}
                  onMouseUp={clearLongPress}
                  onMouseLeave={clearLongPress}
                  onTouchMove={clearLongPress}
                >
                  <div className="px-4 py-4 relative">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: `${moodColor}20` }}
                    >
                      {entry?.emotion?.emoji ?? '🙂'}
                    </div>

                    <div className="min-w-0 mt-3">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[17px] font-semibold">{entry?.emotion?.label ?? entry?.mood ?? '心情'}</span>
                        <span className="text-[15px] text-[#8e8e93]">{`${entry.date} ${entry.time}`}</span>
                        {entry?.ai_feedback ? <Sparkles size={14} className="text-[#FF9500]" /> : null}
                      </div>
                      {entry.note ? (
                        <p className="text-[15px] text-[#3c3c43] leading-relaxed whitespace-pre-wrap">{entry.note}</p>
                      ) : null}

                      {entry.image ? (
                        <img
                          src={entry.image}
                          alt="心情图片"
                          className="mt-3 w-full max-h-72 rounded-xl object-cover cursor-pointer hover:opacity-90"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedImage(entry.image)
                          }}
                          onMouseDown={(event) => event.stopPropagation()}
                          onTouchStart={(event) => event.stopPropagation()}
                        />
                      ) : null}
                    </div>

                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggleFavorite?.(entry.id)
                      }}
                      onMouseDown={(event) => event.stopPropagation()}
                      onTouchStart={(event) => event.stopPropagation()}
                      className="absolute top-4 right-4 p-2 rounded-lg"
                    >
                      <Star
                        size={20}
                        fill={entry.isFavorite ? '#FFCC00' : 'none'}
                        stroke={entry.isFavorite ? '#FFCC00' : '#C7C7CC'}
                        strokeWidth={2}
                      />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-[20px] shadow-sm p-6 text-center text-[#8e8e93]">今天还没有记录</div>
        )}
      </div>

      {selectedImage && <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />}
    </div>
  )
}
