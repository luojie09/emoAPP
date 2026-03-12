export default function Toast({ message }) {
  if (!message) return null

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2">
      <div className="rounded-full bg-black/85 px-4 py-2 text-sm text-white shadow-lg">{message}</div>
    </div>
  )
}
