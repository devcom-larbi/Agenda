// ── Base URL des endpoints /api ───────────────────────────────────
// Web / PWA : VITE_API_BASE_URL vide → chemins relatifs (même origine).
// App native (Capacitor) : la WebView charge depuis https://localhost, donc
// les chemins relatifs ne résolvent vers aucun backend. Définir alors
// VITE_API_BASE_URL = URL absolue du déploiement (ex: https://ton-app.vercel.app).
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}
