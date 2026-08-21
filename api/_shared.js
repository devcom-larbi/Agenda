/**
 * api/_shared.js — Code commun aux handlers /api : modèles autorisés et
 * appel de complétion.
 *
 * Importé par api/chat.js (prod Vercel) ET vite.config.js (middleware dev),
 * pour éviter que les deux listes divergent.
 *
 * Le préfixe « _ » est requis : Vercel transforme en endpoint public tout
 * fichier de api/ qui n'en a pas — api/models.js répondait 500 sur
 * /api/models faute de handler exporté.
 *
 * MAJ 2026-08-21 : Groq a retiré toute la famille Llama de son catalogue
 * (llama-3.3-70b-versatile renvoyait « does not exist or you do not have access »).
 * Défaut basculé sur openai/gpt-oss-120b : tool calling + JSON mode vérifiés OK.
 */

export const DEFAULT_MODEL = 'openai/gpt-oss-120b'

export const ALLOWED_MODELS = new Set([
  'openai/gpt-oss-120b',   // défaut : le plus fiable en français, tools + JSON
  'openai/gpt-oss-20b',    // plus léger/rapide, un peu moins bon en français
  'qwen/qwen3.6-27b',      // alternatif — NB : peu fiable en jsonMode
  'openai/gpt-4o-mini',    // via OpenRouter si OPENROUTER_API_KEY est défini
])

/**
 * Les modèles gpt-oss consomment des tokens de raisonnement avant de répondre :
 * sans bride, un max_tokens serré peut retourner un `content` vide.
 * 'low' divise la consommation par ~3 sur nos prompts, à qualité égale.
 */
export function reasoningEffortFor(model) {
  return model.startsWith('openai/gpt-oss') ? 'low' : null
}

/**
 * Le mode `json_object` de Groq rejette TOUTE la réponse dès que le modèle
 * sort du JSON strict — génération tronquée par max_tokens, préambule en
 * texte… L'erreur remonte alors « Failed to generate JSON », et le contenu
 * fautif est placé dans `failed_generation`. Souvent, ce contenu contient un
 * JSON parfaitement valide entouré de texte : autant le récupérer.
 */
export function salvageJSON(failedGeneration) {
  if (typeof failedGeneration !== 'string') return null
  const clean = failedGeneration.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  const candidate = clean.slice(start, end + 1)
  try {
    JSON.parse(candidate)
    return candidate
  } catch {
    return null // tronqué au milieu : rien à sauver sans inventer du contenu
  }
}

/**
 * Appelle l'API de complétion en rattrapant les rejets du mode JSON strict.
 * Retourne { response } en cas de succès, { salvagedContent } si le JSON a pu
 * être récupéré, sinon { status, error }.
 */
export async function fetchCompletion(apiUrl, apiKey, body) {
  const post = payload => fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  })

  const res = await post(body)
  if (res.ok) return { response: res }

  const err = (await res.json().catch(() => ({}))).error || {}

  if (err.code === 'json_validate_failed' && !body.stream) {
    const salvaged = salvageJSON(err.failed_generation)
    if (salvaged) return { salvagedContent: salvaged }

    // Rien à sauver : on retente sans la contrainte stricte. Une réponse en
    // texte libre reste exploitable par le client, contrairement à une erreur.
    console.warn('[chat] json_validate_failed irrécupérable → retry sans response_format')
    const loose = { ...body }
    delete loose.response_format
    const retry = await post(loose)
    if (retry.ok) return { response: retry }
  }

  return { status: res.status, error: err.message || `API HTTP ${res.status}` }
}
