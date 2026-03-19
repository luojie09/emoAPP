import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import exifr from 'exifr'
import MoodPicker from '../components/MoodPicker'
import TopBar from '../components/TopBar'
import { getLocalDateTimeParts, getTodayKey } from '../utils'

const MAX_IMAGE_EDGE = 1280
const JPEG_QUALITY = 0.8
const MAX_UPLOAD_SIZE = 20 * 1024 * 1024
const MAX_BASE64_BYTES = 2.5 * 1024 * 1024

function toTimeInputValue(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function compressImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('read-failed'))
    reader.onload = () => {
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

      img.src = String(reader.result ?? '')
    }

    reader.readAsDataURL(file)
  })
}

export default function AddEntryPageV3({ onSave, onQueueAiTask, onToast, onGenerateAiFeedback }) {
  const navigate = useNavigate()
  const imageInputRef = useRef(null)
  const [emotion, setEmotion] = useState(null)
  const [note, setNote] = useState('')
  const [image, setImage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateTimeParts(new Date()).localDate || getTodayKey())
  const [selectedTime, setSelectedTime] = useState(() => toTimeInputValue(new Date()))

  const handlePickImage = () => imageInputRef.current?.click()

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !file.type?.startsWith('image/')) return

    if (file.size > MAX_UPLOAD_SIZE) {
      onToast?.('图片过大，请选择更小的图片')
      event.target.value = ''
      return
    }

    try {
      const compressedBase64 = await compressImageToBase64(file)
      const approxBytes = Math.ceil((compressedBase64.length * 3) / 4)
      if (approxBytes > MAX_BASE64_BYTES) {
        setImage('')
        onToast?.('图片仍然偏大，请换一张图片')
        event.target.value = ''
      } else {
        setImage(compressedBase64)
      }
    } catch {
      setImage('')
      onToast?.('图片处理失败，请重试')
    }

    try {
      const exifData = await exifr.parse(file)
      const exifDateTime = exifData?.DateTimeOriginal
      const capturedAt =
        exifDateTime instanceof Date
          ? exifDateTime
          : exifDateTime
            ? new Date(exifDateTime)
            : file.lastModified
              ? new Date(file.lastModified)
              : null

      if (!capturedAt || Number.isNaN(capturedAt.getTime())) return

      const diffMs = Date.now() - capturedAt.getTime()
      if (diffMs <= 60 * 60 * 1000 || diffMs < 0) return

      const { localDate, localTime } = getLocalDateTimeParts(capturedAt)
      if (localDate) setSelectedDate(localDate)
      if (localTime) setSelectedTime(localTime)
    } catch {
      // Ignore EXIF parse failures for images without metadata.
    }
  }

  const handleSave = async () => {
    if (!emotion || isSaving) return
    setIsSaving(true)

    const text = note.trim()
    const safeDate = typeof selectedDate === 'string' && selectedDate ? selectedDate : getTodayKey()
    const safeTime = typeof selectedTime === 'string' && selectedTime ? selectedTime : toTimeInputValue(new Date())
    const selected = new Date(`${safeDate}T${safeTime}:00`)
    const validDate = Number.isNaN(selected.getTime()) ? new Date() : selected
    const { localDate, localTime } = getLocalDateTimeParts(validDate)

    const entry = {
      id: `${Date.now()}`,
      date: localDate || safeDate || getTodayKey(),
      time: localTime || safeTime,
      emotion,
      score: emotion.score,
      mood: emotion.label,
      note: text,
      image,
      isFavorite: false,
      ai_feedback: null,
    }

    let savedEntry
    try {
      savedEntry = await onSave?.(entry)
    } catch (error) {
      const isQuotaError =
        error?.name === 'QuotaExceededError' ||
        error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error?.code === 22 ||
        error?.code === 1014

      if (isQuotaError) onToast?.('存储空间已满，请清理后重试')
      else onToast?.('保存失败，请稍后重试')

      setIsSaving(false)
      return
    }

    const savedEntryId = savedEntry?.id ?? entry.id
    if (text.length > 0 && savedEntryId) {
      onQueueAiTask?.({
        entryId: savedEntryId,
        text,
        score: emotion.score,
        emotionLabel: emotion.label,
      })
      void onGenerateAiFeedback?.(savedEntryId, text, emotion.score, emotion.label)
    }

    setEmotion(null)
    setNote('')
    setImage('')
    const now = new Date()
    const { localDate: nowDate, localTime: nowTime } = getLocalDateTimeParts(now)
    setSelectedDate(nowDate || getTodayKey())
    setSelectedTime(nowTime || toTimeInputValue(now))
    setIsSaving(false)
    navigate('/')
  }

  return (
    <div className="space-y-4 pt-3">
      <TopBar title="记录现在的心情" />
      <p className="text-base text-gray-700">此刻你的感觉怎么样？</p>

      <MoodPicker value={emotion} onSelect={setEmotion} />

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="写一句此刻发生的事..."
          className="h-36 w-full resize-none border-0 bg-transparent p-0 text-base text-gray-700 placeholder:text-sm placeholder:text-gray-400 focus:outline-none"
        />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-gray-600">记录时间</label>
        <input
          type="time"
          value={selectedTime}
          onChange={(event) => setSelectedTime(event.target.value)}
          className="mt-2 w-full appearance-none rounded-xl border-0 bg-gray-50 px-4 py-3 text-base text-gray-700 ring-1 ring-gray-100 outline-none focus:ring-2 focus:ring-blue-200"
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

      {image ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <img src={image} alt="预览" className="h-20 w-20 rounded-xl object-cover" />
        </div>
      ) : null}

      <button
        onClick={handleSave}
        disabled={!emotion || isSaving}
        className="w-full rounded-xl bg-indigo-500 py-4 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? '保存中...' : '保存这次心情'}
      </button>
    </div>
  )
}
