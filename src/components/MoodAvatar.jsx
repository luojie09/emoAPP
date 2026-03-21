export default function MoodAvatar({ emoji = '🙂', className = '' }) {
  return (
    <div className={`flex items-center justify-center rounded-full bg-[#f5f4f0] ${className}`.trim()}>
      {emoji}
    </div>
  )
}
