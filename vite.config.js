import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

function groqApiPlugin(env) {
  return {
    name: 'groq-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/chat', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method Not Allowed' }))
          return
        }

        let body = ''
        req.on('data', chunk => { body += chunk.toString() })
        req.on('end', async () => {
          try {
            const {
              messages,
              temperature = 0.7,
              maxTokens = 1024,
              jsonMode = false,
              model = 'llama-3.1-8b-instant',
            } = JSON.parse(body)

            const apiKey = env.GROQ_API_KEY
            if (!apiKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'GROQ_API_KEY manquant dans .env.local (sans préfixe VITE_)' }))
              return
            }

            const groqBody = {
              model,
              messages,
              temperature,
              max_tokens: maxTokens,
            }
            if (jsonMode) groqBody.response_format = { type: 'json_object' }

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify(groqBody),
            })

            const data = await response.json()

            if (!response.ok) {
              res.statusCode = response.status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: data.error?.message || `Groq HTTP ${response.status}` }))
              return
            }

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ content: data.choices[0].message.content }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), groqApiPlugin(env)],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
  }
})
