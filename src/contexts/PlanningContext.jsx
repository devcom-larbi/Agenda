import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { toast } from 'sonner'

const PlanningContext = createContext(null)

// Planning local unique pour le mode démo / sans Supabase
const LOCAL_DEFAULT = { id: 'local-default', name: 'Mon planning', color: '#B45309', emoji: null, is_default: true, position: 0, archived: false }

function activeKey(uid) { return `active_planning_${uid || 'local'}` }

export function PlanningProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id
  const [plannings, setPlannings] = useState([])
  const [activePlanningId, setActivePlanningId] = useState(null)
  const [loading, setLoading] = useState(true)

  // Choisit le planning actif : localStorage si encore valide, sinon défaut, sinon premier.
  const resolveActive = useCallback((list) => {
    const saved = userId ? localStorage.getItem(activeKey(userId)) : null
    const valid = list.find(p => p.id === saved)
    const fallback = list.find(p => p.is_default) || list[0]
    return (valid || fallback)?.id || null
  }, [userId])

  // ── Bootstrap : charge (ou crée) les plannings du user ──
  useEffect(() => {
    let cancelled = false
    async function boot() {
      setLoading(true)
      if (!userId) { setPlannings([]); setActivePlanningId(null); setLoading(false); return }
      if (!supabase) {
        if (cancelled) return
        setPlannings([LOCAL_DEFAULT]); setActivePlanningId(LOCAL_DEFAULT.id); setLoading(false); return
      }
      let { data } = await supabase.from('plannings').select('*')
        .eq('user_id', userId).eq('archived', false).order('position', { ascending: true })
      let list = data || []
      if (list.length === 0) {
        const { data: created } = await supabase.from('plannings')
          .insert({ user_id: userId, name: 'Mon planning', is_default: true, position: 0, color: '#B45309' })
          .select().single()
        if (created) list = [created]
      }
      if (cancelled) return
      setPlannings(list)
      setActivePlanningId(resolveActive(list))
      setLoading(false)
    }
    boot()
    return () => { cancelled = true }
  }, [userId, resolveActive])

  const setActivePlanning = useCallback((id) => {
    setActivePlanningId(id)
    if (userId) localStorage.setItem(activeKey(userId), id)
  }, [userId])

  const createPlanning = useCallback(async ({ name, color = '#B45309', emoji = null }) => {
    const trimmed = (name || '').trim() || 'Nouveau planning'
    const position = plannings.length
    if (!supabase || !userId) {
      const local = { id: `local-${Date.now()}`, name: trimmed, color, emoji, is_default: false, position, archived: false }
      setPlannings(p => [...p, local]); setActivePlanning(local.id); return local
    }
    const { data, error } = await supabase.from('plannings')
      .insert({ user_id: userId, name: trimmed, color, emoji, position }).select().single()
    if (error || !data) { toast.error("Impossible de créer le planning."); return null }
    setPlannings(p => [...p, data]); setActivePlanning(data.id)
    return data
  }, [plannings, userId, setActivePlanning])

  const renamePlanning = useCallback(async (id, patch) => {
    setPlannings(p => p.map(x => x.id === id ? { ...x, ...patch } : x))
    if (supabase && userId) await supabase.from('plannings').update(patch).eq('id', id).eq('user_id', userId)
  }, [userId])

  // Suppression = archivage (réversible)
  const archivePlanning = useCallback(async (id) => {
    const remaining = plannings.filter(p => p.id !== id)
    if (remaining.length === 0) { toast.error("Tu dois garder au moins un planning."); return }
    setPlannings(remaining)
    if (activePlanningId === id) setActivePlanning((remaining.find(p => p.is_default) || remaining[0]).id)
    if (supabase && userId) await supabase.from('plannings').update({ archived: true }).eq('id', id).eq('user_id', userId)
    toast.success('Planning archivé.')
  }, [plannings, activePlanningId, userId, setActivePlanning])

  const activePlanning = plannings.find(p => p.id === activePlanningId) || null
  const getPlanningColor = useCallback((id) => plannings.find(p => p.id === id)?.color || '#B45309', [plannings])

  return (
    <PlanningContext.Provider value={{
      plannings, activePlanningId, activePlanning, loading,
      setActivePlanning, createPlanning, renamePlanning, archivePlanning, getPlanningColor,
    }}>
      {children}
    </PlanningContext.Provider>
  )
}

export const usePlanning = () => useContext(PlanningContext)
