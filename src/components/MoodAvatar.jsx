export default function MoodAvatar({ emoji = '🙂', className = '' }) {
  return (
    <div className={`flex items-center justify-center rounded-full bg-[#77d6bd]/30 ${className}`.trim()}>
      {emoji}
    </div>
  )
}
