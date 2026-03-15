import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function cleanEnvValue(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^\[|\]$/g, '')
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const aiBaseUrl = cleanEnvValue(env.AI_BASE_URL || env.VITE_AI_BASE_URL || 'https://api.deepseek.com/v1')
  const aiApiKey = cleanEnvValue(env.AI_API_KEY || env.VITE_AI_API_KEY)

  const proxy =
    aiApiKey && aiBaseUrl
      ? {
          '/api/treehole-feedback': {
            target: aiBaseUrl,
            changeOrigin: true,
            secure: true,
            rewrite: () => '/chat/completions',
            configure(proxyInstance) {
              proxyInstance.on('proxyReq', (proxyReq) => {
                proxyReq.setHeader('Authorization', `Bearer ${aiApiKey}`)
                proxyReq.setHeader('Content-Type', 'application/json')
              })
            },
          },
        }
      : undefined

  return {
    plugins: [react()],
    server: proxy ? { proxy } : undefined,
  }
})
