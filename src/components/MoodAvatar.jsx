export default function MoodAvatar({ emoji = '🙂', className = '' }) {
  return (
    <div className={`flex items-center justify-center rounded-full bg-[#f4f1ee] ${className}`.trim()}>
      {emoji}
    </div>
  )
}
