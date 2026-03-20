const moodCategories = [
  {
    title: '狂喜与高光',
    moods: [
      { emoji: '😄', label: '大笑', score: 5 },
      { emoji: '🤣', label: '笑得打滚', score: 5 },
      { emoji: '😂', label: '笑哭了', score: 5 },
      { emoji: '😇', label: '微笑天使', score: 5 },
      { emoji: '🥰', label: '喜笑颜开', score: 5 },
      { emoji: '😍', label: '花痴', score: 5 },
      { emoji: '🤩', label: '心动', score: 5 },
      { emoji: '😘', label: '飞吻', score: 5 },
      { emoji: '🤗', label: '抱抱', score: 5 },
      { emoji: '🥳', label: '庆祝', score: 5 },
      { emoji: '😎', label: '酷', score: 5 },
      { emoji: '🤑', label: '发财', score: 5 },
      { emoji: '😸', label: '大笑', score: 5 },
      { emoji: '😹', label: '笑哭', score: 5 },
      { emoji: '😻', label: '花痴', score: 5 },
    ],
  },
  {
    title: '开心与愉悦',
    moods: [
      { emoji: '😀', label: '嘿嘿', score: 4 },
      { emoji: '😃', label: '哈哈', score: 4 },
      { emoji: '😁', label: '嘻嘻', score: 4 },
      { emoji: '😆', label: '斜眼笑', score: 4 },
      { emoji: '😉', label: '眨眼', score: 4 },
      { emoji: '😊', label: '羞涩微笑', score: 4 },
      { emoji: '☺️', label: '微笑', score: 4 },
      { emoji: '😋', label: '好吃', score: 4 },
      { emoji: '😜', label: '单眼吐舌', score: 4 },
      { emoji: '🤪', label: '滑稽', score: 4 },
      { emoji: '😺', label: '微笑', score: 4 },
      { emoji: '😽', label: '亲亲', score: 4 },
    ],
  },
  {
    title: '平静与微丧',
    moods: [
      { emoji: '🙂', label: '呵呵', score: 3 },
      { emoji: '🙃', label: '倒脸', score: 3 },
      { emoji: '😅', label: '苦笑', score: 3 },
      { emoji: '🥲', label: '含泪微笑', score: 3 },
      { emoji: '🤔', label: '思考', score: 3 },
      { emoji: '😐', label: '冷漠', score: 3 },
      { emoji: '😶', label: '沉默', score: 3 },
      { emoji: '😮‍💨', label: '呼气', score: 3 },
      { emoji: '😌', label: '松了口气', score: 3 },
      { emoji: '🫠', label: '融化', score: 2 },
      { emoji: '🤐', label: '闭嘴', score: 2 },
      { emoji: '😑', label: '无语', score: 2 },
      { emoji: '😒', label: '不高兴', score: 2 },
      { emoji: '🙄', label: '翻白眼', score: 2 },
      { emoji: '😔', label: '沉思', score: 2 },
      { emoji: '🥱', label: '打哈欠', score: 2 },
    ],
  },
  {
    title: '焦虑与痛苦',
    moods: [
      { emoji: '😬', label: '龇牙咧嘴', score: 2 },
      { emoji: '🥵', label: '脸发烧', score: 2 },
      { emoji: '🥶', label: '冷脸', score: 2 },
      { emoji: '😕', label: '困扰', score: 2 },
      { emoji: '😟', label: '郁闷', score: 2 },
      { emoji: '🥺', label: '恳求', score: 2 },
      { emoji: '😰', label: '冷汗', score: 2 },
      { emoji: '😞', label: '失望', score: 2 },
      { emoji: '😷', label: '感冒', score: 1 },
      { emoji: '🤢', label: '恶心', score: 1 },
      { emoji: '🤮', label: '呕吐', score: 1 },
      { emoji: '😵', label: '晕头转向', score: 1 },
      { emoji: '🤯', label: '爆炸头', score: 1 },
      { emoji: '😨', label: '害怕', score: 1 },
      { emoji: '😢', label: '哭', score: 1 },
      { emoji: '😭', label: '大哭', score: 1 },
      { emoji: '😱', label: '吓死了', score: 1 },
      { emoji: '😫', label: '累', score: 1 },
      { emoji: '😡', label: '怒火中烧', score: 1 },
      { emoji: '🤬', label: '骂人', score: 1 },
      { emoji: '😿', label: '哭泣', score: 1 },
      { emoji: '😾', label: '生气', score: 1 },
    ],
  },
]

export default function MoodPicker({ value, onSelect }) {
  return (
    <div className="mb-4 rounded-[22px] border border-black/5 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-base text-gray-700">此刻你的感觉怎么样？</p>
          <p className="mt-1 text-xs text-gray-400">从高光到低落，按情绪波动自然排开</p>
        </div>

        <div className="rounded-full bg-[#f5f4f0] px-3 py-1.5 text-sm text-gray-600">
          {value?.emoji ? `${value.emoji} ${value.label}` : '请选择'}
        </div>
      </div>

      <div className="rounded-[20px] bg-[#fbfaf7] p-3">
        <div className="max-h-72 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {moodCategories.map((category, categoryIndex) => (
            <section key={category.title} className={categoryIndex ? 'mt-4 border-t border-[#ece8df] pt-4' : ''}>
              <div className="mb-3 text-xs text-gray-400">{category.title}</div>
              <div className="grid grid-cols-5 gap-3 sm:grid-cols-6">
                {category.moods.map((mood) => {
                  const isSelected =
                    value?.emoji === mood.emoji && value?.label === mood.label && Number(value?.score) === mood.score

                  return (
                    <button
                      key={`${category.title}-${mood.emoji}-${mood.label}`}
                      type="button"
                      title={mood.label}
                      onClick={() => onSelect?.({ emoji: mood.emoji, label: mood.label, score: mood.score })}
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#a08ff0]/30 ${
                        isSelected
                          ? 'bg-white ring-2 ring-[#a08ff0] shadow-[0_6px_16px_rgba(160,143,240,0.16)]'
                          : 'bg-[#f5f4f0] hover:bg-white hover:shadow-sm'
                      }`}
                    >
                      <span aria-hidden="true">{mood.emoji}</span>
                      <span className="sr-only">{mood.label}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
