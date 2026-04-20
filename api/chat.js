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
  } = req.body

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY non configuré' })
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

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}))
      const status = groqRes.status
      if (stream) {
        res.status(status).end(JSON.stringify({ error: err.error?.message || `Groq HTTP ${status}` }))
      } else {
        res.status(status).json({ error: err.error?.message || `Groq HTTP ${status}` })
      }
      return
    }

    if (stream) {
      // Streaming SSE : on forward les chunks Groq directement vers le client
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
      res.json({ content: data.choices[0].message.content })
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
