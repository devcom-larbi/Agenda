/**
 * api/whisper.js — Transcription vocale via OpenAI Whisper
 * Variable Vercel requise : OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
 */

export const config = { runtime: 'edge' }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405)

  // ── Auth guard ────────────────────────────────────────────────────
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'Non autorisé' }, 401)

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
  if (supabaseUrl && supabaseAnonKey) {
    const verify = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': supabaseAnonKey },
    })
    if (!verify.ok) return json({ error: 'Token invalide' }, 401)
  }

  const { audioBase64, mimeType = 'audio/webm' } = await req.json()
  if (!audioBase64) return json({ error: 'Audio manquant' }, 400)

  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY
  const apiUrl = process.env.GROQ_API_KEY
    ? 'https://api.groq.com/openai/v1/audio/transcriptions'
    : 'https://api.openai.com/v1/audio/transcriptions'
  // large-v3 (et non turbo) : plus précis sur le français, surcoût de latence négligeable pour des notes courtes
  const model = process.env.GROQ_API_KEY ? 'whisper-large-v3' : 'whisper-1'
  if (!apiKey) return json({ error: 'GROQ_API_KEY ou OPENAI_API_KEY manquant' }, 500)

  // Contexte qui biaise Whisper vers le français + le vocabulaire d'agenda (améliore nettement la qualité)
  const PROMPT = "Note vocale en français pour un agenda. Vocabulaire : rendez-vous, réunion, tâche, séance, deadline, horaires (8h, 14h30), aujourd'hui, demain, lundi, semaine prochaine."

  try {
    const bytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))
    const ext = mimeType.split('/')[1]?.split(';')[0] || 'webm'
    const audioBlob = new Blob([bytes], { type: mimeType })

    const form = new FormData()
    form.append('file', audioBlob, `audio.${ext}`)
    form.append('model', model)
    form.append('language', 'fr')
    form.append('temperature', '0')   // déterministe : réduit les hallucinations sur audio bruité
    form.append('prompt', PROMPT)

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: form,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return json({ error: err.error?.message || `Whisper HTTP ${res.status}` }, res.status)
    }

    const data = await res.json()
    return json({ text: data.text || '' })
  } catch (err) {
    console.error('[api/whisper] error:', err.message)
    return json({ error: err.message }, 500)
  }
}
