import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, ChevronRight, Sparkles, Star, TrendingUp } from 'lucide-react'
import ImageModal from '../components/ImageModal'
import { formatLocalMonthDay, getEntryLocalDateKey } from '../utils'

const moodColors = {
  5: '#34C759',
  4: '#5AC8FA',
  3: '#FFCC00',
  2: '#FF9500',
  1: '#FF3B30',
}

function getMoodColor(average) {
  if (average >= 4.5) return 'from-emerald-500/10 to-green-600/5'
  if (average >= 3.5) return 'from-sky-500/10 to-blue-600/5'
  if (average >= 2.5) return 'from-amber-500/10 to-yellow-600/5'
  return 'from-orange-500/10 to-red-600/5'
}

function getMoodEmoji(average) {
  if (average >= 4.5) return '😊'
  if (average >= 3.5) return '😌'
  if (average >= 2.5) return '😐'
  return '😔'
}

function getTrendIcon(trend) {
  if (trend === 'up') return <span className="text-green-500">↗</span>
  if (trend === 'down') return <span className="text-red-500">↘</span>
  return <span className="text-gray-400">→</span>
}

export default function HistoryPageV2({ entries, onToggleFavorite, onDeleteEntry }) {
  const navigate = useNavigate()
  const longPressTimerRef = useRef(null)
  const longPressTriggeredRef = useRef(false)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedImage, setSelectedImage] = useState(null)

  const historyData = useMemo(() => {
    const grouped = (entries ?? []).reduce((acc, entry) => {
      const dateKey = getEntryLocalDateKey(entry)
      const bucket = acc[dateKey] ?? []
      bucket.push({ ...entry, date: dateKey })
      acc[dateKey] = bucket
      return acc
    }, {})

    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
    return sortedDates.map((date, index) => {
      const records = [...grouped[date]].sort((a, b) => b.time.localeCompare(a.time))
      const average = records.reduce((sum, item) => sum + Number(item?.emotion?.score ?? item?.score ?? 3), 0) / records.length

      const prevDate = sortedDates[index + 1]
      const prevRecords = prevDate ? grouped[prevDate] : null
      const prevAverage = prevRecords
        ? prevRecords.reduce((sum, item) => sum + Number(item?.emotion?.score ?? item?.score ?? 3), 0) / prevRecords.length
        : null

      let trend = 'stable'
      if (prevAverage !== null) {
        if (average > prevAverage) trend = 'up'
        if (average < prevAverage) trend = 'down'
      }

      return {
        id: date,
        date,
        count: records.length,
        average: Number(average.toFixed(1)),
        trend,
      }
    })
  }, [entries])

  const totalDays = historyData.length
  const globalAverage = useMemo(() => {
    if (!(entries ?? []).length) return 0
    const total = entries.reduce((sum, entry) => sum + Number(entry?.emotion?.score ?? entry?.score ?? 3), 0)
    return Number((total / entries.length).toFixed(1))
  }, [entries])

  const starredEntries = useMemo(
    () =>
      (entries ?? [])
        .filter((entry) => entry.isFavorite === true)
        .sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`)),
    [entries],
  )

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
      <div className="bg-gradient-to-b from-white to-[#f2f2f7] px-6 pt-4 pb-5">
        <h1 className="text-[34px] font-bold tracking-tight bg-gradient-to-r from-[#1d1d1f] to-[#86868b] bg-clip-text text-transparent">
          历史
        </h1>
      </div>

      <div className="px-4 pt-3 pb-5 bg-gradient-to-b from-white/50 to-transparent">
        <div className="bg-gradient-to-br from-gray-100 to-gray-200/50 rounded-[12px] p-1 flex shadow-inner">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2.5 px-4 rounded-[10px] text-[13px] font-semibold transition-all duration-200 ${
              activeTab === 'all' ? 'bg-white text-black shadow-lg shadow-gray-300/50' : 'text-[#3c3c43]/70'
            }`}
          >
            全部记录
          </button>
          <button
            onClick={() => setActiveTab('starred')}
            className={`flex-1 py-2.5 px-4 rounded-[10px] text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'starred' ? 'bg-white text-black shadow-lg shadow-gray-300/50' : 'text-[#3c3c43]/70'
            }`}
          >
            <span className={activeTab === 'starred' ? 'text-[#FFCC00]' : 'opacity-60'}>⭐</span>
            我的收藏
          </button>
        </div>
      </div>

      {activeTab === 'all' ? (
        <>
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/5 rounded-[18px] p-4 border border-blue-100/50">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={16} className="text-[#007AFF]" />
                  <span className="text-[11px] text-[#8e8e93] font-semibold uppercase tracking-wide">总天数</span>
                </div>
                <div className="text-[28px] font-bold tracking-tight">{totalDays}</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 rounded-[18px] p-4 border border-emerald-100/50">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={16} className="text-emerald-600" />
                  <span className="text-[11px] text-[#8e8e93] font-semibold uppercase tracking-wide">平均值</span>
                </div>
                <div className="text-[28px] font-bold tracking-tight">{globalAverage.toFixed(1)}</div>
              </div>
            </div>
          </div>

          <div className="px-4 pt-2 pb-6">
            {historyData.length ? (
              <div className="space-y-3">
                {historyData.map((record, index) => (
                  <div
                    key={record.id}
                    className="bg-white rounded-[20px] shadow-sm hover:shadow-md transition-all overflow-hidden"
                    style={{ animation: `slideIn 0.3s ease-out ${index * 0.05}s backwards` }}
                  >
                    <button
                      onClick={() => navigate(`/day/${record.date}`)}
                      className="w-full px-5 py-5 flex items-center gap-4 text-left group"
                    >
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-gradient-to-br ${getMoodColor(record.average)} text-white shadow-lg`}
                      >
                        {getMoodEmoji(record.average)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[20px] font-semibold tracking-tight">{formatLocalMonthDay(record.date)}</span>
                          {getTrendIcon(record.trend)}
                        </div>
                        <div className="flex items-center gap-3 text-[14px] text-[#8e8e93]">
                          <span className="font-medium px-2.5 py-0.5 bg-gray-100/80 rounded-full">{record.count} 条记录</span>
                          <span className="font-semibold">平均 {record.average}</span>
                        </div>
                      </div>

                      <ChevronRight size={20} className="text-[#C7C7CC] group-hover:text-[#007AFF] transition-colors flex-shrink-0" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-[20px] shadow-sm p-6 text-center text-[#8e8e93]">暂无历史记录</div>
            )}
          </div>
        </>
      ) : (
        <div className="px-4 pt-2 pb-6">
          {starredEntries.length ? (
            <div className="space-y-3">
              {starredEntries.map((entry) => {
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
                    <div className="px-4 py-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-gray-100 flex-shrink-0"
                          style={{ backgroundColor: `${moodColor}20` }}
                        >
                          {entry?.emotion?.emoji ?? '🙂'}
                        </div>
                        <span className="text-[16px] font-medium text-black whitespace-nowrap">
                          {entry?.emotion?.label ?? entry?.mood ?? '心情'}
                        </span>
                        <span className="text-[13px] text-gray-400 whitespace-nowrap">{entry.time}</span>
                        {entry?.ai_feedback ? <Sparkles size={14} className="text-[#FF9500]" /> : null}
                        <button
                          onClick={(event) => {
                            event.stopPropagation()
                            onToggleFavorite?.(entry.id)
                          }}
                          onMouseDown={(event) => event.stopPropagation()}
                          onTouchStart={(event) => event.stopPropagation()}
                          className="ml-auto p-2 rounded-lg"
                        >
                          <Star
                            size={20}
                            fill={entry.isFavorite ? '#FFCC00' : 'none'}
                            stroke={entry.isFavorite ? '#FFCC00' : '#C7C7CC'}
                            strokeWidth={2}
                          />
                        </button>
                      </div>

                      {entry.note ? (
                        <p className="text-[15px] text-[#3c3c43] leading-relaxed whitespace-pre-wrap">{entry.note}</p>
                      ) : null}

                      {entry.image ? (
                        <img
                          src={entry.image}
                          alt="心情图片"
                          className="mt-3 h-28 w-28 rounded-lg object-cover cursor-pointer hover:opacity-90"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedImage(entry.image)
                          }}
                          onMouseDown={(event) => event.stopPropagation()}
                          onTouchStart={(event) => event.stopPropagation()}
                        />
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white rounded-[20px] shadow-sm p-6 text-center text-[#8e8e93]">暂无收藏的记录</div>
          )}
        </div>
      )}

      {selectedImage && <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
