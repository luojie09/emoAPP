import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatEmotionLabel, scoreEmoji } from '../data'

function MoodTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  const point = payload[0].payload
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-700">{formatEmotionLabel(point.emotion)}</p>
    </div>
  )
}

export default function MoodChart({ data }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="h-52 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 12, right: 10, left: -20, bottom: 2 }}>
            <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="4 4" />
            <XAxis dataKey="time" stroke="#9CA3AF" tickLine={false} axisLine={{ stroke: '#E5E7EB' }} fontSize={12} />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tickFormatter={(value) => scoreEmoji[value] ?? value}
              stroke="#9CA3AF"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <Tooltip content={<MoodTooltip />} cursor={{ stroke: '#C7D2FE', strokeWidth: 1 }} />
            <Line type="monotone" dataKey="score" stroke="#6366F1" strokeWidth={3} dot={{ r: 4.5, fill: '#6366F1' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
