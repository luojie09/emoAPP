import { useMemo, useState } from 'react'

function chunkWords(words, chunkSize = 5) {
  const rows = []
  for (let index = 0; index < words.length; index += chunkSize) {
    rows.push(words.slice(index, index + chunkSize))
  }
  return rows
}

function getWeightClass(weight) {
  if (weight >= 5) return 'text-2xl font-bold'
  if (weight >= 4) return 'text-xl font-semibold'
  if (weight >= 3) return 'text-lg font-semibold'
  if (weight >= 2) return 'text-sm font-medium'
  return 'text-xs font-medium'
}

function getToneClass(weight, tab) {
  if (tab === 'energy') {
    if (weight >= 5) return 'text-[#b07840]'
    if (weight >= 4) return 'text-[#bb8a58]'
    if (weight >= 3) return 'text-[#c59c73]'
    if (weight >= 2) return 'text-[#b9a083]'
    return 'text-[#c7b7a3]'
  }

  if (weight >= 5) return 'text-[#607090]'
  if (weight >= 4) return 'text-[#73819c]'
  if (weight >= 3) return 'text-[#8994ac]'
  if (weight >= 2) return 'text-[#9ea7b7]'
  return 'text-[#b2b9c4]'
}

export default function WordPoem({ energyWords = [], healingWords = [] }) {
  const [activeTab, setActiveTab] = useState('energy')

  const currentWords = activeTab === 'energy' ? energyWords : healingWords
  const rows = useMemo(() => chunkWords(currentWords, 5), [currentWords])
  const isEmpty = !currentWords.length

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="rounded-full bg-[#f3efe8] p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('energy')}
            className={`rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === 'energy' ? 'bg-white text-[#1a1814] shadow-sm' : 'text-[#b2aca4]'
            }`}
          >
            ✦ 能量源泉
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('healing')}
            className={`rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === 'healing' ? 'bg-white text-[#1a1814] shadow-sm' : 'text-[#b2aca4]'
            }`}
          >
            ○ 需要和解
          </button>
        </div>
      </div>

      <div className="mt-6 text-sm text-[#d1cbc2]">
        {activeTab === 'energy' ? '你的能量源泉 · 过去 30 天' : '那些需要被轻轻安放的情绪 · 过去 30 天'}
      </div>

      {isEmpty ? (
        <div className="py-8 text-center text-sm font-serif tracking-wide text-gray-400">
          去记录吧，
          <br />
          树洞会用心听你的低语...
        </div>
      ) : (
        <div className="mt-6 space-y-4 text-center leading-loose">
          {rows.map((row, rowIndex) => (
            <div key={`${activeTab}-row-${rowIndex}`} className="flex flex-wrap items-end justify-center gap-x-3 gap-y-2">
              {row.map((item) => (
                <span
                  key={`${activeTab}-${item.word}`}
                  className={`inline-block whitespace-nowrap ${getWeightClass(item.weight)} ${getToneClass(
                    item.weight,
                    activeTab,
                  )}`}
                >
                  {item.word}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
