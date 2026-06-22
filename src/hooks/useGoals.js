import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

// ── Helpers Temporels ──────────────────────────────────────────────
function todayKey() {
  return new Date().toISOString().split('T')[0]
}

function dateKey(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

// Caches locaux namespacés par planning (objectifs propres à chaque planning)
function lsGoalsKey(userId, planningId)    { return `user_goals_${userId || 'local'}_${planningId || 'def'}` }
function lsProgressKey(userId, planningId) { return `goal_progress_${userId || 'local'}_${planningId || 'def'}` }

// ── Hook Principal ────────────────────────────────────────────────
// planningId : objectifs et progression cloisonnés par planning.
export function useGoals(userId, planningId) {
  const [goals, setGoals] = useState(() => {
    try { return JSON.parse(localStorage.getItem(lsGoalsKey(userId, planningId)) || '[]') } catch { return [] }
  })
  const [progress, setProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem(lsProgressKey(userId, planningId)) || '{}') } catch { return {} }
  })
  const [loading, setLoading] = useState(false)

  // 1. CHARGEMENT DEPUIS SUPABASE (Source de vérité)
  useEffect(() => {
    if (!userId || !supabase || !planningId) return
    setLoading(true)

    // Réhydrate le cache local du planning courant (changement de planning)
    try { setGoals(JSON.parse(localStorage.getItem(lsGoalsKey(userId, planningId)) || '[]')) } catch { /* noop */ }
    try { setProgress(JSON.parse(localStorage.getItem(lsProgressKey(userId, planningId)) || '{}')) } catch { /* noop */ }

    Promise.all([
      supabase.from('goals').select('*').eq('user_id', userId).eq('planning_id', planningId).order('position', { ascending: true }),
      supabase.from('goal_progress').select('*').eq('user_id', userId).eq('planning_id', planningId),
    ]).then(([goalsRes, progressRes]) => {

      if (!goalsRes.error && goalsRes.data) {
        const g = goalsRes.data.map(r => ({
          id: r.id, label: r.label, emoji: r.emoji, type: r.type,
          target: r.target, unit: r.unit, color: r.color,
          position: r.position, createdAt: r.created_at,
        }))
        setGoals(g)
        localStorage.setItem(lsGoalsKey(userId, planningId), JSON.stringify(g))
      }

      if (!progressRes.error && progressRes.data) {
        const p = {}
        for (const row of progressRes.data) {
          if (!p[row.date]) p[row.date] = {}
          p[row.date][row.goal_id] = { done: row.done, value: row.value }
        }
        setProgress(p)
        localStorage.setItem(lsProgressKey(userId, planningId), JSON.stringify(p))
      }

      setLoading(false)
    })
  }, [userId, planningId])

  // Helpers de persistance locale rapide
  const persistGoalsLocal = useCallback((g) => {
    setGoals(g)
    localStorage.setItem(lsGoalsKey(userId, planningId), JSON.stringify(g))
  }, [userId, planningId])

  const persistProgressLocal = useCallback((p) => {
    setProgress(p)
    localStorage.setItem(lsProgressKey(userId, planningId), JSON.stringify(p))
  }, [userId, planningId])

  const syncProgress = useCallback(async (goalId, date, done, value) => {
    if (!supabase || !userId || !planningId) return

    const { data: existing, error: fetchError } = await supabase
      .from('goal_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('planning_id', planningId)
      .eq('goal_id', goalId)
      .eq('date', date)
      .maybeSingle()

    if (fetchError) {
      console.error('syncProgress fetch error:', fetchError)
      toast.error("Erreur de sauvegarde de l'objectif.")
      return
    }

    const { error } = existing
      ? await supabase.from('goal_progress').update({ done, value }).eq('id', existing.id).eq('planning_id', planningId)
      : await supabase.from('goal_progress').insert({ user_id: userId, planning_id: planningId, goal_id: goalId, date, done, value })

    if (error) {
      console.error('syncProgress write error:', error)
      toast.error("Erreur de sauvegarde de l'objectif.")
    }
  }, [userId, planningId])

  // ── MUTATIONS OBJECTIFS (Optimistic Updates) ────────────────────

  const addGoal = useCallback(async (data) => {
    if (!userId || !supabase || !planningId) return

    const id = crypto.randomUUID()
    const position = goals.length
    const newGoal = { ...data, id, position, createdAt: new Date().toISOString() }

    persistGoalsLocal([...goals, newGoal])

    const { error } = await supabase.from('goals').insert({
      id,
      user_id: userId,
      planning_id: planningId,
      label: data.label,
      emoji: data.emoji,
      type: data.type,
      target: data.target,
      unit: data.unit,
      color: data.color,
      position: position
    })

    if (error) {
      toast.error("Impossible de créer l'objectif.")
      persistGoalsLocal(goals) // Rollback en cas d'erreur
    }
  }, [goals, userId, planningId, persistGoalsLocal])

  const updateGoal = useCallback(async (id, data) => {
    if (!userId || !supabase || !planningId) return
    persistGoalsLocal(goals.map(g => g.id === id ? { ...g, ...data } : g))

    const { error } = await supabase.from('goals').update({ ...data }).eq('id', id).eq('user_id', userId).eq('planning_id', planningId)
    if (error) toast.error("Erreur lors de la modification.")
  }, [goals, userId, planningId, persistGoalsLocal])

  const deleteGoal = useCallback(async (id) => {
    if (!userId || !supabase || !planningId) return
    persistGoalsLocal(goals.filter(g => g.id !== id))

    const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', userId).eq('planning_id', planningId)
    if (error) toast.error("Impossible de supprimer l'objectif.")
  }, [goals, userId, planningId, persistGoalsLocal])

  const reorderGoals = useCallback(async (newGoals) => {
    if (!userId || !supabase || !planningId) return

    const updatedGoals = newGoals.map((g, index) => ({ ...g, position: index }))
    persistGoalsLocal(updatedGoals)

    for (const g of updatedGoals) {
      await supabase.from('goals').update({ position: g.position }).eq('id', g.id).eq('user_id', userId).eq('planning_id', planningId)
    }
  }, [userId, planningId, persistGoalsLocal])

  // ── MUTATIONS PROGRESSION (Optimistic Updates) ──────────────────

  const toggleGoal = useCallback((goalId) => {
    const date = todayKey()
    const cur = progress[date]?.[goalId] || { done: false, value: 0 }
    const next = { ...cur, done: !cur.done }

    persistProgressLocal({ ...progress, [date]: { ...progress[date], [goalId]: next } })
    syncProgress(goalId, date, next.done, next.value)
  }, [progress, persistProgressLocal, syncProgress])

  const addValue = useCallback((goalId, increment) => {
    const goal = goals.find(g => g.id === goalId)
    const date = todayKey()
    const cur = progress[date]?.[goalId] || { done: false, value: 0 }

    const newValue = Math.max(0, cur.value + increment)
    const done = newValue >= (goal?.target || 1)

    persistProgressLocal({ ...progress, [date]: { ...progress[date], [goalId]: { value: newValue, done } } })
    syncProgress(goalId, date, done, newValue)
  }, [goals, progress, persistProgressLocal, syncProgress])

  const setExactValue = useCallback((goalId, value) => {
    const goal = goals.find(g => g.id === goalId)
    const date = todayKey()
    const done = value >= (goal?.target || 1)

    persistProgressLocal({ ...progress, [date]: { ...progress[date], [goalId]: { value, done } } })
    syncProgress(goalId, date, done, value)
  }, [goals, progress, persistProgressLocal, syncProgress])

  const resetValue = useCallback((goalId) => {
    const date = todayKey()
    persistProgressLocal({ ...progress, [date]: { ...progress[date], [goalId]: { value: 0, done: false } } })
    syncProgress(goalId, date, false, 0)
  }, [progress, persistProgressLocal, syncProgress])

  // ── LECTURE ─────────────────────────────────────────────────────

  const getTodayProgress = useCallback(() => {
    return progress[todayKey()] || {}
  }, [progress])

  const getStreak = useCallback((goalId) => {
    let streak = 0
    for (let i = 1; i <= 365; i++) {
      if (progress[dateKey(i)]?.[goalId]?.done) streak++
      else break
    }
    if (progress[todayKey()]?.[goalId]?.done) streak++
    return streak
  }, [progress])

  const getLast7Days = useCallback((goalId) => {
    return Array.from({ length: 7 }, (_, i) => {
      const key = dateKey(6 - i)
      const p = progress[key]?.[goalId]
      return { key, done: p?.done ?? false, value: p?.value ?? 0, isToday: i === 6 }
    })
  }, [progress])

  return {
    goals, loading,
    addGoal, deleteGoal, updateGoal, reorderGoals,
    toggleGoal, addValue, setExactValue, resetValue,
    getTodayProgress, getStreak, getLast7Days
  }
}
