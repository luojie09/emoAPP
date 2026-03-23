import { Clock3, Home, User } from 'lucide-react'

function TabButton({ label, active, onClick, children }) {
  return (
    <button onClick={onClick} className="flex min-w-24 flex-col items-center justify-center gap-1 py-1.5">
      <span className={active ? 'text-[#007AFF]' : 'text-[#8E8E93]'}>{children}</span>
      <span className={`text-[12px] leading-none ${active ? 'text-[#007AFF] font-semibold' : 'text-[#8E8E93]'}`}>{label}</span>
    </button>
  )
}

export default function AppLayout({ children, currentTab, onTabChange }) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#f7f6f2]">
      <main className="px-4">{children}</main>
      <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-[#f0ede8] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto grid max-w-md grid-cols-3 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),_20px)]">
          <TabButton label="今天" active={currentTab === 'today'} onClick={() => onTabChange?.('today')}>
            <Home size={22} strokeWidth={2} />
          </TabButton>
          <TabButton label="历史" active={currentTab === 'history'} onClick={() => onTabChange?.('history')}>
            <Clock3 size={22} strokeWidth={2} />
          </TabButton>
          <TabButton label="我的" active={currentTab === 'profile'} onClick={() => onTabChange?.('profile')}>
            <User size={22} strokeWidth={2} />
          </TabButton>
        </div>
      </nav>
    </div>
  )
}


