import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { moodChoices } from '../data'
import { getTodayKey, moodScale } from '../utils'

export default function AddEntryPage({ onSave }) {
  const navigate = useNavigate()
  const imageInputRef = useRef(null)
  const [mood, setMood] = useState('')
  const [note, setNote] = useState('')
  const [image, setImage] = useState('')

  const handlePickImage = () => imageInputRef.current?.click()

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => setImage(String(reader.result ?? ''))
    reader.readAsDataURL(file)
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
      note: note.trim() || '（无备注）',
      image,
    }

    onSave((prev) => [...prev, entry])
    navigate('/')
  }

  return (
    <div>
      <TopBar title="记录现在的心情" />
      <p className="mb-6 text-4xl text-slate-600">此刻你的感觉怎么样?</p>
      <div className="mb-6 rounded-xl2 bg-card p-5 shadow-soft">
        {moodChoices.map((option) => (
          <button
            key={option}
            onClick={() => setMood(option)}
            className={`mb-4 h-16 w-full rounded-3xl border text-4xl last:mb-0 ${
              mood === option ? 'border-primary bg-indigo-50 text-primary' : 'border-line text-slate-600'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="写一句此刻发生的事..."
        className="mb-6 h-48 w-full resize-none rounded-xl2 border-0 bg-card p-6 text-4xl text-textMain shadow-soft placeholder:text-textMuted focus:outline-none"
      />

      <button onClick={handlePickImage} className="mb-4 flex h-28 w-full items-center justify-center gap-3 rounded-xl2 bg-card text-4xl text-textMuted shadow-soft">
        <span>
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            <path d="M12 15V4" />
            <path d="m8 8 4-4 4 4" />
          </svg>
        </span>
        <span>添加一张图片（可选）</span>
      </button>

      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

      {image && <img src={image} alt="预览" className="mb-8 h-24 w-24 rounded-2xl object-cover" />}

      <button
        onClick={handleSave}
        disabled={!mood}
        className="h-16 w-full rounded-xl2 bg-primary text-4xl text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        保存这次心情
      </button>
    </div>
  )
}
