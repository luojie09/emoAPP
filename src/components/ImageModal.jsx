import { useEffect } from 'react'

function createDownloadName() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `diary-image-${timestamp}.jpg`
}

export default function ImageModal({ imageUrl, onClose }) {
  useEffect(() => {
    if (!imageUrl) return undefined

    const handleKeydown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [imageUrl, onClose])

  if (!imageUrl) return null

  const handleDownload = async (event) => {
    event.stopPropagation()

    try {
      const response = await fetch(imageUrl)
      if (!response.ok) throw new Error('download-failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = createDownloadName()
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onClose?.()
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
    >
      <img
        src={imageUrl}
        alt="放大预览"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[78vh] w-auto max-w-[92vw] rounded-2xl object-contain shadow-2xl"
      />

      <button
        type="button"
        onClick={handleDownload}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-gray-900 shadow-lg transition hover:bg-gray-100"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        保存图片
      </button>
    </div>
  )
}
