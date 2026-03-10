import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

export default function MoodChart({ data }) {
  return (
    <div className="rounded-xl2 bg-card p-4 shadow-soft">
      <div className="h-64 w-full pt-2">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 16, right: 14, left: -14, bottom: 10 }}>
            <CartesianGrid stroke="#E7EAF0" strokeDasharray="4 4" />
            <XAxis dataKey="time" stroke="#9AA4B6" tickLine={false} axisLine={{ stroke: '#DDE2EA' }} fontSize={18} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke="#9AA4B6" tickLine={false} axisLine={false} fontSize={18} />
            <Line type="linear" dataKey="score" stroke="#7A83F7" strokeWidth={3} dot={{ r: 6, fill: '#7A83F7' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
