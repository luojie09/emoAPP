import { useEffect, useMemo, useState } from 'react'
import EmotionalTide from '../components/EmotionalTide'
import WordPoem from '../components/WordPoem'
import { supabase } from '../supabaseClient'

function InsightSectionTitle({ title }) {
  return (
    <div className="mb-3 mt-8 flex items-center gap-3 px-1">
      <span className="shrink-0 text-sm font-medium text-[#b9b2a8]">{title}</span>
      <div className="h-px flex-1 bg-[#ece7df]" />
    </div>
  )
}

function normalizeFetchedKeyword(item) {
  if (!item || typeof item !== 'object') return null

  const word = typeof item.word === 'string' ? item.word.trim() : ''
  const type = item.type === 'negative' ? 'negative' : item.type === 'positive' ? 'positive' : ''
  if (!word || !type) return null

  return {
    word,
    type,
    created_at: item.created_at ?? null,
  }
}

function flattenKeywordsFromEntries(entries) {
  return (entries ?? []).flatMap((entry) => {
    if (!Array.isArray(entry?.ai_keywords)) return []

    return entry.ai_keywords
      .map((item) => normalizeFetchedKeyword({ ...item, created_at: entry?.created_at ?? null }))
      .filter(Boolean)
  })
}

function buildWordWeights(keywords, keywordType) {
  const counter = new Map()

  for (const item of keywords ?? []) {
    if (item?.type !== keywordType || !item?.word) continue
    counter.set(item.word, (counter.get(item.word) ?? 0) + 1)
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
  const [insightKeywords, setInsightKeywords] = useState([])

  useEffect(() => {
    let isMounted = true

    const loadInsightKeywords = async () => {
      const fallbackKeywords = flattenKeywordsFromEntries(entries)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.access_token) {
          if (isMounted) setInsightKeywords(fallbackKeywords)
          return
        }

        const response = await fetch('/api/insights', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          if (isMounted) setInsightKeywords(fallbackKeywords)
          return
        }

        const payload = await response.json()
        const keywords = Array.isArray(payload?.keywords)
          ? payload.keywords.map(normalizeFetchedKeyword).filter(Boolean)
          : []

        if (isMounted) {
          setInsightKeywords(keywords.length ? keywords : fallbackKeywords)
        }
      } catch {
        if (isMounted) setInsightKeywords(fallbackKeywords)
      }
    }

    void loadInsightKeywords()

    return () => {
      isMounted = false
    }
  }, [entries])

  const energyWords = useMemo(() => buildWordWeights(insightKeywords, 'positive'), [insightKeywords])
  const healingWords = useMemo(() => buildWordWeights(insightKeywords, 'negative'), [insightKeywords])

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
