import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ImageModal from '../components/ImageModal'
import RecordCard from '../components/RecordCardInteractive'
import { formatDayLabel } from '../utils'

const scoreBorderTone = {
  5: 'border-orange-400',
  4: 'border-green-400',
  3: 'border-gray-300',
  2: 'border-purple-400',
  1: 'border-blue-400',
}

export default function HistoryPage({ historyDays, entries, onToast, onImportEntries, onLogout, onToggleFavorite, onDeleteEntry }) {
  const importInputRef = useRef(null)
  const [viewMode, setViewMode] = useState('all')
  const [selectedImage, setSelectedImage] = useState(null)
  const favoriteEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.isFavorite)
        .sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`)),
    [entries],
  )

  const visibleDays = useMemo(() => {
    return historyDays
  }, [historyDays])

  const handleExport = () => {
    const content = JSON.stringify(entries, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'emo_backup.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    onToast('数据备份已导出')
  }

  const handlePickImportFile = () => importInputRef.current?.click()

  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const content = await file.text()
      const parsed = JSON.parse(content)
      if (!Array.isArray(parsed)) throw new Error('invalid-format')
      await onImportEntries(parsed)
    } catch {
      onToast('导入失败，请确认文件格式正确')
    } finally {
      event.target.value = ''
    }
  }

  if (viewMode === 'favorites') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-medium text-gray-800">历史</h1>
          <button onClick={onLogout} className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700">
            退出登录
          </button>
        </div>

        <div className="flex gap-2 rounded-2xl bg-white p-2 shadow-sm">
          <button onClick={() => setViewMode('all')} className="flex-1 rounded-xl py-2 text-sm text-gray-400">
            全部记录
          </button>
          <button onClick={() => setViewMode('favorites')} className="flex-1 rounded-xl bg-gray-100 py-2 text-sm text-gray-700">
            ⭐ 我的收藏
          </button>
        </div>

        {favoriteEntries.length ? (
          <div className="space-y-4">
            {favoriteEntries.map((entry) => (
              <RecordCard
                key={entry.id}
                record={{ ...entry, time: `${entry.date} ${entry.time}` }}
                onToggleFavorite={onToggleFavorite}
                onImageClick={setSelectedImage}
                onDelete={onDeleteEntry}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
            <p className="text-base text-gray-700">暂无收藏的记录</p>
          </div>
        )}

        <div className="hidden rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleExport}
              className="w-full rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700"
            >
              导出数据
            </button>
            <button
              onClick={handlePickImportFile}
              className="w-full rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700"
            >
              导入数据
            </button>
          </div>
          <input ref={importInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
        {selectedImage && <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium text-gray-800">历史</h1>
        <button onClick={onLogout} className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700">
          退出登录
        </button>
      </div>

      <div className="flex gap-2 rounded-2xl bg-white p-2 shadow-sm">
        <button
          onClick={() => setViewMode('all')}
          className={`flex-1 rounded-xl py-2 text-sm ${viewMode === 'all' ? 'bg-gray-100 text-gray-700' : 'text-gray-400'}`}
        >
          全部记录
        </button>
        <button
          onClick={() => setViewMode('favorites')}
          className={`flex-1 rounded-xl py-2 text-sm ${viewMode === 'favorites' ? 'bg-gray-100 text-gray-700' : 'text-gray-400'}`}
        >
          ⭐ 我的收藏
        </button>
      </div>

      {!visibleDays.length ? (
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <p className="text-base text-gray-700">还没有历史记录</p>
          <p className="mt-1 text-sm text-gray-400">先在“今天”页添加一条心情。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleDays.map((day) => {
            const latestScore = day.records?.[0]?.score
            return (
              <Link
                to={`/history/${day.date}`}
                key={day.date}
                className={`flex items-center justify-between rounded-2xl border-l-4 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${
                  scoreBorderTone[latestScore] ?? 'border-gray-300'
                }`}
              >
                <div>
                  <p className="text-base font-medium text-gray-800">
                    {formatDayLabel(day.date)}
                    <span className="ml-2 text-sm font-normal text-gray-400">{day.count} 条记录</span>
                  </p>
                  <p className="mt-1 text-sm text-gray-700">平均情绪：{day.avg}</p>
                </div>
                <span className="text-2xl text-gray-400">›</span>
              </Link>
            )
          })}
        </div>
      )}

      {viewMode === 'all' ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleExport}
            className="w-full rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700"
          >
            📥 导出数据
          </button>
          <button
            onClick={handlePickImportFile}
            className="w-full rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700"
          >
            📤 导入数据
          </button>
        </div>
        <input ref={importInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
      ) : null}
    </div>
  )
}
