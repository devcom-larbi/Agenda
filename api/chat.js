/**
 * api/chat.js — Proxy sécurisé vers l'API Groq / OpenRouter
 * Compatible Vercel Serverless Functions (prod) + Vite middleware (dev).
 * Supporte le streaming SSE quand stream: true est passé dans le body.
 *
 * Sécurité :
 *  - Auth guard : exige un JWT Supabase valide (header Authorization)
 *  - Whitelist du modèle (le client ne peut pas demander un modèle arbitraire/coûteux)
 *  - Clamp de maxTokens / temperature côté serveur
 *  - Validation basique de la structure `messages`
 */

import { DEFAULT_MODEL, ALLOWED_MODELS, reasoningEffortFor } from './models.js'

const MAX_TOKENS_CAP = 8192
const MAX_MESSAGES = 40
const MAX_PAYLOAD_CHARS = 200_000

const clamp = (v, min, max, fallback) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return 'messages doit être un tableau non vide'
  if (messages.length > MAX_MESSAGES) return `trop de messages (max ${MAX_MESSAGES})`
  let totalChars = 0
  for (const m of messages) {
    if (!m || typeof m !== 'object') return 'message invalide'
    if (!['system', 'user', 'assistant'].includes(m.role)) return `rôle invalide: ${m.role}`
    if (typeof m.content !== 'string') return 'content doit être une chaîne'
    totalChars += m.content.length
  }
  if (totalChars > MAX_PAYLOAD_CHARS) return 'payload trop volumineux'
  return null
}

export default async function handler(req, res) {
  // ── CORS (requis pour les appels depuis l'app native Capacitor) ──
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  // ── Auth guard ────────────────────────────────────────────────────
  const authHeader = req.headers?.authorization || req.headers?.Authorization
  const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : ''
  if (!token) {
    return res.status(401).json({ error: 'Non autorisé' })
  }
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
  if (supabaseUrl && supabaseAnonKey) {
    const verify = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': supabaseAnonKey },
    }).catch(() => null)
    if (!verify || !verify.ok) {
      return res.status(401).json({ error: 'Token invalide' })
    }
  }

  const {
    messages,
    temperature,
    maxTokens,
    jsonMode = false,
    model: requestedModel,
    stream = false,
    tools = null,
    tool_choice = null,
  } = req.body || {}

  // ── Validation & bornes ───────────────────────────────────────────
  const msgError = validateMessages(messages)
  if (msgError) {
    return res.status(400).json({ error: msgError })
  }
  const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : DEFAULT_MODEL
  const safeMaxTokens = clamp(maxTokens, 1, MAX_TOKENS_CAP, 1024)
  const safeTemperature = clamp(temperature, 0, 2, 0.7)

  const groqApiKey = process.env.GROQ_API_KEY
  const openRouterApiKey = process.env.OPENROUTER_API_KEY

  const apiKey = openRouterApiKey || groqApiKey
  const apiUrl = openRouterApiKey
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.groq.com/openai/v1/chat/completions'

  if (!apiKey) {
    return res.status(500).json({ error: 'Clé API (OPENROUTER ou GROQ) non configurée' })
  }

  try {
    const body = {
      model,
      messages,
      temperature: safeTemperature,
      max_tokens: safeMaxTokens,
      stream,
    }
    if (jsonMode) body.response_format = { type: 'json_object' }
    const effort = reasoningEffortFor(model)
    if (effort) body.reasoning_effort = effort
    if (tools?.length) {
      body.tools = tools
      if (tool_choice) body.tool_choice = tool_choice
    }

    const fetchRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!fetchRes.ok) {
      const err = await fetchRes.json().catch(() => ({}))
      const status = fetchRes.status
      if (stream) {
        res.status(status).end(JSON.stringify({ error: err.error?.message || `API HTTP ${status}` }))
      } else {
        res.status(status).json({ error: err.error?.message || `API HTTP ${status}` })
      }
      return
    }

    if (stream) {
      // Streaming SSE : on forward les chunks directement vers le client
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('X-Accel-Buffering', 'no')
      res.setHeader('Connection', 'keep-alive')

      const reader = fetchRes.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(decoder.decode(value, { stream: true }))
      }
      res.end()
    } else {
      const data = await fetchRes.json()
      const msg = data.choices[0].message
      if (msg.tool_calls?.length) {
        res.json({ tool_calls: msg.tool_calls, assistant_message: msg })
      } else {
        res.json({ content: msg.content })
      }
    }
  } catch (err) {
    console.error('[api/chat] error:', err.message)
    if (stream) {
      res.end()
    } else {
      res.status(500).json({ error: err.message })
    }
  }
}
