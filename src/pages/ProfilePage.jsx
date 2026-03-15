import { useRef, useState } from 'react'
import { User, Upload, Download, RefreshCw, Info, Trash2, ChevronRight, LogOut, Pencil } from 'lucide-react'
import SetupProfileModal from '../components/SetupProfileModal'

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

export default function ProfilePage({
  session,
  isGuest,
  userProfile,
  entries,
  onLogout,
  onLogin,
  onSaveProfile,
  onImportEntries,
  onToast,
  onSync,
}) {
  const importInputRef = useRef(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)

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

  const handleSaveProfile = async (profile) => {
    await onSaveProfile?.(profile)
    onToast?.('资料更新成功')
    setIsEditingProfile(false)
  }

  const displayName =
    (typeof userProfile?.nickname === 'string' && userProfile.nickname.trim()) ||
    (isGuest ? '游客模式' : session?.user?.email || '树洞朋友')
  const subtitle = isGuest ? '数据仅保存在本机，建议登录同步' : '已开启云端安全同步'

  return (
    <>
      <div className="px-4 pt-4 pb-4">
        <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] px-5 py-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsEditingProfile(true)}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center flex-shrink-0 overflow-hidden"
          >
            {userProfile?.avatar ? (
              <img src={userProfile.avatar} alt="头像" className="h-full w-full object-cover" />
            ) : (
              <User size={28} className="text-[#007AFF]" strokeWidth={2} />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <button type="button" onClick={() => setIsEditingProfile(true)} className="text-left w-full">
              <div className="text-[20px] font-semibold text-black mb-0.5 truncate">{displayName}</div>
              <div className="text-[13px] text-[#8e8e93] leading-snug">{subtitle}</div>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingProfile(true)}
            className="inline-flex items-center gap-1 rounded-full border border-[#D9D9DE] px-3 py-1.5 text-xs font-semibold text-[#3c3c43]"
          >
            <Pencil size={13} />
            编辑资料
          </button>

          {isGuest ? (
            <button
              onClick={onLogin}
              className="bg-[#007AFF] hover:bg-[#0051D5] active:scale-95 text-white px-5 py-2 rounded-full text-[14px] font-semibold transition-all flex-shrink-0"
            >
              去登录
            </button>
          ) : null}
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="px-4 pb-2">
          <h2 className="text-[13px] text-[#8e8e93] uppercase tracking-wider font-medium">数据管理</h2>
        </div>

        <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
          <button onClick={handlePickImportFile} className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 active:bg-gray-100/50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-100 to-green-50 flex items-center justify-center flex-shrink-0">
              <Upload size={18} className="text-emerald-600" strokeWidth={2.5} />
            </div>
            <span className="text-[17px] text-black flex-1 text-left">导入数据</span>
            <ChevronRight size={20} className="text-[#C7C7CC] flex-shrink-0" strokeWidth={2} />
          </button>

          <div className="pl-[68px] pr-5">
            <div className="h-px bg-[#E5E5EA]" />
          </div>

          <button onClick={handleExport} className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 active:bg-gray-100/50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-sky-50 flex items-center justify-center flex-shrink-0">
              <Download size={18} className="text-blue-600" strokeWidth={2.5} />
            </div>
            <span className="text-[17px] text-black flex-1 text-left">导出记录</span>
            <ChevronRight size={20} className="text-[#C7C7CC] flex-shrink-0" strokeWidth={2} />
          </button>

          {!isGuest ? (
            <>
              <div className="pl-[68px] pr-5">
                <div className="h-px bg-[#E5E5EA]" />
              </div>

              <button onClick={onSync} className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 active:bg-gray-100/50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-violet-50 flex items-center justify-center flex-shrink-0">
                  <RefreshCw size={18} className="text-purple-600" strokeWidth={2.5} />
                </div>
                <span className="text-[17px] text-black flex-1 text-left">手动同步云端</span>
                <ChevronRight size={20} className="text-[#C7C7CC] flex-shrink-0" strokeWidth={2} />
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="px-4 pb-24">
        <div className="px-4 pb-2">
          <h2 className="text-[13px] text-[#8e8e93] uppercase tracking-wider font-medium">关于与系统</h2>
        </div>

        <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
          <button className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 active:bg-gray-100/50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center flex-shrink-0">
              <Info size={18} className="text-gray-600" strokeWidth={2.5} />
            </div>
            <span className="text-[17px] text-black flex-1 text-left">关于 Emotion Tracker</span>
            <span className="text-[17px] text-[#8e8e93] flex-shrink-0">v1.0.0</span>
          </button>

          <div className="pl-[68px] pr-5">
            <div className="h-px bg-[#E5E5EA]" />
          </div>

          <button onClick={handleDangerAction} className="w-full px-5 py-4 flex items-center gap-4 hover:bg-red-50/50 active:bg-red-100/50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-[#FFEBEB] flex items-center justify-center flex-shrink-0">
              {isGuest ? (
                <Trash2 size={18} className="text-[#FF3B30]" strokeWidth={2.5} />
              ) : (
                <LogOut size={18} className="text-[#FF3B30]" strokeWidth={2.5} />
              )}
            </div>
            <span className="text-[17px] text-[#FF3B30] flex-1 text-left font-medium">{isGuest ? '清除本机数据' : '退出登录'}</span>
          </button>
        </div>
      </div>

      <input ref={importInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />

      <SetupProfileModal
        isOpen={isEditingProfile}
        forceSetup={false}
        title="编辑我的资料"
        submitLabel="保存资料"
        initialNickname={userProfile?.nickname ?? ''}
        initialAvatar={userProfile?.avatar ?? ''}
        onSave={handleSaveProfile}
        onClose={() => setIsEditingProfile(false)}
        onError={() => onToast?.('资料保存失败，请稍后重试')}
      />
    </>
  )
}

