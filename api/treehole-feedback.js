function cleanEnvValue(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^\[|\]$/g, '')
}

function normalizeResponseText(value) {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && typeof item.text === 'string') return item.text
        return ''
      })
      .join('')
      .trim()
  }
  if (value && typeof value === 'object' && typeof value.text === 'string') {
    return value.text.trim()
  }
  return ''
}

function extractAiText(payload) {
  const primary = payload?.choices?.[0]?.message?.content
  const normalizedPrimary = normalizeResponseText(primary)
  if (normalizedPrimary) return normalizedPrimary

  const fallback = payload?.choices?.[0]?.message?.reasoning_content ?? payload?.reasoning_content
  const normalizedFallback = normalizeResponseText(fallback)
  if (normalizedFallback) return normalizedFallback

  const nestedFallback = payload?.choices?.[0]?.delta?.content ?? payload?.choices?.[0]?.delta?.reasoning_content
  return normalizeResponseText(nestedFallback)
}

function normalizeKeywordItem(item) {
  if (!item || typeof item !== 'object') return null

  const word = typeof item.word === 'string' ? item.word.trim() : ''
  const type = item.type === 'negative' ? 'negative' : item.type === 'positive' ? 'positive' : ''
  if (!word || !type) return null

  const cleanedWord = word.replace(/[^\u4e00-\u9fa5A-Za-z]/g, '').trim()
  if (!cleanedWord || cleanedWord.length < 2 || cleanedWord.length > 4) return null

  const blacklist = ['图片', '视频', '分享', 'jpeg', 'jpg', 'png', 'gif', '链接']
  if (blacklist.includes(cleanedWord.toLowerCase())) return null

  return { word: cleanedWord, type }
}

function normalizeKeywords(value) {
  if (!Array.isArray(value)) return []

  const seen = new Set()
  const normalized = []

  for (const item of value) {
    const keyword = normalizeKeywordItem(item)
    if (!keyword) continue
    const dedupeKey = `${keyword.type}:${keyword.word}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    normalized.push(keyword)
    if (normalized.length >= 2) break
  }

  return normalized
}

function parseStructuredResult(payload) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const directReply = typeof payload.reply === 'string' ? payload.reply.trim() : ''
    if (directReply) {
      return {
        reply: directReply,
        keywords: normalizeKeywords(payload.keywords),
      }
    }
  }

  const rawText = extractAiText(payload)
  if (!rawText) return { reply: null, keywords: [] }

  const normalizedText = String(rawText)
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  const tryParse = (value) => {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  const parsed =
    tryParse(normalizedText) ??
    (() => {
      const startIndex = normalizedText.indexOf('{')
      const endIndex = normalizedText.lastIndexOf('}')
      if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) return null
      return tryParse(normalizedText.slice(startIndex, endIndex + 1))
    })()

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : ''
    return {
      reply: reply || null,
      keywords: normalizeKeywords(parsed.keywords),
    }
  }

  return {
    reply: normalizedText || null,
    keywords: [],
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const baseUrl = cleanEnvValue(process.env.AI_BASE_URL || process.env.VITE_AI_BASE_URL || 'https://api.deepseek.com/v1')
  const apiKey = cleanEnvValue(process.env.AI_API_KEY || process.env.VITE_AI_API_KEY)
  if (!baseUrl || !apiKey) {
    return res.status(500).json({ error: 'missing_ai_env' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}')
    } catch {
      return res.status(400).json({ error: 'invalid_json' })
    }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'invalid_payload' })
  }

  const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : 'deepseek-chat'
  const messages = Array.isArray(body.messages) ? body.messages : []
  if (!messages.length) {
    return res.status(400).json({ error: 'missing_messages' })
  }

  try {
    const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages }),
    })

    const payload = await response.json()
    if (!response.ok) {
      return res.status(response.status).json({ error: 'deepseek_request_failed' })
    }

    const structured = parseStructuredResult(payload)
    return res.status(200).json(structured)
  } catch (error) {
    return res.status(500).json({ error: 'proxy_failed', detail: String(error?.message ?? error) })
  }
}
