import { useMemo, useRef, useState } from 'react'
import { User, Upload, Download, RefreshCw, Info, Trash2, ChevronRight, LogOut, Pencil, Shield } from 'lucide-react'
import ProfileEditor from '../components/ProfileEditor'

function downloadEntriesAsJson(entries) {
  const content = JSON.stringify(entries ?? [], null, 2)
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'emo_backup.json'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function ListRow({ icon, label, onClick, value, danger = false, hideChevron = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-3 px-4 py-4 text-left transition-colors active:bg-[#faf9f7] ${
        danger ? 'text-[#e05555]' : ''
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
          danger ? 'bg-[#fff1f1] text-[#e05555]' : 'bg-[#f0eeff] text-[#9080d0]'
        }`}
      >
        {icon}
      </div>
      <span className={`flex-1 text-[15px] ${danger ? 'text-[#e05555]' : 'text-[#1a1814]'}`}>{label}</span>
      {value ? <span className="mr-1 text-xs text-gray-400">{value}</span> : null}
      {hideChevron ? null : <ChevronRight size={18} className="text-gray-300" strokeWidth={2} />}
    </button>
  )
}

export default function ProfilePageV2({
  session,
  isGuest,
  entries,
  userProfile,
  onProfileSaved,
  onLogout,
  onLogin,
  onImportEntries,
  onToast,
  onSync,
}) {
  const importInputRef = useRef(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  const totalCount = useMemo(() => (entries ?? []).length, [entries])
  const favoriteCount = useMemo(() => (entries ?? []).filter((entry) => entry?.isFavorite).length, [entries])
  const dayCount = useMemo(() => {
    const days = new Set(
      (entries ?? [])
        .map((entry) => entry?.date)
        .filter((date) => typeof date === 'string' && date.trim()),
    )
    return days.size
  }, [entries])

  const handlePickImportFile = () => importInputRef.current?.click()

  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const content = await file.text()
      const parsed = JSON.parse(content)
      if (!Array.isArray(parsed)) throw new Error('invalid-format')
      await onImportEntries?.(parsed)
    } catch {
      onToast?.('导入失败，请确认文件格式正确')
    } finally {
      event.target.value = ''
    }
  }

  const handleExport = () => {
    downloadEntriesAsJson(entries)
    onToast?.('数据已导出')
  }

  const handleDangerAction = async () => {
    if (isGuest) {
      const confirmed = window.confirm('确定要清除本机数据吗？此操作不可恢复。')
      if (!confirmed) return
      localStorage.clear()
      window.location.reload()
      return
    }

    await onLogout?.()
  }

  const displayName = isGuest ? '游客模式' : userProfile?.nickname || session?.user?.email || '已登录用户'
  const subtitle = isGuest ? '数据仅保存在本机，建议登录同步' : '☁ 云端存储'
  const avatarUrl = !isGuest ? userProfile?.avatar_url : ''

  return (
    <div className="-mx-4 -mt-6 min-h-screen overflow-y-auto bg-[#f7f6f2] px-4 pt-6 pb-28 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="px-5 pt-0 pb-4">
        <h1 className="text-3xl font-serif font-bold text-[#1a1814]">我的</h1>
      </div>

      <div className="mx-4 mb-4 rounded-[22px] border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#ece9ff] text-3xl">
            {avatarUrl ? <img src={avatarUrl} alt="头像" className="h-full w-full object-cover" /> : '🌳'}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-xl font-bold leading-tight text-[#1a1814] truncate">{displayName}</div>
            <div className="mt-1 text-xs text-gray-400">{subtitle}</div>

            <div className="mt-3">
              {isGuest ? (
                <button
                  onClick={onLogin}
                  className="inline-flex items-center gap-1 rounded-full bg-[#f0eeff] px-4 py-2 text-[13px] font-medium text-[#9080d0] active:bg-[#e4e0f8]"
                >
                  <Pencil size={14} />
                  去登录
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingProfile((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-full bg-[#f0eeff] px-4 py-2 text-[13px] font-medium text-[#9080d0] active:bg-[#e4e0f8]"
                >
                  <Pencil size={14} />
                  编辑资料
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="my-4 h-px bg-[#f0ede8]" />

        <div className="flex justify-around">
          <div className="text-center">
            <div className="mb-1 text-[26px] font-bold leading-none text-[#1a1814]">{totalCount}</div>
            <div className="text-xs text-gray-400">总记录</div>
          </div>
          <div className="text-center">
            <div className="mb-1 text-[26px] font-bold leading-none text-[#1a1814]">{favoriteCount}</div>
            <div className="text-xs text-gray-400">收藏</div>
          </div>
          <div className="text-center">
            <div className="mb-1 text-[26px] font-bold leading-none text-[#1a1814]">{dayCount}</div>
            <div className="text-xs text-gray-400">天数</div>
          </div>
        </div>
      </div>

      {!isGuest && isEditingProfile ? (
        <div className="mx-4 mb-4">
          <ProfileEditor
            user={session?.user}
            initialProfile={userProfile}
            onSaved={onProfileSaved}
            onToast={onToast}
            onClose={() => setIsEditingProfile(false)}
          />
        </div>
      ) : null}

      <div className="px-6 pt-4 pb-2 text-sm font-medium text-gray-400">数据管理</div>
      <div className="mx-4 mb-2 overflow-hidden rounded-[20px] border border-black/5 bg-white shadow-sm">
        <div className="border-b border-[#f5f3ef] last:border-b-0">
          <ListRow icon={<Upload size={16} strokeWidth={2.2} />} label="导入数据" onClick={handlePickImportFile} />
        </div>
        <div className={`${isGuest ? '' : 'border-b border-[#f5f3ef]'} last:border-b-0`}>
          <ListRow icon={<Download size={16} strokeWidth={2.2} />} label="导出记录" onClick={handleExport} />
        </div>
        {!isGuest ? (
          <div>
            <ListRow icon={<RefreshCw size={16} strokeWidth={2.2} />} label="手动同步云端" onClick={onSync} />
          </div>
        ) : null}
      </div>

      <div className="px-6 pt-4 pb-2 text-sm font-medium text-gray-400">关于与系统</div>
      <div className="mx-4 mb-2 overflow-hidden rounded-[20px] border border-black/5 bg-white shadow-sm">
        <div className="border-b border-[#f5f3ef] last:border-b-0">
          <ListRow icon={<Info size={16} strokeWidth={2.2} />} label="关于心迹" value="v1.0.0" onClick={() => {}} />
        </div>
        <div>
          <ListRow icon={<Shield size={16} strokeWidth={2.2} />} label="隐私政策" onClick={() => {}} />
        </div>
      </div>

      <button
        onClick={handleDangerAction}
        className="mx-4 mt-4 mb-8 flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-[20px] border border-black/5 bg-white p-4 text-[15px] font-medium text-[#e05555] shadow-sm active:bg-[#fff5f5]"
      >
        {isGuest ? <Trash2 size={16} strokeWidth={2.2} /> : <LogOut size={16} strokeWidth={2.2} />}
        <span>{isGuest ? '清除本机数据' : '退出登录'}</span>
      </button>

      <input ref={importInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
    </div>
  )
}
