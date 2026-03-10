export const moodChoices = ['很差', '有点差', '平静', '开心', '非常开心']

export const moodEmojiByMood = {
  非常开心: '🥳',
  开心: '😆',
  平静: '😶',
  有点差: '😑',
  很差: '☹️',
}

export const moodEmojiByScore = {
  5: '🥳',
  4: '😆',
  3: '😶',
  2: '😑',
  1: '☹️',
}

export function formatMoodLabel(mood) {
  return `${moodEmojiByMood[mood] ?? '😶'} ${mood}`
}

export function formatScoreMood(score, mood) {
  if (mood) return formatMoodLabel(mood)
  const emoji = moodEmojiByScore[score] ?? '😶'
  return `${emoji} ${score ?? ''}`.trim()
}
