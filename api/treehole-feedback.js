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

    return res.status(200).json({ content: extractAiText(payload) })
  } catch (error) {
    return res.status(500).json({ error: 'proxy_failed', detail: String(error?.message ?? error) })
  }
}
