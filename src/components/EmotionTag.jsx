import { formatEmotionLabel } from '../data'

const tone = {
  狂喜: 'bg-purple-50 text-purple-600',
  感动: 'bg-fuchsia-50 text-fuchsia-600',
  灵感: 'bg-indigo-50 text-indigo-600',
  开心: 'bg-blue-50 text-blue-600',
  放松: 'bg-emerald-50 text-emerald-600',
  满足: 'bg-cyan-50 text-cyan-600',
  平静: 'bg-slate-100 text-slate-600',
  思考: 'bg-stone-100 text-stone-600',
  无聊: 'bg-zinc-100 text-zinc-600',
  郁闷: 'bg-orange-50 text-orange-600',
  焦虑: 'bg-amber-50 text-amber-600',
  疲惫: 'bg-yellow-50 text-yellow-600',
  愤怒: 'bg-red-50 text-red-600',
  悲伤: 'bg-rose-50 text-rose-600',
  崩溃: 'bg-pink-50 text-pink-600',
}

export default function EmotionTag({ emotion }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone[emotion?.label] ?? 'bg-slate-100 text-slate-600'}`}>
      {formatEmotionLabel(emotion)}
    </span>
  )
}
