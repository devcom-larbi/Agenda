import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

function createGroqMiddleware(env) {
  return (req, res) => {
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
          model = 'llama-3.3-70b-versatile',
          stream = false,
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
          stream,
        }
        if (jsonMode) groqBody.response_format = { type: 'json_object' }

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(groqBody),
        })

        if (!groqRes.ok) {
          const err = await groqRes.json().catch(() => ({}))
          res.statusCode = groqRes.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.error?.message || `Groq HTTP ${groqRes.status}` }))
          return
        }

        if (stream) {
          // SSE streaming : forward les chunks Groq directement
          res.setHeader('Content-Type', 'text/event-stream')
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('X-Accel-Buffering', 'no')
          res.setHeader('Connection', 'keep-alive')

          const reader = groqRes.body.getReader()
          const decoder = new TextDecoder()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            res.write(decoder.decode(value, { stream: true }))
          }
          res.end()
        } else {
          const data = await groqRes.json()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ content: data.choices[0].message.content }))
        }
      } catch (err) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: err.message }))
      }
    })
  }
}

function groqApiPlugin(env) {
  const middleware = createGroqMiddleware(env)
  return {
    name: 'groq-api-dev',
    // dev server
    configureServer(server) {
      server.middlewares.use('/api/chat', middleware)
    },
    // preview server (vite preview / npm run preview)
    configurePreviewServer(server) {
      server.middlewares.use('/api/chat', middleware)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(), 
      groqApiPlugin(env),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['pwa-icon.svg', 'favicon.svg'],
        manifest: {
          name: 'Mon Agenda IA',
          short_name: 'Agenda IA',
          description: "Ton coach d'organisation intelligent.",
          theme_color: '#7c3aed',
          background_color: '#0f0f0f',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          orientation: 'portrait-primary',
          icons: [
            {
              src: 'pwa-icon.svg',
              sizes: '48x48 72x72 96x96 128x128 256x256 512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      })
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
  }
})
