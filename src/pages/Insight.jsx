import { useMemo } from 'react'
import EmotionalTide from '../components/EmotionalTide'
import WordPoem from '../components/WordPoem'

const STOP_WORDS = new Set([
  '今天',
  '感觉',
  '自己',
  '有点',
  '真的',
  '还是',
  '一个',
  '一些',
  '因为',
  '所以',
  '然后',
  '已经',
  '就是',
  '不是',
  '这样',
  '那个',
  '这个',
  '事情',
  '时候',
  '我们',
  '你们',
])

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

function extractCandidateWords(entry) {
  const rawSegments = []
  const label = entry?.emotion?.label ?? entry?.mood
  if (typeof label === 'string' && label.trim()) {
    rawSegments.push(label.trim())
  }

  const note = typeof entry?.note === 'string' ? entry.note : ''
  if (note.trim()) {
    rawSegments.push(
      ...note
        .split(/[，。！？、；：,.!?\s\n\r]+/)
        .map((segment) => segment.trim())
        .filter(Boolean),
    )
  }

  return rawSegments
    .map((segment) => segment.replace(/[^\u4e00-\u9fa5A-Za-z]/g, '').trim())
    .filter((segment) => {
      if (!segment) return false
      if (STOP_WORDS.has(segment)) return false
      if (/^[A-Za-z]+$/.test(segment)) return segment.length >= 3 && segment.length <= 12
      return segment.length >= 2 && segment.length <= 6
    })
}

function normalizeEntryKeywords(entry, expectedType) {
  if (!Array.isArray(entry?.ai_keywords)) return []
  return entry.ai_keywords
    .filter((item) => item?.type === expectedType)
    .map((item) => item.word)
    .filter(Boolean)
}

function buildWordWeights(entries, matcher, keywordType) {
  const scopedEntries = (entries ?? []).filter(matcher)
  const keywordCounter = new Map()

  for (const entry of scopedEntries) {
    const keywords = normalizeEntryKeywords(entry, keywordType)
    for (const word of keywords) {
      keywordCounter.set(word, (keywordCounter.get(word) ?? 0) + 1)
    }
  }

  if (keywordCounter.size) {
    return [...keywordCounter.entries()]
      .sort((left, right) => {
        if (right[1] !== left[1]) return right[1] - left[1]
        return left[0].localeCompare(right[0], 'zh-CN')
      })
      .slice(0, 15)
      .map(([word, count]) => ({
        word,
        weight: Math.min(5, Math.max(1, count + 1)),
      }))
  }

  const counter = new Map()

  for (const entry of scopedEntries) {
    const words = extractCandidateWords(entry)
    for (const word of words) {
      counter.set(word, (counter.get(word) ?? 0) + 1)
    }
  }

  return [...counter.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1]
      return left[0].localeCompare(right[0], 'zh-CN')
    })
    .slice(0, 15)
    .map(([word, count]) => ({
      word,
      weight: Math.min(5, Math.max(1, count + 1)),
    }))
}

export default function InsightPage({ entries }) {
  const energyWords = useMemo(
    () => buildWordWeights(entries, (entry) => getEntryScore(entry) >= 4, 'positive'),
    [entries],
  )
  const healingWords = useMemo(
    () => buildWordWeights(entries, (entry) => getEntryScore(entry) <= 3, 'negative'),
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
