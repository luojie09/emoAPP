import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

export default function MoodChart({ data }) {
  return (
    <div className="rounded-xl2 bg-card p-3.5 shadow-soft">
      <div className="h-56 w-full pt-1">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 14, right: 10, left: -18, bottom: 4 }}>
            <CartesianGrid stroke="#E7EAF0" strokeDasharray="4 4" />
            <XAxis dataKey="time" stroke="#9AA4B6" tickLine={false} axisLine={{ stroke: '#DDE2EA' }} fontSize={14} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke="#9AA4B6" tickLine={false} axisLine={false} fontSize={14} />
            <Line type="linear" dataKey="score" stroke="#7A83F7" strokeWidth={2.5} dot={{ r: 5, fill: '#7A83F7' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
