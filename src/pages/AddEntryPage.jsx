import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { getTodayKey } from '../utils'

const MAX_IMAGE_EDGE = 800
const JPEG_QUALITY = 0.6
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024
const PURE_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😊', '🙂',
  '😉', '😌', '😍', '🥰', '😘', '😙', '😚',
  '😋', '😜', '🤪', '🤩', '🥳', '😎', '🤗',
  '😏', '😶', '😐', '😑', '🙄', '😴', '😪',
  '😷', '🤒', '🤕', '😵', '🥴', '😕', '😟',
  '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺',
  '😢', '😭', '😤', '😠', '😡', '🤯', '😬',
  '😱', '😰', '😥', '😓', '🫠', '🫥', '😮‍💨',
  '😺', '😸', '😹', '😻', '😼', '😽', '🙀',
  '😿', '😾', '❤️', '🩷', '💛', '💚', '💙',
  '💜', '🖤', '🤍', '🤎', '💔', '💕', '💞',
  '💓', '💗', '💖', '💘', '💝', '💟', '❣️',
]

const EMOJI_LIST = [
  { emoji: '🤩', score: 5, label: '惊喜' }, { emoji: '😍', score: 5, label: '热爱' }, { emoji: '🥰', score: 5, label: '喜爱' }, { emoji: '😆', score: 5, label: '大笑' }, { emoji: '😂', score: 5, label: '笑哭' }, { emoji: '🥳', score: 5, label: '庆祝' }, { emoji: '😁', score: 5, label: '欢笑' }, { emoji: '😀', score: 5, label: '开心' }, { emoji: '😻', score: 5, label: '花痴猫' }, { emoji: '😸', score: 5, label: '开心猫' },
  { emoji: '😊', score: 4, label: '微笑' }, { emoji: '😋', score: 4, label: '调皮' }, { emoji: '😎', score: 4, label: '得意' }, { emoji: '😜', score: 4, label: '鬼脸' }, { emoji: '🙂', score: 4, label: '浅笑' }, { emoji: '😉', score: 4, label: '眨眼' }, { emoji: '😌', score: 4, label: '欣慰' }, { emoji: '☺️', score: 4, label: '愉悦' }, { emoji: '😺', score: 4, label: '微笑猫' }, { emoji: '😽', score: 4, label: '亲亲猫' },
  { emoji: '😐', score: 3, label: '无语' }, { emoji: '😑', score: 3, label: '面无表情' }, { emoji: '😶', score: 3, label: '沉默' }, { emoji: '🤔', score: 3, label: '思考' }, { emoji: '🤨', score: 3, label: '挑眉' }, { emoji: '🙄', score: 3, label: '白眼' }, { emoji: '🥱', score: 3, label: '打哈欠' }, { emoji: '😬', score: 3, label: '尴尬' }, { emoji: '🙃', score: 3, label: '倒脸' }, { emoji: '😼', score: 3, label: '冷笑猫' },
  { emoji: '😔', score: 2, label: '沮丧' }, { emoji: '😕', score: 2, label: '困惑' }, { emoji: '😟', score: 2, label: '担忧' }, { emoji: '😢', score: 2, label: '流泪' }, { emoji: '😥', score: 2, label: '失望' }, { emoji: '😰', score: 2, label: '焦虑' }, { emoji: '🤒', score: 2, label: '生病' }, { emoji: '🥺', score: 2, label: '委屈' }, { emoji: '🙀', score: 2, label: '惊吓猫' }, { emoji: '😿', score: 2, label: '哭泣猫' },
  { emoji: '😭', score: 1, label: '大哭' }, { emoji: '😡', score: 1, label: '愤怒' }, { emoji: '🤬', score: 1, label: '咒骂' }, { emoji: '🤯', score: 1, label: '爆炸' }, { emoji: '😱', score: 1, label: '惊恐' }, { emoji: '🤢', score: 1, label: '恶心' }, { emoji: '🤮', score: 1, label: '呕吐' }, { emoji: '😫', score: 1, label: '疲惫' }, { emoji: '😩', score: 1, label: '崩溃' }, { emoji: '😾', score: 1, label: '生气猫' },
]

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
  const [isPickerOpen, setIsPickerOpen] = useState(false)
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

  const handleEmojiClick = (item) => {
    setEmotion({
      emoji: item.emoji,
      label: item.label,
      score: item.score,
    })
    setIsPickerOpen(false)
  }

  return (
    <div className="space-y-4 pt-3">
      <TopBar title="记录现在的心情" />
      <p className="text-base text-gray-700">此刻你的感觉怎么样?</p>

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
