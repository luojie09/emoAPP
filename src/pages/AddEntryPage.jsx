import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { EMOTIONS } from '../data'
import { getTodayKey } from '../utils'

const MAX_IMAGE_EDGE = 800
const JPEG_QUALITY = 0.6
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024

function toDateTimeLocalValue(date) {
  const pad = (v) => String(v).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

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

export default function AddEntryPage({ onSave, onToast }) {
  const navigate = useNavigate()
  const imageInputRef = useRef(null)
  const [emotion, setEmotion] = useState(null)
  const [note, setNote] = useState('')
  const [image, setImage] = useState('')
  const [selectedDateTime, setSelectedDateTime] = useState(() => toDateTimeLocalValue(new Date()))

  const handlePickImage = () => imageInputRef.current?.click()

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > MAX_UPLOAD_SIZE) {
      onToast('存储空间已满，请清理或不带图片保存')
      event.target.value = ''
      return
    }

    try {
      const compressedBase64 = await compressImageToBase64(file)
      setImage(compressedBase64)
    } catch {
      setImage('')
      onToast('图片处理失败，请重试')
    }
  }

  const handleSave = () => {
    if (!emotion) return

    const selected = selectedDateTime ? new Date(selectedDateTime) : new Date()
    const validDate = Number.isNaN(selected.getTime()) ? new Date() : selected
    const date = validDate.toISOString().slice(0, 10)
    const time = `${String(validDate.getHours()).padStart(2, '0')}:${String(validDate.getMinutes()).padStart(2, '0')}`

    const entry = {
      id: `${Date.now()}`,
      date: date || getTodayKey(),
      time,
      emotion,
      score: emotion.score,
      mood: emotion.label,
      note: note.trim(),
      image,
      isFavorite: false,
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
        onToast('存储空间已满，请清理或不带图片保存')
        return
      }

      throw error
    }
  }

  return (
    <div className="space-y-4 pt-3">
      <TopBar title="记录现在的心情" />
      <p className="text-base text-gray-700">此刻你的感觉怎么样?</p>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-3">
          {EMOTIONS.map((option) => {
            const isSelected = emotion?.emoji === option.emoji && emotion?.label === option.label
            return (
              <button
                key={`${option.emoji}-${option.label}`}
                onClick={() => setEmotion(option)}
                className={`flex h-20 flex-col items-center justify-center rounded-xl border py-2 transition-all duration-200 active:scale-95 hover:scale-105 hover:shadow-md ${
                  isSelected ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100 bg-white'
                }`}
              >
                <span className="text-3xl leading-none">{option.emoji}</span>
                <span className="mt-1 text-xs text-gray-500">{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="写一句此刻发生的事..."
          className="h-36 w-full resize-none border-0 bg-transparent p-0 text-base text-gray-700 placeholder:text-sm placeholder:text-gray-400 focus:outline-none"
        />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <input
          type="datetime-local"
          value={selectedDateTime}
          onChange={(event) => setSelectedDateTime(event.target.value)}
          className="w-full rounded-xl border border-gray-100 bg-white px-3 py-3 text-sm text-gray-700 focus:outline-none"
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
        disabled={!emotion}
        className="w-full rounded-xl bg-indigo-500 py-4 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        保存这次心情
      </button>
    </div>
  )
}
