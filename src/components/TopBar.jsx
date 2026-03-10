import { useNavigate } from 'react-router-dom'

export default function TopBar({ title }) {
  const navigate = useNavigate()
  return (
    <header className="mb-8 flex items-center gap-3">
      <button onClick={() => navigate(-1)} className="rounded-full p-1 text-textMain" aria-label="返回">
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m15 5-7 7 7 7" />
        </svg>
      </button>
      <h1 className="text-5xl font-medium">{title}</h1>
    </header>
  )
}
