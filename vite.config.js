import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import visionHandler from './api/vision.js'
import whisperHandler from './api/whisper.js'
import { DEFAULT_MODEL, ALLOWED_MODELS, reasoningEffortFor, fetchCompletion } from './api/_shared.js'

// Adaptateur : exécute un handler "edge" (Request → Response) derrière le
// serveur de dev Vite (Node http), pour que /api/vision et /api/whisper
// fonctionnent aussi en local sans dupliquer leur logique.
function edgeAdapter(handler) {
  return (req, res) => {
    let body = ''
    req.on('data', c => { body += c })
    req.on('end', async () => {
      try {
        const request = new Request(`http://localhost${req.url || '/'}`, {
          method: req.method,
          headers: req.headers,
          body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
        })
        const response = await handler(request)
        res.statusCode = response.status
        response.headers.forEach((value, key) => res.setHeader(key, value))
        res.end(Buffer.from(await response.arrayBuffer()))
      } catch (err) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: err.message }))
      }
    })
  }
}

const clampNum = (v, min, max, fallback) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback
}

function createGroqMiddleware(env) {
  return (req, res) => {
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Method Not Allowed' }))
      return
    }

    // ── Auth guard (parité avec api/chat.js en prod) ──────────────────
    const authHeader = req.headers.authorization || req.headers.Authorization
    const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : ''
    if (!token) {
      res.statusCode = 401
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Non autorisé' }))
      return
    }

    let body = ''
    req.on('data', chunk => { body += chunk.toString() })
    req.on('end', async () => {
      try {
        // Vérification du token Supabase si configuré
        const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
        const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
        if (supabaseUrl && supabaseAnonKey) {
          const verify = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: { 'Authorization': `Bearer ${token}`, 'apikey': supabaseAnonKey },
          }).catch(() => null)
          if (!verify || !verify.ok) {
            res.statusCode = 401
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Token invalide' }))
            return
          }
        }

        const {
          messages,
          temperature,
          maxTokens,
          jsonMode = false,
          model: requestedModel,
          stream = false,
        } = JSON.parse(body)

        const apiKey = env.GROQ_API_KEY
        if (!apiKey) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'GROQ_API_KEY manquant dans .env.local (sans préfixe VITE_)' }))
          return
        }

        const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : DEFAULT_MODEL
        const groqBody = {
          model,
          messages,
          temperature: clampNum(temperature, 0, 2, 0.7),
          max_tokens: clampNum(maxTokens, 1, 8192, 1024),
          stream,
        }
        if (jsonMode) groqBody.response_format = { type: 'json_object' }
        const effort = reasoningEffortFor(model)
        if (effort) groqBody.reasoning_effort = effort

        const { response: groqRes, salvagedContent, status, error } = await fetchCompletion(
          'https://api.groq.com/openai/v1/chat/completions', apiKey, groqBody,
        )

        if (salvagedContent) {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ content: salvagedContent }))
          return
        }

        if (!groqRes) {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error }))
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
  // Les handlers edge (vision/whisper) lisent process.env → on y injecte les
  // clés du .env.local pour le mode dev/preview.
  const ENV_KEYS = ['GROQ_API_KEY', 'OPENROUTER_API_KEY', 'OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY']
  ENV_KEYS.forEach(k => { if (env[k] && !process.env[k]) process.env[k] = env[k] })
  if (!process.env.SUPABASE_URL && env.VITE_SUPABASE_URL) process.env.SUPABASE_URL = env.VITE_SUPABASE_URL
  if (!process.env.SUPABASE_ANON_KEY && env.VITE_SUPABASE_ANON_KEY) process.env.SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY

  const chat = createGroqMiddleware(env)
  const vision = edgeAdapter(visionHandler)
  const whisper = edgeAdapter(whisperHandler)
  const mount = server => {
    server.middlewares.use('/api/chat', chat)
    server.middlewares.use('/api/vision', vision)
    server.middlewares.use('/api/whisper', whisper)
  }
  return {
    name: 'groq-api-dev',
    configureServer: mount,        // dev server
    configurePreviewServer: mount, // vite preview / npm run preview
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
          name: 'Tempo',
          short_name: 'Tempo',
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
