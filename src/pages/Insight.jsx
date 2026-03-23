import { useMemo } from 'react'
import EmotionalTide from '../components/EmotionalTide'
import WordPoem from '../components/WordPoem'

const ENERGY_FALLBACK_WORDS = [
  { word: '阳光', weight: 5 },
  { word: '咖啡', weight: 4 },
  { word: '散步', weight: 3 },
  { word: '顺利', weight: 4 },
  { word: '温柔', weight: 5 },
  { word: '安静', weight: 3 },
  { word: '朋友', weight: 4 },
  { word: '好吃', weight: 2 },
  { word: '完成', weight: 4 },
  { word: '呼吸', weight: 2 },
  { word: '微风', weight: 3 },
  { word: '放松', weight: 5 },
  { word: '清晨', weight: 3 },
  { word: '开心', weight: 4 },
  { word: '轻盈', weight: 2 },
]

const HEALING_FALLBACK_WORDS = [
  { word: '疲惫', weight: 5 },
  { word: '边界', weight: 4 },
  { word: '雨夜', weight: 3 },
  { word: '沉默', weight: 4 },
  { word: '焦虑', weight: 5 },
  { word: '委屈', weight: 4 },
  { word: '失眠', weight: 3 },
  { word: '拉扯', weight: 4 },
  { word: '压力', weight: 5 },
  { word: '无力', weight: 4 },
  { word: '停顿', weight: 2 },
  { word: '释怀', weight: 3 },
  { word: '回家', weight: 2 },
  { word: '拥抱', weight: 3 },
  { word: '修补', weight: 4 },
]

function InsightSectionTitle({ title }) {
  return (
    <div className="mb-3 mt-8 flex items-center gap-3 px-1">
      <span className="shrink-0 text-sm font-medium text-[#b9b2a8]">{title}</span>
      <div className="h-px flex-1 bg-[#ece7df]" />
    </div>
  )
}

function getEntryScore(entry) {
  return Number(entry?.emotion?.score ?? entry?.score ?? 3)
}

function getEntryText(entry) {
  return [entry?.note, entry?.emotion?.label, entry?.mood].filter((value) => typeof value === 'string' && value.trim()).join(' ')
}

function countKeyword(source, keyword) {
  if (!source || !keyword) return 0
  return source.split(keyword).length - 1
}

function deriveWordWeights(entries, fallbackWords, matcher) {
  const scopedEntries = (entries ?? []).filter(matcher)
  const source = scopedEntries.map(getEntryText).join(' ')

  const matchedWords = fallbackWords
    .map((item) => {
      const hits = countKeyword(source, item.word)
      if (!hits) return null

      return {
        word: item.word,
        weight: Math.min(5, item.weight + hits),
      }
    })
    .filter(Boolean)
    .sort((left, right) => right.weight - left.weight)

  if (matchedWords.length >= 8) {
    return matchedWords.slice(0, 15)
  }

  if (!scopedEntries.length) return fallbackWords

  const bonus = Math.min(2, Math.max(1, Math.floor(scopedEntries.length / 3)))
  return fallbackWords.map((item, index) => ({
    ...item,
    weight: Math.min(5, item.weight + (index < 6 ? bonus : 0)),
  }))
}

export default function InsightPage({ entries }) {
  const energyWords = useMemo(
    () => deriveWordWeights(entries, ENERGY_FALLBACK_WORDS, (entry) => getEntryScore(entry) >= 4),
    [entries],
  )

  const healingWords = useMemo(
    () => deriveWordWeights(entries, HEALING_FALLBACK_WORDS, (entry) => getEntryScore(entry) <= 3),
    [entries],
  )

  return (
    <div className="-mx-4 min-h-screen overflow-y-auto bg-[#f7f6f2] px-4 pt-[max(env(safe-area-inset-top),_24px)] pb-[calc(env(safe-area-inset-bottom)+100px)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="px-1">
        <p className="text-[11px] tracking-[0.32em] text-[#c3bdb3]">INSIGHT</p>
        <h1 className="mt-2 text-4xl font-serif font-bold tracking-tight text-[#1a1814]">情绪潮汐</h1>
        <p className="mt-2 text-[15px] text-[#b4aea5]">读懂自己，是一生最温柔的功课</p>
      </div>

      <InsightSectionTitle title="情绪潮汐" />
      <EmotionalTide entries={entries} />

      <InsightSectionTitle title="潜意识低语" />
      <WordPoem energyWords={energyWords} healingWords={healingWords} />
    </div>
  )
}
