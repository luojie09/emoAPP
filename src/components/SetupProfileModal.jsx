import { useEffect, useRef, useState } from 'react'

const MAX_IMAGE_EDGE = 800
const JPEG_QUALITY = 0.85
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024

function compressImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('read-failed'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('image-load-failed'))
      img.onload = () => {
        const ratio = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height))
        const width = Math.max(1, Math.round(img.width * ratio))
        const height = Math.max(1, Math.round(img.height * ratio))

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('canvas-context-failed'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
      }

      img.src = String(reader.result ?? '')
    }

    reader.readAsDataURL(file)
  })
}

export default function SetupProfileModal({
  isOpen,
  forceSetup = false,
  initialNickname = '',
  initialAvatar = '',
  title = '欢迎来到时光树洞，我该怎么称呼你？',
  submitLabel = '开启我的树洞',
  onSave,
  onClose,
  onError,
}) {
  const uploadRef = useRef(null)
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setNickname(initialNickname ?? '')
    setAvatar(initialAvatar ?? '')
    setIsSaving(false)
  }, [isOpen, initialNickname, initialAvatar])

  if (!isOpen) return null

  const handlePickAvatar = () => uploadRef.current?.click()

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type?.startsWith('image/')) {
      event.target.value = ''
      return
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      event.target.value = ''
      return
    }

    try {
      const compressed = await compressImageToBase64(file)
      setAvatar(compressed)
    } catch {
      setAvatar('')
    } finally {
      event.target.value = ''
    }
  }

  const handleSubmit = async () => {
    const trimmed = nickname.trim()
    if (!trimmed || isSaving) return
    setIsSaving(true)
    try {
      await onSave?.({ nickname: trimmed, avatar })
      if (!forceSetup) onClose?.()
    } catch (error) {
      onError?.(error)
    } finally {
      setIsSaving(false)
    }
  }

  const canSubmit = nickname.trim().length > 0 && !isSaving

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={() => {
        if (!forceSetup) onClose?.()
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handlePickAvatar}
            className="relative h-24 w-24 overflow-hidden rounded-full border border-gray-200 bg-gray-100 transition hover:scale-[1.02]"
          >
            {avatar ? (
              <img src={avatar} alt="头像预览" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm text-gray-500">上传头像</span>
            )}
          </button>
          <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </div>

        <div className="mt-5">
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="请输入你的昵称"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-800 outline-none focus:border-blue-400"
          />
        </div>

        <div className="mt-5 flex gap-3">
          {!forceSetup ? (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700"
            >
              取消
            </button>
          ) : null}
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="flex-1 rounded-xl bg-[#007AFF] py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? '保存中...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
