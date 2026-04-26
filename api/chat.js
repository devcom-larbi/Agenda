/**
 * api/chat.js — Proxy sécurisé vers l'API Groq
 * Compatible Vercel Serverless Functions (prod) + Vite middleware (dev).
 * Supporte le streaming SSE quand stream: true est passé dans le body.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const {
    messages,
    temperature = 0.7,
    maxTokens = 1024,
    jsonMode = false,
    model = 'llama-3.3-70b-versatile',
    stream = false,
    tools = null,
    tool_choice = null,
  } = req.body

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
      temperature,
      max_tokens: maxTokens,
      stream,
    }
    if (jsonMode) body.response_format = { type: 'json_object' }
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
