import { useNavigate } from 'react-router-dom'

export default function TopBar({ title }) {
  const navigate = useNavigate()
  return (
    <header className="mb-1 flex items-center gap-2">
      <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-gray-800" aria-label="返回">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m15 5-7 7 7 7" />
        </svg>
      </button>
      <h1 className="text-2xl font-medium text-gray-800">{title}</h1>
    </header>
  )
}
