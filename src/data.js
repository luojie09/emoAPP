export const EMOTIONS = [
  { emoji: '🥳', label: '狂喜', score: 5 },
  { emoji: '🥺', label: '感动', score: 5 },
  { emoji: '🤩', label: '灵感', score: 5 },
  { emoji: '😆', label: '开心', score: 4 },
  { emoji: '😌', label: '放松', score: 4 },
  { emoji: '🤤', label: '满足', score: 4 },
  { emoji: '😶', label: '平静', score: 3 },
  { emoji: '🤔', label: '思考', score: 3 },
  { emoji: '🥱', label: '无聊', score: 3 },
  { emoji: '😑', label: '郁闷', score: 2 },
  { emoji: '😰', label: '焦虑', score: 2 },
  { emoji: '😫', label: '疲惫', score: 2 },
  { emoji: '😡', label: '愤怒', score: 1 },
  { emoji: '😭', label: '悲伤', score: 1 },
  { emoji: '🤯', label: '崩溃', score: 1 },
]

export const DEFAULT_EMOTION = { emoji: '😶', label: '平静', score: 3 }

export const scoreEmoji = {
  5: '🥳',
  4: '😆',
  3: '😶',
  2: '😑',
  1: '😡',
}

export function formatEmotionLabel(emotion) {
  if (!emotion) return `${DEFAULT_EMOTION.emoji} ${DEFAULT_EMOTION.label}`
  return `${emotion.emoji} ${emotion.label}`
}

export function findEmotionByLabel(label) {
  return EMOTIONS.find((emotion) => emotion.label === label)
}

export function findEmotionByScore(score) {
  return EMOTIONS.find((emotion) => emotion.score === score) ?? DEFAULT_EMOTION
}
