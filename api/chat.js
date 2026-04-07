/**
 * api/chat.js — Proxy sécurisé vers l'API Groq
 * Compatible Vercel Serverless Functions (prod) + Vite middleware (dev).
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
    model = 'llama-3.1-8b-instant',
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
    }
    if (jsonMode) body.response_format = { type: 'json_object' }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || `Groq HTTP ${response.status}`,
      })
    }

    res.json({ content: data.choices[0].message.content })
  } catch (err) {
    console.error('[api/chat] error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
