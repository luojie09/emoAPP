import { useEffect, useRef, useState } from 'react'
import { Camera, User } from 'lucide-react'
import { supabase } from '../supabaseClient'

function normalizeProfile(profile) {
  return {
    nickname: typeof profile?.nickname === 'string' ? profile.nickname.trim() : '',
    avatar_url: typeof profile?.avatar_url === 'string' ? profile.avatar_url : '',
  }
}

export default function ProfileEditor({ user, initialProfile, onSaved, onToast, onClose }) {
  const avatarInputRef = useRef(null)
  const [nickname, setNickname] = useState(initialProfile?.nickname ?? '')
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatar_url ?? '')
  const [previewUrl, setPreviewUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const showNotice = (message) => {
    if (typeof onToast === 'function') onToast(message)
    else window.alert(message)
  }

  useEffect(() => {
    const normalized = normalizeProfile(initialProfile)
    setNickname(normalized.nickname)
    setAvatarUrl(normalized.avatar_url)
  }, [initialProfile])

  useEffect(() => {
    let active = true

    const fetchProfile = async () => {
      if (!user?.id) return
      setIsLoading(true)

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('nickname,avatar_url')
          .eq('id', user.id)
          .maybeSingle()

        if (error) throw error
        if (!active) return

        const normalized = normalizeProfile(data)
        setNickname(normalized.nickname)
        setAvatarUrl(normalized.avatar_url)
        onSaved?.(normalized)
      } catch (error) {
        console.error('ProfileEditor fetch profile failed:', error)
        if (active) showNotice('获取资料失败，请稍后重试')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void fetchProfile()

    return () => {
      active = false
    }
  }, [user?.id])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handlePickAvatar = () => avatarInputRef.current?.click()

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type?.startsWith('image/')) {
      showNotice('请选择图片文件')
      event.target.value = ''
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
    setSelectedFile(file)
    event.target.value = ''
  }

  const handleSave = async () => {
    if (!user?.id || isSaving) return
    const safeNickname = nickname.trim()
    if (!safeNickname) return

    setIsSaving(true)
    try {
      let nextAvatarUrl = avatarUrl

      if (selectedFile) {
        const safeFileName = selectedFile.name.replace(/[^\w.-]/g, '_')
        const filePath = `${user.id}/${Date.now()}-${safeFileName}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, selectedFile, { upsert: false })

        if (uploadError) throw uploadError

        const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath)
        nextAvatarUrl = publicData?.publicUrl ?? nextAvatarUrl
      }

      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: user.id,
        nickname: safeNickname,
        avatar_url: nextAvatarUrl || null,
      })

      if (upsertError) throw upsertError

      const normalized = normalizeProfile({ nickname: safeNickname, avatar_url: nextAvatarUrl })
      setAvatarUrl(normalized.avatar_url)
      setSelectedFile(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl('')
      }
      onSaved?.(normalized)
      showNotice('资料已保存')
      onClose?.()
    } catch (error) {
      console.error('ProfileEditor save profile failed:', error)
      showNotice('保存失败，请稍后重试')
    } finally {
      setIsSaving(false)
    }
  }

  const displayAvatar = previewUrl || avatarUrl

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handlePickAvatar}
          className="relative h-20 w-20 overflow-hidden rounded-full bg-gradient-to-br from-blue-100 to-blue-50"
        >
          {displayAvatar ? (
            <img src={displayAvatar} alt="头像预览" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <User size={28} className="text-[#007AFF]" />
            </span>
          )}
          <span className="absolute bottom-0 right-0 rounded-full bg-black/70 p-1 text-white">
            <Camera size={12} />
          </span>
        </button>

        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-500">昵称</label>
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="请输入昵称"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400"
          />
          {isLoading ? <p className="mt-2 text-xs text-gray-400">正在读取资料...</p> : null}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !nickname.trim()}
          className="rounded-full bg-[#007AFF] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />
    </div>
  )
}
