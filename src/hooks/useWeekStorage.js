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
            note: row.note || '',
            color: row.color,
            emoji: row.emoji,
            bgOpacity: row.bg_opacity,
            done: row.done,
            recurrenceType: row.recurrence_type || 'none',
            position: row.position ?? null,
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
    if (updates.note !== undefined) dbUpdates.note = updates.note
    if (updates.color !== undefined) dbUpdates.color = updates.color
    if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji
    if (updates.bgOpacity !== undefined) dbUpdates.bg_opacity = updates.bgOpacity
    if (updates.recurrenceType !== undefined) dbUpdates.recurrence_type = updates.recurrenceType
    if (updates.position !== undefined) dbUpdates.position = updates.position
    
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
    if (!user || !supabase) { setSchedule(newSchedule); return }

    const isUUID = id => /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)
    const finalSchedule = structuredClone(newSchedule)

    for (const dayName of DAYS_ORDER) {
      const oldBlocks = schedule[dayName]?.blocks || []
      const newBlocks = newSchedule[dayName]?.blocks || []
      const oldIds = new Set(oldBlocks.map(b => b.id))
      const newIds = new Set(newBlocks.map(b => b.id))

      // INSERT — nouveaux blocs (id temporaire "custom-XXXX" ou absent de l'ancien state)
      for (const b of newBlocks) {
        if (oldIds.has(b.id)) continue
        const { data, error } = await supabase.from('blocks').insert({
          user_id: user.id, week_key: weekKey, day_name: dayName,
          time: b.time, label: b.label, category: b.category,
          priority: b.priority || 'normal', description: b.description || '',
          color: b.color || null, emoji: b.emoji || null,
          bg_opacity: b.bgOpacity || '12', done: false,
        }).select().single()
        if (error) { toast.error(`Erreur ajout "${b.label}".`); continue }
        // Remplace l'id temporaire par le vrai UUID Supabase
        finalSchedule[dayName].blocks = finalSchedule[dayName].blocks.map(
          blk => blk.id === b.id ? { ...blk, id: data.id } : blk
        )
      }

      // DELETE — blocs supprimés (uniquement les vrais UUIDs déjà persistés)
      for (const b of oldBlocks) {
        if (!newIds.has(b.id) && isUUID(b.id)) {
          const { error } = await supabase.from('blocks').delete()
            .eq('id', b.id).eq('user_id', user.id)
          if (error) toast.error(`Erreur suppression "${b.label}".`)
        }
      }

      // UPDATE — même id, propriétés modifiées
      for (const nb of newBlocks) {
        const ob = oldBlocks.find(b => b.id === nb.id)
        if (!ob || !isUUID(nb.id)) continue
        if (ob.time === nb.time && ob.label === nb.label && ob.category === nb.category) continue
        const { error } = await supabase.from('blocks').update({
          time: nb.time, label: nb.label, category: nb.category,
          priority: nb.priority, updated_at: new Date().toISOString(),
        }).eq('id', nb.id).eq('user_id', user.id)
        if (error) toast.error(`Erreur modification "${nb.label}".`)
      }
    }

    setSchedule(finalSchedule)
  }, [weekKey, user, schedule])

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
