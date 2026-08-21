/**
 * api/models.js — Source unique des modèles de chat autorisés.
 *
 * Importé par api/chat.js (prod Vercel) ET vite.config.js (middleware dev),
 * pour éviter que les deux listes divergent.
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
