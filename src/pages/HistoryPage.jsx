import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { formatDayLabel, readEntries, writeEntries } from '../utils'

export default function HistoryPage({ historyDays }) {
  const importInputRef = useRef(null)

  const handleExport = () => {
    const data = readEntries()
    const content = JSON.stringify(data, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'emo_backup.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handlePickImportFile = () => importInputRef.current?.click()

  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const content = await file.text()
      const parsed = JSON.parse(content)
      if (!Array.isArray(parsed)) throw new Error('invalid-format')

      writeEntries(parsed)
      alert('数据导入成功！')
      window.location.reload()
    } catch {
      alert('导入失败，请确认文件格式正确')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-medium text-gray-800">历史</h1>

      {!historyDays.length ? (
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <p className="text-base text-gray-700">还没有历史记录</p>
          <p className="mt-1 text-sm text-gray-400">先在“今天”页添加一条心情。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {historyDays.map((day) => (
            <Link
              to={`/history/${day.date}`}
              key={day.date}
              className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
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
          ))}
        </div>
      )}

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
    </div>
  )
}
