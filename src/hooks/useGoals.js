import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function todayKey() {
  return new Date().toISOString().split('T')[0]
}

function dateKey(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

function lsGoalsKey(userId)    { return `user_goals_${userId || 'local'}` }
function lsProgressKey(userId) { return `goal_progress_${userId || 'local'}` }
function lsOrderKey(userId)    { return `goals_order_${userId || 'local'}` }

export function useGoals(userId) {
  const [goals, setGoals] = useState(() => {
    try { return JSON.parse(localStorage.getItem(lsGoalsKey(userId)) || '[]') } catch { return [] }
  })
  const [progress, setProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem(lsProgressKey(userId)) || '{}') } catch { return {} }
  })
  const [loading, setLoading] = useState(false)

  // ── Chargement initial depuis Supabase ──
  useEffect(() => {
    if (!userId || !supabase) return
    setLoading(true)

    Promise.all([
      supabase.from('user_goals').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('goal_progress').select('*').eq('user_id', userId),
    ]).then(([goalsRes, progressRes]) => {
      if (!goalsRes.error && goalsRes.data) {
        let g = goalsRes.data.map(r => ({
          id: r.id, label: r.label, emoji: r.emoji, type: r.type,
          target: r.target, unit: r.unit, color: r.color, createdAt: r.created_at,
        }))
        const savedOrder = JSON.parse(localStorage.getItem(lsOrderKey(userId)) || 'null')
        if (savedOrder) {
          g.sort((a, b) => {
            const ia = savedOrder.indexOf(a.id), ib = savedOrder.indexOf(b.id)
            return (ia === -1 ? 9999 : ia) - (ib === -1 ? 9999 : ib)
          })
        }
        setGoals(g)
        localStorage.setItem(lsGoalsKey(userId), JSON.stringify(g))
      }
      if (!progressRes.error && progressRes.data) {
        // Reconstruit { 'YYYY-MM-DD': { goalId: { done, value } } }
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

  // ── Persistance locale ──
  function persistGoalsLocal(g) {
    setGoals(g)
    localStorage.setItem(lsGoalsKey(userId), JSON.stringify(g))
  }
  function persistProgressLocal(p) {
    setProgress(p)
    localStorage.setItem(lsProgressKey(userId), JSON.stringify(p))
  }

  // ── Supabase upsert progress ──
  async function syncProgress(goalId, date, done, value) {
    if (!supabase || !userId) return
    await supabase.from('goal_progress').upsert(
      { user_id: userId, goal_id: goalId, date, done, value },
      { onConflict: 'user_id,goal_id,date' }
    )
  }

  // ── Mutations goals ──
  async function addGoal(data) {
    const id = Date.now().toString()
    const newGoal = { ...data, id, createdAt: new Date().toISOString() }
    persistGoalsLocal([...goals, newGoal])
    if (supabase && userId) {
      await supabase.from('user_goals').insert({
        id, user_id: userId, label: data.label, emoji: data.emoji,
        type: data.type, target: data.target, unit: data.unit, color: data.color,
        created_at: newGoal.createdAt,
      })
    }
  }

  function reorderGoals(newGoals) {
    persistGoalsLocal(newGoals)
    localStorage.setItem(lsOrderKey(userId), JSON.stringify(newGoals.map(g => g.id)))
  }

  async function deleteGoal(id) {
    persistGoalsLocal(goals.filter(g => g.id !== id))
    if (supabase && userId) {
      await supabase.from('user_goals').delete().eq('user_id', userId).eq('id', id)
      await supabase.from('goal_progress').delete().eq('user_id', userId).eq('goal_id', id)
    }
  }

  async function updateGoal(id, data) {
    persistGoalsLocal(goals.map(g => g.id === id ? { ...g, ...data } : g))
    if (supabase && userId) {
      await supabase.from('user_goals').update({ ...data }).eq('user_id', userId).eq('id', id)
    }
  }

  // ── Mutations progress ──
  function toggleGoal(goalId) {
    const date = todayKey()
    const cur = progress[date]?.[goalId] || { done: false, value: 0 }
    const next = { ...cur, done: !cur.done }
    const newProgress = { ...progress, [date]: { ...progress[date], [goalId]: next } }
    persistProgressLocal(newProgress)
    syncProgress(goalId, date, next.done, next.value)
  }

  function addValue(goalId, increment) {
    const goal = goals.find(g => g.id === goalId)
    const date = todayKey()
    const cur = progress[date]?.[goalId] || { done: false, value: 0 }
    const newValue = Math.max(0, cur.value + increment)
    const done = newValue >= (goal?.target || 1)
    const newProgress = { ...progress, [date]: { ...progress[date], [goalId]: { value: newValue, done } } }
    persistProgressLocal(newProgress)
    syncProgress(goalId, date, done, newValue)
  }

  function resetValue(goalId) {
    const date = todayKey()
    const newProgress = { ...progress, [date]: { ...progress[date], [goalId]: { value: 0, done: false } } }
    persistProgressLocal(newProgress)
    syncProgress(goalId, date, false, 0)
  }

  // ── Lecture ──
  function getTodayProgress() {
    return progress[todayKey()] || {}
  }

  function getStreak(goalId) {
    let streak = 0
    // Compte depuis hier en arrière
    for (let i = 1; i <= 365; i++) {
      if (progress[dateKey(i)]?.[goalId]?.done) streak++
      else break
    }
    // Ajoute aujourd'hui si fait
    if (progress[todayKey()]?.[goalId]?.done) streak++
    return streak
  }

  function getLast7Days(goalId) {
    return Array.from({ length: 7 }, (_, i) => {
      const key = dateKey(6 - i)
      const p = progress[key]?.[goalId]
      return { key, done: p?.done ?? false, value: p?.value ?? 0, isToday: i === 6 }
    })
  }

  return { goals, loading, addGoal, deleteGoal, updateGoal, reorderGoals, toggleGoal, addValue, resetValue, getTodayProgress, getStreak, getLast7Days }
}
