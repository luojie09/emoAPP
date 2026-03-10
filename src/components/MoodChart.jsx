import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

export default function MoodChart({ data }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="h-52 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 12, right: 10, left: -20, bottom: 2 }}>
            <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
            <XAxis dataKey="time" stroke="#9CA3AF" tickLine={false} axisLine={{ stroke: '#E5E7EB' }} fontSize={12} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke="#9CA3AF" tickLine={false} axisLine={false} fontSize={12} />
            <Line type="linear" dataKey="score" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 4.5, fill: '#6366F1' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
