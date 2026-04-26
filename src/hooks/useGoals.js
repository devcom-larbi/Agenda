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

// Caches locaux pour un affichage instantané au démarrage
function lsGoalsKey(userId)    { return `user_goals_${userId || 'local'}` }
function lsProgressKey(userId) { return `goal_progress_${userId || 'local'}` }

// ── Hook Principal ────────────────────────────────────────────────
export function useGoals(userId) {
  const [goals, setGoals] = useState(() => {
    try { return JSON.parse(localStorage.getItem(lsGoalsKey(userId)) || '[]') } catch { return [] }
  })
  const [progress, setProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem(lsProgressKey(userId)) || '{}') } catch { return {} }
  })
  const [loading, setLoading] = useState(false)

  // 1. CHARGEMENT DEPUIS SUPABASE (Source de vérité)
  useEffect(() => {
    if (!userId || !supabase) return
    setLoading(true)

    Promise.all([
      // On utilise bien la table 'goals' et on trie par la colonne 'position'
      supabase.from('goals').select('*').eq('user_id', userId).order('position', { ascending: true }),
      supabase.from('goal_progress').select('*').eq('user_id', userId),
    ]).then(([goalsRes, progressRes]) => {
      
      if (!goalsRes.error && goalsRes.data) {
        const g = goalsRes.data.map(r => ({
          id: r.id, label: r.label, emoji: r.emoji, type: r.type,
          target: r.target, unit: r.unit, color: r.color, 
          position: r.position, createdAt: r.created_at,
        }))
        setGoals(g)
        localStorage.setItem(lsGoalsKey(userId), JSON.stringify(g))
      }

      if (!progressRes.error && progressRes.data) {
        const p = {}
        for (const row of progressRes.data) {
          if (!p[row.date]) p[row.date] = {}
          p[row.date][row.goal_id] = { done: row.done, value: row.value }
        }
        setProgress(p)
        localStorage.setItem(lsProgressKey(userId), JSON.stringify(p))
      }
      
      setLoading(false)
    })
  }, [userId])

  // Helpers de persistance locale rapide
  const persistGoalsLocal = useCallback((g) => {
    setGoals(g)
    localStorage.setItem(lsGoalsKey(userId), JSON.stringify(g))
  }, [userId])

  const persistProgressLocal = useCallback((p) => {
    setProgress(p)
    localStorage.setItem(lsProgressKey(userId), JSON.stringify(p))
  }, [userId])

  const syncProgress = useCallback(async (goalId, date, done, value) => {
    if (!supabase || !userId) return

    const { data: existing, error: fetchError } = await supabase
      .from('goal_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('goal_id', goalId)
      .eq('date', date)
      .maybeSingle()

    if (fetchError) {
      console.error('syncProgress fetch error:', fetchError)
      toast.error("Erreur de sauvegarde de l'objectif.")
      return
    }

    const { error } = existing
      ? await supabase.from('goal_progress').update({ done, value }).eq('id', existing.id)
      : await supabase.from('goal_progress').insert({ user_id: userId, goal_id: goalId, date, done, value })

    if (error) {
      console.error('syncProgress write error:', error)
      toast.error("Erreur de sauvegarde de l'objectif.")
    }
  }, [userId])

  // ── MUTATIONS OBJECTIFS (Optimistic Updates) ────────────────────

  const addGoal = useCallback(async (data) => {
    if (!userId || !supabase) return
    
    // Génération d'un VRAI UUID pour Supabase
    const id = crypto.randomUUID() 
    const position = goals.length
    const newGoal = { ...data, id, position, createdAt: new Date().toISOString() }
    
    persistGoalsLocal([...goals, newGoal])

    const { error } = await supabase.from('goals').insert({
      id, 
      user_id: userId, 
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
  }, [goals, userId, persistGoalsLocal])

  const updateGoal = useCallback(async (id, data) => {
    if (!userId || !supabase) return
    persistGoalsLocal(goals.map(g => g.id === id ? { ...g, ...data } : g))

    const { error } = await supabase.from('goals').update({ ...data }).eq('id', id).eq('user_id', userId)
    if (error) toast.error("Erreur lors de la modification.")
  }, [goals, userId, persistGoalsLocal])

  const deleteGoal = useCallback(async (id) => {
    if (!userId || !supabase) return
    persistGoalsLocal(goals.filter(g => g.id !== id))

    const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', userId)
    if (error) toast.error("Impossible de supprimer l'objectif.")
  }, [goals, userId, persistGoalsLocal])

  const reorderGoals = useCallback(async (newGoals) => {
    if (!userId || !supabase) return
    
    // Mise à jour de la propriété position pour le nouvel ordre
    const updatedGoals = newGoals.map((g, index) => ({ ...g, position: index }))
    persistGoalsLocal(updatedGoals)

    // Supabase : Mise à jour en masse (Upsert) des nouvelles positions
    const upsertData = updatedGoals.map(g => ({
      id: g.id,
      user_id: userId,
      label: g.label,
      position: g.position
      // On pourrait tout renvoyer, mais pour la position, Supabase fusionnera si on upsert
    }))

    // On utilise une boucle d'updates pour être sûr si l'upsert partiel est complexe
    for (const g of updatedGoals) {
      await supabase.from('goals').update({ position: g.position }).eq('id', g.id).eq('user_id', userId)
    }
  }, [userId, persistGoalsLocal])

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
