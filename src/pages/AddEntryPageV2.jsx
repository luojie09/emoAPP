import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import exifr from 'exifr'
import TopBar from '../components/TopBar'
import { getLocalDateTimeParts, getTodayKey } from '../utils'

const MAX_IMAGE_EDGE = 1280
const JPEG_QUALITY = 0.8
const MAX_UPLOAD_SIZE = 20 * 1024 * 1024
const MAX_BASE64_BYTES = 2.5 * 1024 * 1024

const EMOJI_LIST = [
  { emoji: '🤩', score: 5, label: '惊喜' }, { emoji: '😍', score: 5, label: '热爱' }, { emoji: '🥰', score: 5, label: '喜爱' }, { emoji: '😆', score: 5, label: '大笑' }, { emoji: '😂', score: 5, label: '笑哭' }, { emoji: '🥳', score: 5, label: '庆祝' }, { emoji: '😁', score: 5, label: '欢笑' }, { emoji: '😀', score: 5, label: '开心' }, { emoji: '😻', score: 5, label: '花痴猫' }, { emoji: '😸', score: 5, label: '开心猫' },
  { emoji: '😊', score: 4, label: '微笑' }, { emoji: '😋', score: 4, label: '调皮' }, { emoji: '😎', score: 4, label: '得意' }, { emoji: '😜', score: 4, label: '鬼脸' }, { emoji: '🙂', score: 4, label: '浅笑' }, { emoji: '😉', score: 4, label: '眨眼' }, { emoji: '😌', score: 4, label: '欣慰' }, { emoji: '☺️', score: 4, label: '愉悦' }, { emoji: '😺', score: 4, label: '微笑猫' }, { emoji: '😽', score: 4, label: '亲亲猫' },
  { emoji: '😐', score: 3, label: '无语' }, { emoji: '😑', score: 3, label: '面无表情' }, { emoji: '😶', score: 3, label: '沉默' }, { emoji: '🤔', score: 3, label: '思考' }, { emoji: '🤨', score: 3, label: '挑眉' }, { emoji: '🙄', score: 3, label: '白眼' }, { emoji: '🥱', score: 3, label: '打哈欠' }, { emoji: '😬', score: 3, label: '尴尬' }, { emoji: '🙃', score: 3, label: '倒脸' }, { emoji: '😼', score: 3, label: '冷笑猫' },
  { emoji: '😔', score: 2, label: '沮丧' }, { emoji: '😕', score: 2, label: '困惑' }, { emoji: '😟', score: 2, label: '担忧' }, { emoji: '😢', score: 2, label: '流泪' }, { emoji: '😥', score: 2, label: '失望' }, { emoji: '😰', score: 2, label: '焦虑' }, { emoji: '🤒', score: 2, label: '生病' }, { emoji: '🥺', score: 2, label: '委屈' }, { emoji: '🙀', score: 2, label: '惊吓猫' }, { emoji: '😿', score: 2, label: '哭泣猫' },
  { emoji: '😭', score: 1, label: '大哭' }, { emoji: '😡', score: 1, label: '愤怒' }, { emoji: '🤬', score: 1, label: '咒骂' }, { emoji: '🤯', score: 1, label: '爆炸' }, { emoji: '😱', score: 1, label: '惊恐' }, { emoji: '🤢', score: 1, label: '恶心' }, { emoji: '🤮', score: 1, label: '呕吐' }, { emoji: '😫', score: 1, label: '疲惫' }, { emoji: '😩', score: 1, label: '崩溃' }, { emoji: '😾', score: 1, label: '生气猫' },
]

function toTimeInputValue(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function cleanEnvValue(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^\[|\]$/g, '')
}

async function requestAiFeedback({ score, emotionLabel, text }) {
  const baseUrl = cleanEnvValue(import.meta.env.VITE_AI_BASE_URL)
  const apiKey = cleanEnvValue(import.meta.env.VITE_AI_API_KEY)
  if (!baseUrl || !apiKey) return null

  const lengthInstruction = score >= 4
    ? '字数控制在 150 到 200 字左右，简短轻快。'
    : '字数控制在 300 到 500 字左右，给予充足的心理抚慰和深度共情。'

  const systemPrompt = `你是一个名为“时光树洞”的专属情绪陪伴者。你的任务是阅读用户的日记，并给予温暖、极具共情力的回音。
【核心规则】
1. 紧扣细节：必须在回复中自然提取或呼应用户日记里的具体细节，让用户确信你认真阅读了。
2. 情感同频：
   - 面对高分（4-5分）：做快乐放大器，肯定他们的小确幸。
   - 面对平淡（3分）：做安静的陪伴者，认可日常的平静。
   - 面对低分（1-2分）：做情绪的安全网。接纳情绪，不要说教，给予语言上的拥抱和深度开导。
3. 语气与口吻：像一个极其懂他的老朋友，温柔、真诚、克制。
4. 格式与篇幅：${lengthInstruction} 务必适当分段（每段不要太长），保持排版的呼吸感。结尾可以自然地带一个温暖的 emoji（如 ✨, 🫂, ☕, 🎉）。`

  const userPrompt = `【今日心情】：${score}分\n【情绪标签】：${emotionLabel || '无'}\n【日记正文】：${text}`
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 15000)

  try {
    const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'deepseek-chat', messages }),
      signal: controller.signal,
    })

    if (!response.ok) return null
    const json = await response.json()
    const content = json?.choices?.[0]?.message?.content
    const normalized = typeof content === 'string' ? content.trim() : ''
    return normalized || null
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
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

export default function AddEntryPageV2({ onSave, onQueueAiTask, onToast, onGenerateAiFeedback }) {
  const navigate = useNavigate()
  const imageInputRef = useRef(null)
  const [emotion, setEmotion] = useState(null)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
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
    const selectedEmotion = emotion

    if (text.length > 0 && savedEntryId) {
      onQueueAiTask?.({
        entryId: savedEntryId,
        text,
        score: selectedEmotion.score,
        emotionLabel: selectedEmotion.label,
      })
      void onGenerateAiFeedback?.(savedEntryId, text, selectedEmotion.score, selectedEmotion.label)
    }

    setEmotion(null)
    setNote('')
    setImage('')
    setIsPickerOpen(false)
    const now = new Date()
    const { localDate: nowDate, localTime: nowTime } = getLocalDateTimeParts(now)
    setSelectedDate(nowDate || getTodayKey())
    setSelectedTime(nowTime || toTimeInputValue(now))
    setIsSaving(false)
    navigate('/')
  }

  const handleEmojiClick = (item) => {
    setEmotion({ emoji: item.emoji, label: item.label, score: item.score })
    setIsPickerOpen(false)
  }

  return (
    <div className="space-y-4 pt-3">
      <TopBar title="记录现在的心情" />
      <p className="text-base text-gray-700">此刻你的感觉怎么样？</p>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsPickerOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-gray-100"
          >
            <span className="inline-flex items-center gap-2">
              <span className="text-xl">{emotion?.emoji || '😀'}</span>
              <span>{emotion?.emoji ? '已选择心情，点击可更换' : '😀 点击选择心情'}</span>
            </span>
            <span className="text-gray-400">{isPickerOpen ? '收起' : '展开'}</span>
          </button>

          {isPickerOpen ? (
            <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-full">
              <p className="mb-2 px-1 text-xs text-gray-400">按情绪强烈程度从上到下排列</p>
              <div className="grid grid-cols-7 gap-2 p-3 bg-white rounded-xl shadow-sm border border-gray-100 max-h-64 overflow-y-auto">
                {EMOJI_LIST.map((item, index) => (
                  <button
                    key={`${item.emoji}-${index}`}
                    type="button"
                    onClick={() => handleEmojiClick(item)}
                    title={item.label}
                    className="text-2xl hover:scale-125 transition-transform duration-200 focus:outline-none"
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
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
