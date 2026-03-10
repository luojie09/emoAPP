import { formatMoodLabel } from '../data'

const tone = {
  开心: 'bg-blue-50 text-blue-600',
  平静: 'bg-slate-100 text-slate-600',
  有点差: 'bg-orange-50 text-orange-600',
  很差: 'bg-red-50 text-red-600',
  非常开心: 'bg-purple-50 text-purple-600',
}

export default function EmotionTag({ mood }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone[mood] ?? 'bg-slate-100 text-slate-600'}`}>
      {formatMoodLabel(mood)}
    </span>
  )
}
