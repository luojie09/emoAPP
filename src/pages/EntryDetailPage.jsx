import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Sparkles } from 'lucide-react'
import ImageModal from '../components/ImageModal'

const moodBackground = {
  5: 'bg-gradient-to-br from-green-100 to-emerald-100',
  4: 'bg-gradient-to-br from-blue-100 to-sky-100',
  3: 'bg-gradient-to-br from-yellow-100 to-amber-100',
  2: 'bg-gradient-to-br from-orange-100 to-amber-100',
  1: 'bg-gradient-to-br from-red-100 to-rose-100',
}

export default function EntryDetailPage({ entries }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [selectedImage, setSelectedImage] = useState(null)

  const entry = useMemo(() => (entries ?? []).find((item) => String(item.id) === String(id)), [entries, id])
  const moodScore = Number(entry?.emotion?.score ?? entry?.score ?? 3)
  const moodCardBg = moodBackground[moodScore] ?? moodBackground[3]
  const displayTime = entry ? `${entry.date} ${entry.time}` : ''
  const aiText = typeof entry?.ai_feedback === 'string' ? entry.ai_feedback.trim() : ''

  if (!entry) {
    return (
      <div className="-mx-4 -mt-5 min-h-screen bg-[#f2f2f7] p-6">
        <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center rounded-lg px-2 py-1 text-gray-700 hover:bg-gray-100">
          <ChevronLeft size={22} />
          <span className="ml-1 text-sm">返回</span>
        </button>
        <div className="rounded-[20px] bg-white p-6 text-center text-[#8e8e93]">未找到这条记录</div>
      </div>
    )
  }

  return (
    <div className="-mx-4 -mt-5 min-h-screen bg-[#f2f2f7]">
      <div className="bg-white border-b border-gray-200/60 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} className="text-gray-700" strokeWidth={2} />
          </button>

          <h1 className="text-[17px] font-semibold text-black absolute left-1/2 transform -translate-x-1/2">{displayTime}</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 ${moodCardBg} rounded-full flex items-center justify-center text-2xl`}>{entry?.emotion?.emoji ?? '🙂'}</div>
            <span className="text-[18px] font-semibold text-black">{entry?.emotion?.label ?? entry?.mood ?? '心情'}</span>
          </div>

          <div className="text-[16px] text-black leading-relaxed whitespace-pre-wrap">{entry?.note ?? ''}</div>

          {entry.image ? (
            <div className="mt-4">
              <img
                src={entry.image}
                alt="日记配图"
                className="w-full rounded-xl object-cover cursor-pointer"
                onClick={() => setSelectedImage(entry.image)}
              />
            </div>
          ) : null}
        </div>
      </div>

      {aiText ? (
        <div className="px-4 mt-4">
          <div
            className="rounded-[20px] p-5 border border-[rgba(255,235,179,0.5)]"
            style={{
              background: 'linear-gradient(135deg, #FFF9E6 0%, #F3E8FF 100%)',
              boxShadow: '0 2px 16px rgba(255, 200, 100, 0.12), 0 0 20px rgba(255, 235, 179, 0.08)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-[#FF9500]" strokeWidth={2.5} fill="#FF9500" />
              <span className="text-[13px] text-[#8e8e93] font-medium">来自时光树洞的回音...</span>
            </div>
            <div className="text-[15px] text-[#4A4453] leading-[1.6] tracking-wide whitespace-pre-wrap">{aiText}</div>
          </div>
        </div>
      ) : null}

      {selectedImage && <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />}
    </div>
  )
}
