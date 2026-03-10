import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { formatMoodLabel, moodChoices } from '../data'
import { getTodayKey, moodScale } from '../utils'

const MAX_IMAGE_EDGE = 800
const JPEG_QUALITY = 0.6

function compressImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()

    fileReader.onerror = () => reject(new Error('read-failed'))
    fileReader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('image-load-failed'))
      img.onload = () => {
        const ratio = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height))
        const width = Math.max(1, Math.round(img.width * ratio))
        const height = Math.max(1, Math.round(img.height * ratio))

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('canvas-context-failed'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
      }

      img.src = String(fileReader.result ?? '')
    }

    fileReader.readAsDataURL(file)
  })
}

export default function AddEntryPage({ onSave }) {
  const navigate = useNavigate()
  const imageInputRef = useRef(null)
  const [mood, setMood] = useState('')
  const [note, setNote] = useState('')
  const [image, setImage] = useState('')

  const handlePickImage = () => imageInputRef.current?.click()

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const compressedBase64 = await compressImageToBase64(file)
      setImage(compressedBase64)
    } catch {
      setImage('')
      alert('图片处理失败，请重试')
    }
  }

  const handleSave = () => {
    if (!mood) return

    const now = new Date()
    const time = now.toTimeString().slice(0, 5)
    const entry = {
      id: `${Date.now()}`,
      date: getTodayKey(),
      time,
      mood,
      score: moodScale[mood],
      note: note.trim(),
      image,
    }

    try {
      onSave(entry)
      navigate('/')
    } catch (error) {
      const isQuotaError =
        error?.name === 'QuotaExceededError' ||
        error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error?.code === 22 ||
        error?.code === 1014

      if (isQuotaError) {
        alert('本地存储空间已满，请清理历史数据或不带图片保存')
        return
      }

      throw error
    }
  }

  return (
    <div className="space-y-4 pt-3">
      <TopBar title="记录现在的心情" />
      <p className="text-base text-gray-700">此刻你的感觉怎么样?</p>

      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        {[...moodChoices].reverse().map((option) => (
          <button
            key={option}
            onClick={() => setMood(option)}
            className={`w-full rounded-xl border py-3 text-base ${
              mood === option ? 'border-indigo-200 bg-indigo-50 text-indigo-600' : 'border-gray-100 bg-white text-gray-700'
            }`}
          >
            {formatMoodLabel(option)}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="写一句此刻发生的事..."
          className="h-36 w-full resize-none border-0 bg-transparent p-0 text-base text-gray-700 placeholder:text-sm placeholder:text-gray-400 focus:outline-none"
        />
      </div>

      <button
        onClick={handlePickImage}
        className="flex h-24 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm text-gray-400 shadow-sm"
      >
        <span>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            <path d="M12 15V4" />
            <path d="m8 8 4-4 4 4" />
          </svg>
        </span>
        <span>添加一张图片（可选）</span>
      </button>

      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

      {image && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <img src={image} alt="预览" className="h-20 w-20 rounded-xl object-cover" />
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!mood}
        className="w-full rounded-xl bg-indigo-500 py-4 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        保存这次心情
      </button>
    </div>
  )
}
