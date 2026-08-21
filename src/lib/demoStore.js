/**
 * demoStore.js — Persistance locale utilisée quand la BDD est désactivée.
 *
 * Actif uniquement en mode démo (VITE_DEMO_MODE=true dans .env.local, cf. lib/supabase.js) :
 * les semaines sont stockées dans le localStorage du navigateur au lieu de Supabase.
 */

function weekKeyName(planningId, weekKey) {
  return `demo_week_${planningId}_${weekKey}`
}

export function loadDemoWeek(planningId, weekKey) {
  try {
    const raw = localStorage.getItem(weekKeyName(planningId, weekKey))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveDemoWeek(planningId, weekKey, schedule) {
  try {
    localStorage.setItem(weekKeyName(planningId, weekKey), JSON.stringify(schedule))
  } catch {
    // quota dépassé ou stockage indisponible : on ignore, la démo reste utilisable en mémoire
  }
}
