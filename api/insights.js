import { createClient } from '@supabase/supabase-js'

function cleanEnvValue(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^\[|\]$/g, '')
}

function normalizeKeywordItem(item) {
  if (!item || typeof item !== 'object') return null

  const word = typeof item.word === 'string' ? item.word.trim() : ''
  const type = item.type === 'negative' ? 'negative' : item.type === 'positive' ? 'positive' : ''
  if (!word || !type) return null

  return { word, type }
}

function normalizeKeywords(value) {
  if (!Array.isArray(value)) return []
  return value.map(normalizeKeywordItem).filter(Boolean)
}

function isMissingKeywordsColumnError(error) {
  const raw = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''} ${error?.code ?? ''}`.toLowerCase()
  return raw.includes('keywords') && (raw.includes('column') || raw.includes('schema') || raw.includes('select'))
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const supabaseUrl = cleanEnvValue(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)
  const supabaseAnonKey = cleanEnvValue(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
  const authHeader = req.headers.authorization || req.headers.Authorization

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'missing_supabase_env' })
  }

  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({ error: 'missing_authorization' })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })

  const days = 7
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  try {
    const { data, error } = await supabase
      .from('entries')
      .select('keywords,created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })

    if (error) {
      if (isMissingKeywordsColumnError(error)) {
        return res.status(200).json({ keywords: [] })
      }
      return res.status(500).json({ error: 'insights_query_failed' })
    }

    const keywords = (data ?? []).flatMap((row) => {
      const normalized = normalizeKeywords(row?.keywords)
      return normalized.map((keyword) => ({
        ...keyword,
        created_at: row?.created_at ?? null,
      }))
    })

    return res.status(200).json({ keywords })
  } catch (error) {
    return res.status(500).json({ error: 'proxy_failed', detail: String(error?.message ?? error) })
  }
}
