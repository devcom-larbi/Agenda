/**
 * api/vision.js — OCR photo d'emploi du temps (multi-fournisseurs, gratuit d'abord)
 *
 * Choisit automatiquement la 1re clé dispo, dans cet ordre, et bascule sur le
 * suivant en cas d'échec :
 *   1. GOOGLE_API_KEY    → Gemini (free tier indéfini, excellent OCR)
 *   2. GROQ_API_KEY      → Llama 4 / Qwen vision (free tier, image ≤ 4 Mo)
 *   3. OPENROUTER_API_KEY→ gpt-4o-mini via OpenRouter (clé sk-or-v1- requise)
 *   4. OPENAI_API_KEY    → gpt-4o-mini (payant)
 * Auth guard : SUPABASE_URL + SUPABASE_ANON_KEY.
 * IDs de modèles surchargeables : GEMINI_VISION_MODEL / GROQ_VISION_MODEL / etc.
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

const OCR_PROMPT = `Tu analyses une photo d'emploi du temps (tableau blanc, papier, écran).
Extrais tous les créneaux horaires visibles.
Retourne UNIQUEMENT un tableau JSON. Pas de texte avant. Commence directement par [

FORMAT :
[{"day":"lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|inconnu","time":"Xh → Yh","label":"Nom du cours ou activité","category":"school|work|sport|rdv|learning|repos|sommeil|coran|clients|rest"}]

RÈGLES time :
✅ "8h → 9h30"  ✅ "14h → 16h"  ✅ "9h → À définir"
❌ "08:00-09:30"  ❌ "8h-9h30"  ❌ "08h00"

Si le jour n'est pas visible → "inconnu"
Si l'heure de fin est illisible → "Xh → À définir"`

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

  const { imageBase64, mimeType = 'image/jpeg' } = await req.json()
  if (!imageBase64) return json({ error: 'Image manquante' }, 400)

  // ── Fournisseurs vision, par ordre de préférence (gratuit d'abord) ──
  const providers = []
  if (process.env.GOOGLE_API_KEY) providers.push({
    name: 'Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    key: process.env.GOOGLE_API_KEY, model: process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash',
  })
  // Groq : plus aucun modèle multimodal au catalogue depuis le retrait de la
  // famille Llama (2026-08). On ne l'essaie donc que si un ID est fourni
  // explicitement via GROQ_VISION_MODEL, sinon c'est un aller-retour perdu.
  if (process.env.GROQ_API_KEY && process.env.GROQ_VISION_MODEL) providers.push({
    name: 'Groq', url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY, model: process.env.GROQ_VISION_MODEL,
  })
  if (process.env.OPENROUTER_API_KEY) providers.push({
    name: 'OpenRouter', url: 'https://openrouter.ai/api/v1/chat/completions',
    key: process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_VISION_MODEL || 'openai/gpt-4o-mini',
  })
  if (process.env.OPENAI_API_KEY) providers.push({
    name: 'OpenAI', url: 'https://api.openai.com/v1/chat/completions',
    key: process.env.OPENAI_API_KEY, model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
  })
  if (!providers.length) {
    return json({ error: 'Aucune clé vision configurée (GOOGLE_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY ou OPENAI_API_KEY)' }, 500)
  }

  // Corps identique pour tous (format OpenAI chat/completions), seul le modèle change.
  const buildBody = (model) => JSON.stringify({
    model,
    max_tokens: 2048,
    temperature: 0,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: OCR_PROMPT },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
      ],
    }],
  })

  // Bascule automatique : on essaie chaque fournisseur jusqu'à un succès.
  let lastError = ''
  for (const p of providers) {
    try {
      const res = await fetch(p.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${p.key}` },
        body: buildBody(p.model),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        lastError = `${p.name}: ${err.error?.message || `HTTP ${res.status}`}`
        console.error('[api/vision]', lastError)
        continue
      }
      const data = await res.json()
      const raw = data?.choices?.[0]?.message?.content || ''
      const start = raw.indexOf('[')
      const end = raw.lastIndexOf(']')
      let blocks = []
      if (start !== -1 && end !== -1) {
        try { blocks = JSON.parse(raw.substring(start, end + 1)) } catch { blocks = [] }
      }
      return json({ blocks: Array.isArray(blocks) ? blocks : [], provider: p.name })
    } catch (err) {
      lastError = `${p.name}: ${err.message}`
      console.error('[api/vision]', lastError)
    }
  }
  return json({ error: `Toutes les IA vision ont échoué. Dernière erreur — ${lastError}` }, 502)
}
