import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { loadDemoWeek, saveDemoWeek } from '../lib/demoStore'
import { useAuth } from '../contexts/AuthContext'
import { DAYS_ORDER } from '../data/schedule'
import { getWeekDatesForKey } from '../utils/dateUtils'
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
    const parse = t => {
      if (!t) return 9999
      if (typeof t === 'object') {
        if (!t.start) return 9999
        const [h, m] = t.start.split(':')
        return (parseInt(h) || 0) * 60 + (parseInt(m) || 0)
      }
      const m = t.match(/(\d{1,2})[h:](\d{0,2})/)
      return m ? parseInt(m[1]) * 60 + (parseInt(m[2]) || 0) : 9999
    }
    return parse(a.time) - parse(b.time)
  })
}

// ── Hook Principal ────────────────────────────────────────────────
// planningId : identifiant du planning actif. Toutes les lectures/écritures
// sont cloisonnées par ce planning (anti-fuite entre plannings).
export function useWeekStorage(weekKey, planningId) {
  const { user } = useAuth()
  const [schedule, setSchedule] = useState(getEmptyWeek())
  const [loading, setLoading] = useState(true)
  const scheduleRef = useRef(schedule)
  scheduleRef.current = schedule

  // Met à jour le state et, quand la BDD est coupée (mode démo), persiste dans le localStorage.
  const applySchedule = useCallback((updater) => {
    setSchedule(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (!supabase && planningId) saveDemoWeek(planningId, weekKey, next)
      return next
    })
  }, [planningId, weekKey])

  // 1. CHARGEMENT DES DONNÉES (Fetch)
  useEffect(() => {
    if (!user || !planningId) {
      setLoading(false)
      return
    }

    // Mode démo (pas de BDD) : la semaine vient du localStorage
    if (!supabase) {
      setSchedule(loadDemoWeek(planningId, weekKey) || getEmptyWeek())
      setLoading(false)
      return
    }

    async function fetchWeek() {
      setLoading(true)
      const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .eq('user_id', user.id)
        .eq('planning_id', planningId)
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
            recurrenceInterval: row.recurrence_interval ?? null,
            position: row.position ?? null,
          })
        }
      })

      // Tri des blocs par heure
      Object.keys(newSchedule).forEach(day => {
        newSchedule[day].blocks = sortBlocks(newSchedule[day].blocks)
      })

      // ── Propagation inter-semaines (cloisonnée au planning actif) ──
      const { data: allRecurring } = await supabase
        .from('blocks')
        .select('week_key, day_name, time, label, category, priority, description, note, color, emoji, bg_opacity, recurrence_interval')
        .eq('user_id', user.id)
        .eq('planning_id', planningId)
        .not('recurrence_interval', 'is', null)
        .neq('week_key', weekKey)
        .order('week_key', { ascending: true })
        .limit(200)

      const currentMonday = getWeekDatesForKey(weekKey).lundi
      const seenRecurring = new Set()
      const recurringInserts = []

      for (const rb of (allRecurring || [])) {
        const interval = rb.recurrence_interval
        if (interval === null || interval === undefined) continue

        const seenKey = interval === 0
          ? `${rb.label}-i0`
          : `${rb.label}-${rb.day_name}-i${interval}`
        if (seenRecurring.has(seenKey)) continue
        seenRecurring.add(seenKey)

        const sourceMonday = getWeekDatesForKey(rb.week_key).lundi
        const weekDiff = Math.round((currentMonday - sourceMonday) / (7 * 86400000))
        if (weekDiff <= 0) continue

        const shouldPropagate = interval === 0 ? true : weekDiff % interval === 0
        if (!shouldPropagate) continue

        const targetDays = interval === 0 ? DAYS_ORDER : [rb.day_name]
        for (const day of targetDays) {
          if (!newSchedule[day]) continue
          const exists = newSchedule[day].blocks.some(b => b.label === rb.label)
          if (!exists) recurringInserts.push({ day, rb })
        }
      }

      for (const { day, rb } of recurringInserts) {
        const { data: ins, error: ie } = await supabase.from('blocks').insert({
          user_id: user.id,
          planning_id: planningId,
          week_key: weekKey,
          day_name: day,
          time: rb.time,
          label: rb.label,
          category: rb.category,
          priority: rb.priority || 'normal',
          description: rb.description || '',
          note: rb.note || '',
          color: rb.color || null,
          emoji: rb.emoji || null,
          bg_opacity: rb.bg_opacity || '12',
          done: false,
          recurrence_interval: rb.recurrence_interval,
        }).select().single()

        if (!ie && ins) {
          newSchedule[day].blocks.push({
            id: ins.id,
            time: ins.time,
            label: ins.label,
            category: ins.category,
            priority: ins.priority,
            description: ins.description,
            note: ins.note || '',
            color: ins.color,
            emoji: ins.emoji,
            bgOpacity: ins.bg_opacity,
            done: false,
            recurrenceInterval: ins.recurrence_interval ?? null,
            position: ins.position ?? null,
          })
        }
      }

      if (recurringInserts.length > 0) {
        Object.keys(newSchedule).forEach(day => {
          newSchedule[day].blocks = sortBlocks(newSchedule[day].blocks)
        })
      }
      // ────────────────────────────────────────────────────────────

      setSchedule(newSchedule)
      setLoading(false)
    }

    fetchWeek()
  }, [weekKey, user, planningId])

  // 2. AJOUTER UN BLOC (Optimistic Update)
  const addBlock = useCallback(async (dayName, blockData) => {
    if (!user || !planningId) return

    const tempId = crypto.randomUUID()
    const newBlock = { id: tempId, ...blockData, done: false }

    applySchedule(prev => ({
      ...prev,
      [dayName]: {
        ...prev[dayName],
        blocks: sortBlocks([...prev[dayName].blocks, newBlock])
      }
    }))

    if (!supabase) return

    const { data, error } = await supabase.from('blocks').insert({
      user_id: user.id,
      planning_id: planningId,
      week_key: weekKey,
      day_name: dayName,
      time: blockData.time,
      label: blockData.label,
      category: blockData.category,
      priority: blockData.priority,
      description: blockData.note,
      note: blockData.note,
      color: blockData.color,
      emoji: blockData.emoji,
      bg_opacity: blockData.bgOpacity || '12',
      recurrence_interval: blockData.recurrenceInterval ?? null,
      done: false
    }).select().single()

    if (error) {
      toast.error("Impossible d'ajouter le bloc.")
      return
    }

    applySchedule(prev => ({
      ...prev,
      [dayName]: {
        ...prev[dayName],
        blocks: prev[dayName].blocks.map(b => b.id === tempId ? { ...b, id: data.id } : b)
      }
    }))
  }, [weekKey, user, planningId, applySchedule])

  // 3. METTRE À JOUR UN BLOC
  const updateBlock = useCallback(async (dayName, blockId, updates) => {
    if (!user || !planningId) return

    const sourceBlock = scheduleRef.current[dayName]?.blocks.find(b => b.id === blockId)

    applySchedule(prev => ({
      ...prev,
      [dayName]: {
        ...prev[dayName],
        blocks: sortBlocks(prev[dayName].blocks.map(b => b.id === blockId ? { ...b, ...updates } : b))
      }
    }))

    if (!supabase) return

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
    if (updates.recurrenceInterval !== undefined) dbUpdates.recurrence_interval = updates.recurrenceInterval
    if (updates.position !== undefined) dbUpdates.position = updates.position

    dbUpdates.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('blocks')
      .update(dbUpdates)
      .eq('id', blockId)
      .eq('user_id', user.id)
      .eq('planning_id', planningId)

    if (error) { toast.error("Erreur lors de la modification."); return }

    // interval=0 (quotidien) → propage sur les autres jours de cette semaine
    if (updates.recurrenceInterval === 0 && sourceBlock) {
      const mergedBlock = { ...sourceBlock, ...updates }
      const newBlocksByDay = {}

      for (const otherDay of DAYS_ORDER.filter(d => d !== dayName)) {
        const alreadyExists = scheduleRef.current[otherDay]?.blocks.some(b => b.label === mergedBlock.label)
        if (alreadyExists) continue

        const { data, error: ie } = await supabase.from('blocks').insert({
          user_id: user.id,
          planning_id: planningId,
          week_key: weekKey,
          day_name: otherDay,
          time: mergedBlock.time,
          label: mergedBlock.label,
          category: mergedBlock.category,
          priority: mergedBlock.priority || 'normal',
          description: mergedBlock.description || '',
          note: mergedBlock.note || '',
          color: mergedBlock.color || null,
          emoji: mergedBlock.emoji || null,
          bg_opacity: mergedBlock.bgOpacity || '12',
          done: false,
          recurrence_interval: 0,
        }).select().single()

        if (!ie && data) {
          newBlocksByDay[otherDay] = {
            id: data.id,
            time: mergedBlock.time,
            label: mergedBlock.label,
            category: mergedBlock.category,
            priority: mergedBlock.priority || 'normal',
            description: mergedBlock.description || '',
            note: mergedBlock.note || '',
            color: mergedBlock.color || null,
            emoji: mergedBlock.emoji || null,
            bgOpacity: mergedBlock.bgOpacity || '12',
            done: false,
            recurrenceInterval: 0,
            position: null,
          }
        }
      }

      const addedCount = Object.keys(newBlocksByDay).length
      if (addedCount > 0) {
        applySchedule(prev => {
          const next = { ...prev }
          for (const [day, block] of Object.entries(newBlocksByDay)) {
            next[day] = { ...next[day], blocks: sortBlocks([...next[day].blocks, block]) }
          }
          return next
        })
        toast.success(`Bloc propagé sur ${addedCount} jour${addedCount > 1 ? 's' : ''}.`)
      }
    }
  }, [weekKey, user, planningId, applySchedule])

  // 4. COCHER / DÉCOCHER UN BLOC
  const toggleBlock = useCallback(async (dayName, blockId) => {
    if (!user || !planningId) return

    let newDoneState = false

    applySchedule(prev => ({
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

    if (!supabase) return

    const { error } = await supabase
      .from('blocks')
      .update({ done: newDoneState, updated_at: new Date().toISOString() })
      .eq('id', blockId)
      .eq('user_id', user.id)
      .eq('planning_id', planningId)

    if (error) toast.error("Erreur de synchronisation.")
  }, [user, planningId, applySchedule])

  // 5. SUPPRIMER UN BLOC
  const deleteBlock = useCallback(async (dayName, blockId) => {
    if (!user || !planningId) return

    applySchedule(prev => ({
      ...prev,
      [dayName]: {
        ...prev[dayName],
        blocks: prev[dayName].blocks.filter(b => b.id !== blockId)
      }
    }))

    if (!supabase) return

    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('id', blockId)
      .eq('user_id', user.id)
      .eq('planning_id', planningId)

    if (error) toast.error("Impossible de supprimer le bloc.")
  }, [user, planningId, applySchedule])

  // 6. METTRE À JOUR TOUTE LA SEMAINE (Pour les actions de l'IA)
  const updateSchedule = useCallback(async (newSchedule) => {
    if (!user || !supabase || !planningId) { applySchedule(newSchedule); return }

    const isUUID = id => /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)
    const finalSchedule = structuredClone(newSchedule)

    for (const dayName of DAYS_ORDER) {
      const oldBlocks = schedule[dayName]?.blocks || []
      const newBlocks = newSchedule[dayName]?.blocks || []
      const oldIds = new Set(oldBlocks.map(b => b.id))
      const newIds = new Set(newBlocks.map(b => b.id))

      for (const b of newBlocks) {
        if (oldIds.has(b.id)) continue
        const { data, error } = await supabase.from('blocks').insert({
          user_id: user.id, planning_id: planningId, week_key: weekKey, day_name: dayName,
          time: b.time, label: b.label, category: b.category,
          priority: b.priority || 'normal', description: b.description || '',
          color: b.color || null, emoji: b.emoji || null,
          bg_opacity: b.bgOpacity || '12', done: false,
        }).select().single()
        if (error) { toast.error(`Erreur ajout "${b.label}".`); continue }
        finalSchedule[dayName].blocks = finalSchedule[dayName].blocks.map(
          blk => blk.id === b.id ? { ...blk, id: data.id } : blk
        )
      }

      for (const b of oldBlocks) {
        if (!newIds.has(b.id) && isUUID(b.id)) {
          const { error } = await supabase.from('blocks').delete()
            .eq('id', b.id).eq('user_id', user.id).eq('planning_id', planningId)
          if (error) toast.error(`Erreur suppression "${b.label}".`)
        }
      }

      for (const nb of newBlocks) {
        const ob = oldBlocks.find(b => b.id === nb.id)
        if (!ob || !isUUID(nb.id)) continue
        if (ob.time === nb.time && ob.label === nb.label && ob.category === nb.category) continue
        const { error } = await supabase.from('blocks').update({
          time: nb.time, label: nb.label, category: nb.category,
          priority: nb.priority, updated_at: new Date().toISOString(),
        }).eq('id', nb.id).eq('user_id', user.id).eq('planning_id', planningId)
        if (error) toast.error(`Erreur modification "${nb.label}".`)
      }
    }

    applySchedule(finalSchedule)
  }, [weekKey, user, planningId, schedule, applySchedule])

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
