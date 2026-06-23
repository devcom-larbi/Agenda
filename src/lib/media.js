import { supabase } from './supabase'
import { apiUrl } from './api'

// ── Auth ──────────────────────────────────────────────────────────
async function getToken() {
  if (!supabase) return null
  try {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  } catch {
    return null
  }
}

// Renvoie le base64 SANS le préfixe "data:...;base64," (ce qu'attendent les API)
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = String(reader.result || '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'))
    reader.readAsDataURL(blob)
  })
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024  // ~10 Mo (taille du fichier original accepté)
const MAX_AUDIO_BYTES = 25 * 1024 * 1024  // ~25 Mo
const MAX_IMAGE_DIMENSION = 1536          // px sur le plus grand côté après compression
const IMAGE_QUALITY = 0.82                // qualité JPEG du ré-encodage

// Décode un fichier image en respectant l'orientation EXIF (photos portrait/paysage).
function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' })
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')) }
    img.src = url
  })
}

// Compresse une image côté client (downscale + ré-encodage JPEG) pour alléger
// le payload envoyé à l'IA. Repli sur le fichier original si la compression
// échoue ou n'apporte rien (ex. GIF, image déjà plus légère).
async function compressImage(file) {
  if (!file.type?.startsWith('image/') || file.type === 'image/gif') return file
  try {
    const bitmap = await loadBitmap(file)
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', IMAGE_QUALITY))
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}

// ── POST JSON robuste : timeout + retry (réseau/5xx) + hors-ligne ──
// Ne réessaie PAS sur 4xx (erreur définitive : auth, payload). Messages clairs.
const NET_TIMEOUT_MS = 45_000  // vision/whisper peuvent être lents
const NET_RETRIES = 2

async function postJson(path, body, token, { timeoutMs = NET_TIMEOUT_MS, retries = NET_RETRIES } = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Tu sembles hors-ligne. Vérifie ta connexion et réessaie.')
  }
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(apiUrl(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })
      if (res.ok) return await res.json()
      const errBody = await res.json().catch(() => ({}))
      const msg = errBody.error || `Erreur serveur (${res.status})`
      if (res.status >= 400 && res.status < 500) { const e = new Error(msg); e.final = true; throw e }
      lastErr = new Error(msg)  // 5xx → on réessaie
    } catch (e) {
      if (e.final) throw e
      lastErr = e.name === 'AbortError'
        ? new Error('Délai dépassé. Réessaie.')
        : (e.name === 'TypeError' ? new Error('Connexion au serveur impossible.') : e)
    } finally {
      clearTimeout(timer)
    }
    if (attempt < retries) await new Promise(r => setTimeout(r, 900 * (attempt + 1)))
  }
  throw lastErr || new Error('Connexion impossible.')
}

// ── OCR d'une photo d'emploi du temps → liste de blocs ────────────
export async function ocrScheduleFromImage(file) {
  if (!file) throw new Error('Aucune image')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Image trop lourde (max 10 Mo)')
  const token = await getToken()
  if (!token) throw new Error('Reconnecte-toi pour utiliser cette fonction')

  const image = await compressImage(file)
  const imageBase64 = await blobToBase64(image)
  const data = await postJson('/api/vision', { imageBase64, mimeType: image.type || 'image/jpeg' }, token)
  return Array.isArray(data.blocks) ? data.blocks : []
}

// ── Transcription d'un enregistrement vocal → texte ───────────────
export async function transcribeAudio(blob) {
  if (!blob || !blob.size) throw new Error('Aucun audio')
  if (blob.size > MAX_AUDIO_BYTES) throw new Error('Enregistrement trop long')
  const token = await getToken()
  if (!token) throw new Error('Reconnecte-toi pour utiliser cette fonction')

  const audioBase64 = await blobToBase64(blob)
  const data = await postJson('/api/whisper', { audioBase64, mimeType: blob.type || 'audio/webm' }, token)
  return (data.text || '').trim()
}
