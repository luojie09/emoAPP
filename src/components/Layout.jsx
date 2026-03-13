import { Link, useLocation } from 'react-router-dom'

function HomeIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-6 w-6 ${active ? 'text-indigo-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 10.2 12 3l9 7.2v10.2a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20.4V10.2Z" />
      <path d="M9 21V12.8h6V21" />
    </svg>
  )
}

function ClockIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-6 w-6 ${active ? 'text-indigo-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

export default function Layout({ children }) {
  const location = useLocation()

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50">
      <main className="px-4 pb-24 pt-6">{children}</main>
      <nav className="fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 justify-around border-t border-line bg-white py-2.5">
        <Link to="/" className="flex min-w-24 flex-col items-center gap-1 py-1">
          <HomeIcon active={location.pathname === '/'} />
          <span className={`text-xs ${location.pathname === '/' ? 'text-indigo-500' : 'text-gray-400'}`}>今天</span>
        </Link>
        <Link to="/history" className="flex min-w-24 flex-col items-center gap-1 py-1">
          <ClockIcon active={location.pathname.startsWith('/history')} />
          <span className={`text-xs ${location.pathname.startsWith('/history') ? 'text-indigo-500' : 'text-gray-400'}`}>历史</span>
        </Link>
      </nav>
    </div>
  )
}
