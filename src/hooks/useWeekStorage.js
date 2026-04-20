import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { DAYS_ORDER } from '../data/schedule'
import { toast } from 'sonner'

// ── Helpers ───────────────────────────────────────────────────────
function getEmptyWeek() {
  const week = {}
  DAYS_ORDER.forEach(day => {
    week[day] = { label: day.charAt(0).toUpperCase() + day.slice(1), blocks: [] }
  })
  return week
}

function sortBlocks(blocks) {
  return [...blocks].sort((a, b) => {
    const parse = s => {
      const m = s?.match(/^(\d{1,2})h(\d{0,2})/)
      return m ? parseInt(m[1]) * 60 + parseInt(m[2] || '0') : 9999
    }
    return parse(a.time) - parse(b.time)
  })
}

// ── Hook Principal ────────────────────────────────────────────────
export function useWeekStorage(weekKey) {
  const { user } = useAuth()
  const [schedule, setSchedule] = useState(getEmptyWeek())
  const [loading, setLoading] = useState(true)

  // 1. CHARGEMENT DES DONNÉES (Fetch)
  useEffect(() => {
    if (!user || !supabase) {
      setLoading(false)
      return
    }

    async function fetchWeek() {
      setLoading(true)
      const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_key', weekKey)

      if (error) {
        console.error('Erreur chargement planning:', error)
        toast.error('Erreur de connexion au serveur.')
        setLoading(false)
        return
      }

      const newSchedule = getEmptyWeek()
      data.forEach(row => {
        if (newSchedule[row.day_name]) {
          newSchedule[row.day_name].blocks.push({
            id: row.id,
            time: row.time,
            label: row.label,
            category: row.category,
            priority: row.priority,
            description: row.description,
            color: row.color,
            emoji: row.emoji,
            bgOpacity: row.bg_opacity,
            done: row.done
          })
        }
      })

      // Tri des blocs par heure
      Object.keys(newSchedule).forEach(day => {
        newSchedule[day].blocks = sortBlocks(newSchedule[day].blocks)
      })

      setSchedule(newSchedule)
      setLoading(false)
    }

    fetchWeek()
  }, [weekKey, user])

  // 2. AJOUTER UN BLOC (Optimistic Update)
  const addBlock = useCallback(async (dayName, blockData) => {
    if (!user || !supabase) return

    // Création d'un ID temporaire pour l'UI instantanée
    const tempId = crypto.randomUUID()
    const newBlock = { id: tempId, ...blockData, done: false }

    // Mise à jour instantanée de l'UI
    setSchedule(prev => ({
      ...prev,
      [dayName]: {
        ...prev[dayName],
        blocks: sortBlocks([...prev[dayName].blocks, newBlock])
      }
    }))

    // Envoi à Supabase
    const { data, error } = await supabase.from('blocks').insert({
      user_id: user.id,
      week_key: weekKey,
      day_name: dayName,
      time: blockData.time,
      label: blockData.label,
      category: blockData.category,
      priority: blockData.priority,
      description: blockData.description,
      color: blockData.color,
      emoji: blockData.emoji,
      bg_opacity: blockData.bgOpacity || '12',
      done: false
    }).select().single()

    if (error) {
      toast.error("Impossible d'ajouter le bloc.")
      // En cas d'erreur, on recharge la vraie version du serveur
      return
    }

    // On remplace l'ID temporaire par le vrai ID généré par Supabase
    setSchedule(prev => ({
      ...prev,
      [dayName]: {
        ...prev[dayName],
        blocks: prev[dayName].blocks.map(b => b.id === tempId ? { ...b, id: data.id } : b)
      }
    }))
  }, [weekKey, user])

  // 3. METTRE À JOUR UN BLOC
  const updateBlock = useCallback(async (dayName, blockId, updates) => {
    if (!user || !supabase) return

    // UI instantanée
    setSchedule(prev => ({
      ...prev,
      [dayName]: {
        ...prev[dayName],
        blocks: sortBlocks(prev[dayName].blocks.map(b => b.id === blockId ? { ...b, ...updates } : b))
      }
    }))

    // Formatage des clés pour Supabase (camelCase -> snake_case)
    const dbUpdates = {}
    if (updates.time !== undefined) dbUpdates.time = updates.time
    if (updates.label !== undefined) dbUpdates.label = updates.label
    if (updates.category !== undefined) dbUpdates.category = updates.category
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.color !== undefined) dbUpdates.color = updates.color
    if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji
    if (updates.bgOpacity !== undefined) dbUpdates.bg_opacity = updates.bgOpacity
    
    dbUpdates.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('blocks')
      .update(dbUpdates)
      .eq('id', blockId)
      .eq('user_id', user.id)

    if (error) toast.error("Erreur lors de la modification.")
  }, [user])

  // 4. COCHER / DÉCOCHER UN BLOC
  const toggleBlock = useCallback(async (dayName, blockId) => {
    if (!user || !supabase) return

    let newDoneState = false

    // UI instantanée
    setSchedule(prev => ({
      ...prev,
      [dayName]: {
        ...prev[dayName],
        blocks: prev[dayName].blocks.map(b => {
          if (b.id === blockId) {
            newDoneState = !b.done
            return { ...b, done: newDoneState }
          }
          return b
        })
      }
    }))

    // Supabase
    const { error } = await supabase
      .from('blocks')
      .update({ done: newDoneState, updated_at: new Date().toISOString() })
      .eq('id', blockId)
      .eq('user_id', user.id)

    if (error) toast.error("Erreur de synchronisation.")
  }, [user])

  // 5. SUPPRIMER UN BLOC
  const deleteBlock = useCallback(async (dayName, blockId) => {
    if (!user || !supabase) return

    // UI instantanée
    setSchedule(prev => ({
      ...prev,
      [dayName]: {
        ...prev[dayName],
        blocks: prev[dayName].blocks.filter(b => b.id !== blockId)
      }
    }))

    // Supabase
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('id', blockId)
      .eq('user_id', user.id)

    if (error) toast.error("Impossible de supprimer le bloc.")
  }, [user])

  // 6. METTRE À JOUR TOUTE LA SEMAINE (Pour les actions de l'IA)
  const updateSchedule = useCallback(async (newSchedule) => {
    // Cette fonction sera utile pour appliquer les changements globaux de l'IA
    setSchedule(newSchedule)
    // Idéalement, il faudrait ici synchroniser le bloc entier avec Supabase, 
    // mais dans une architecture RLS stricte, l'IA devrait appeler addBlock/updateBlock/deleteBlock individuellement.
  }, [])

  return {
    schedule,
    loading,
    addBlock,
    updateBlock,
    toggleBlock,
    deleteBlock,
    updateSchedule
  }
}
