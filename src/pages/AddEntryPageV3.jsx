import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImagePlus, X } from 'lucide-react'
import MoodPicker from '../components/MoodPicker'

const MAX_IMAGE_EDGE = 1280
const JPEG_QUALITY = 0.8
const MAX_UPLOAD_SIZE = 20 * 1024 * 1024
const MAX_BASE64_BYTES = 2.5 * 1024 * 1024

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

function formatCurrentDate() {
  const date = new Date()
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 · ${weekdays[date.getDay()]}`
}

export default function AddEntryPageV3({ onSave, onQueueAiTask, onToast, onGenerateAiFeedback }) {
  const navigate = useNavigate()
  const imageInputRef = useRef(null)
  const [emotion, setEmotion] = useState(null)
  const [note, setNote] = useState('')
  const [image, setImage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handlePickImage = () => imageInputRef.current?.click()

  const handleRemoveImage = (event) => {
    event.stopPropagation()
    setImage('')
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

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
  }

  const handleSave = async () => {
    if (!emotion || isSaving) return
    setIsSaving(true)

    const text = note.trim()
    const entry = {
      id: `${Date.now()}`,
      created_at: new Date().toISOString(),
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
    setIsSaving(false)
    navigate('/')
  }

  return (
    <div className="-mx-4 -mt-5 min-h-screen overflow-y-auto bg-[#f7f6f2] px-4 pt-[max(env(safe-area-inset-top),_24px)] pb-[calc(env(safe-area-inset-bottom)+100px)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="mb-5 px-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-gray-700 shadow-sm ring-1 ring-black/5"
            aria-label="返回"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 5-7 7 7 7" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-serif font-bold text-gray-900">记录</h1>
            <p className="mt-1 text-xs text-gray-400">{formatCurrentDate()}</p>
          </div>
        </div>
      </div>

      <MoodPicker value={emotion} onSelect={setEmotion} />

      <div className="mb-4 rounded-[22px] border border-black/5 bg-white p-5 shadow-sm">
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="写下一句此刻发生的事..."
          className="h-32 w-full resize-none border-0 bg-transparent p-0 text-[15px] text-gray-800 outline-none placeholder:text-gray-400 focus:outline-none"
        />
      </div>

      <button
        onClick={handlePickImage}
        className="mb-4 flex w-full cursor-pointer flex-col items-center justify-center rounded-[22px] border border-black/5 bg-white p-6 shadow-sm"
      >
        {image ? (
          <div className="relative w-full">
            <img src={image} alt="预览" className="h-44 w-full rounded-xl object-cover" />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm"
              aria-label="删除图片"
            >
              <X size={16} strokeWidth={2.2} />
            </button>
          </div>
        ) : (
          <>
            <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#f5f4f0] text-gray-400">
              <ImagePlus size={20} strokeWidth={2} />
            </span>
            <span className="text-sm text-gray-400">↑ 添加一张图片（可选）</span>
          </>
        )}
      </button>

      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

      <button
        onClick={handleSave}
        disabled={!emotion || isSaving}
        className="mb-8 flex w-full items-center justify-center rounded-[20px] border-none bg-gradient-to-br from-[#c8b8f8] via-[#b0a0ee] to-[#c4b2f6] py-4 text-base font-medium text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.5),_0_3px_10px_rgba(160,143,240,0.28)] transition-all active:scale-95 active:opacity-90 disabled:opacity-50"
      >
        {isSaving ? '保存中...' : '保存这次心情'}
      </button>
    </div>
  )
}

