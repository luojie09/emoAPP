function cleanEnvValue(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^\[|\]$/g, '')
}

function extractAiText(payload) {
  const primary = payload?.content ?? payload?.choices?.[0]?.message?.content
  let normalized = ''

  if (typeof primary === 'string') {
    normalized = primary.trim()
  } else if (Array.isArray(primary)) {
    normalized = primary
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && typeof item.text === 'string') return item.text
        return ''
      })
      .join('')
      .trim()
  }

  if (!normalized) {
    const fallback = payload?.choices?.[0]?.message?.reasoning_content ?? payload?.reasoning_content
    normalized = typeof fallback === 'string' ? fallback.trim() : ''
  }

  return normalized || null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

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
      body = JSON.parse(body)
    } catch {
      return res.status(400).json({ error: 'invalid_json' })
    }
  }

  const model = typeof body?.model === 'string' && body.model.trim() ? body.model.trim() : 'deepseek-chat'
  const messages = Array.isArray(body?.messages) ? body.messages : null
  if (!messages || !messages.length) {
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

    const responseText = await response.text()
    let payload = {}
    try {
      payload = responseText ? JSON.parse(responseText) : {}
    } catch {
      payload = { raw: responseText }
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'deepseek_request_failed',
        detail: payload,
      })
    }

    return res.status(200).json({
      content: extractAiText(payload),
      raw: payload,
    })
  } catch (error) {
    return res.status(500).json({
      error: 'proxy_failed',
      detail: String(error?.message ?? error),
    })
  }
}
