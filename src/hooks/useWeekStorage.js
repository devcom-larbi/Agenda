import { useState, useEffect, useRef, useMemo } from 'react'
import { WEEKLY_SCHEDULE, DAYS_ORDER } from '../data/schedule'
import { supabase } from '../lib/supabase'

/**
 * Génère un suffixe court à partir du weekKey.
 * "week-2026-W16" → "26W16"
 */
function weekSuffix(wk) {
  const m = wk.match(/(\d{4})-W(\d+)/)
  if (m) return m[1].slice(2) + 'W' + m[2]
  return wk.replace(/\D/g, '').slice(-6)
}

/**
 * Régénère des IDs uniques par semaine pour tous les blocs d'un schedule.
 * Conserve templateId → référence vers l'ID original du template.
 * Remet done:false sur tous les blocs.
 */
function regenerateWeekIds(schedule, wk) {
  const suffix = weekSuffix(wk)
  const result = {}
  for (const [dayName, dayData] of Object.entries(schedule)) {
    result[dayName] = {
      ...dayData,
      blocks: dayData.blocks.map((block, i) => {
        const prefix = (block.id || '').split('-')[0] || dayName.slice(0, 3)
        return {
          ...block,
          id: `${prefix}-${suffix}-${i}`,
          templateId: block.templateId || block.id,
          done: false,
        }
      }),
    }
  }
  return result
}

// weekKey est maintenant fourni de l'extérieur (par Dashboard)
export function useWeekStorage(userId, weekKey) {
  const isRemoteUpdate = useRef(false)
  const [templateLoaded, setTemplateLoaded] = useState(false)
  const [schedule, setSchedule] = useState(null)
  const [activeWeekKey, setActiveWeekKey] = useState(null)

  // ── Chargement initial : reset + fetch ou création de l'entrée weekly_schedules ──
  useEffect(() => {
    if (!userId || !weekKey) return

    // Reset à chaque changement de semaine ou d'utilisateur
    setTemplateLoaded(false)
    setSchedule(null)

    // Fallback localStorage (Supabase non configuré)
    if (!supabase) {
      const lsKey = weekKey + '_' + userId
      const saved = localStorage.getItem(lsKey)
      if (saved) {
        try { setSchedule(JSON.parse(saved)) } catch { setSchedule(regenerateWeekIds(WEEKLY_SCHEDULE, weekKey)) }
      } else {
        const fallback = regenerateWeekIds(WEEKLY_SCHEDULE, weekKey)
        setSchedule(fallback)
        localStorage.setItem(lsKey, JSON.stringify(fallback))
      }
      setActiveWeekKey(weekKey)
      setTemplateLoaded(true)
      return
    }

    let cancelled = false

    async function fetchOrCreate() {
      // 1. Chercher weekly_schedules pour (week_key, user_id)
      const { data: existing, error: fetchError } = await supabase
        .from('weekly_schedules')
        .select('schedule_data')
        .eq('week_key', weekKey)
        .eq('user_id', userId)
        .maybeSingle()

      if (cancelled) return

      if (!fetchError && existing?.schedule_data) {
        isRemoteUpdate.current = true
        setSchedule(existing.schedule_data)
        setActiveWeekKey(weekKey)
        setTemplateLoaded(true)
        return
      }

      // Cas 2 : pas d'entrée → chercher le template utilisateur
      let baseSchedule = JSON.parse(JSON.stringify(WEEKLY_SCHEDULE))

      const { data: tplData, error: tplError } = await supabase
        .from('user_templates')
        .select('schedule_template')
        .eq('user_id', userId)
        .maybeSingle()

      if (!tplError && tplData?.schedule_template) {
        baseSchedule = JSON.parse(JSON.stringify(tplData.schedule_template))
      }

      // Régénère des IDs uniques pour cette semaine
      baseSchedule = regenerateWeekIds(baseSchedule, weekKey)

      if (cancelled) return

      // Créer l'entrée dans weekly_schedules
      const { error: insertError } = await supabase
        .from('weekly_schedules')
        .insert({
          week_key: weekKey,
          user_id: userId,
          schedule_data: baseSchedule,
          updated_at: new Date().toISOString(),
        })

      if (cancelled) return

      if (insertError) {
        // Conflit possible (double mount en dev StrictMode) : re-fetch
        const { data: retry } = await supabase
          .from('weekly_schedules')
          .select('schedule_data')
          .eq('week_key', weekKey)
          .eq('user_id', userId)
          .maybeSingle()

        if (!cancelled) {
          isRemoteUpdate.current = true
          setSchedule(retry?.schedule_data ?? baseSchedule)
        }
      } else {
        isRemoteUpdate.current = true
        setSchedule(baseSchedule)
      }

      if (!cancelled) {
        setActiveWeekKey(weekKey)
        setTemplateLoaded(true)
      }
    }

    fetchOrCreate()
    return () => { cancelled = true }
  }, [userId, weekKey])

  // ── Subscription realtime pour la semaine courante ──
  useEffect(() => {
    if (!supabase || !userId || !templateLoaded || !weekKey) return

    const channel = supabase
      .channel(`weekly-schedules-${weekKey}-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weekly_schedules',
          filter: `week_key=eq.${weekKey}`,
        },
        (payload) => {
          if (payload.new?.schedule_data && payload.new.user_id === userId) {
            isRemoteUpdate.current = true
            setSchedule(payload.new.schedule_data)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [weekKey, userId, templateLoaded])

  // ── Persistence : upsert Supabase + cache localStorage ──
  useEffect(() => {
    if (!templateLoaded || schedule === null || !weekKey || activeWeekKey !== weekKey) return

    localStorage.setItem(
      weekKey + '_' + (userId || ''),
      JSON.stringify(schedule)
    )

    if (!supabase || !userId) return

    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false
      return
    }

    async function pushRemote() {
      const { error } = await supabase
        .from('weekly_schedules')
        .upsert(
          {
            week_key: weekKey,
            user_id: userId,
            schedule_data: schedule,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'week_key,user_id' }
        )
      if (error) console.error('[pushRemote] upsert error:', error.message)
    }
    pushRemote()
  }, [schedule, weekKey, userId, templateLoaded])

  // ── Mutateurs ──
  function addBlock(dayName, blockData) {
    const prefix = dayName.slice(0, 3)
    const newBlock = { id: `${prefix}-${Date.now()}`, done: false, ...blockData }
    setSchedule(prev => {
      if (!prev) return prev
      return { ...prev, [dayName]: { ...prev[dayName], blocks: [...prev[dayName].blocks, newBlock] } }
    })
  }

  function deleteBlock(dayName, blockId) {
    setSchedule(prev => {
      if (!prev) return prev
      return { ...prev, [dayName]: { ...prev[dayName], blocks: prev[dayName].blocks.filter(b => b.id !== blockId) } }
    })
  }

  function updateBlock(dayName, blockId, updates) {
    setSchedule((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [dayName]: {
          ...prev[dayName],
          blocks: prev[dayName].blocks.map((block) =>
            block.id === blockId ? { ...block, ...updates } : block
          ),
        },
      }
    })
  }

  function toggleBlock(dayName, blockId) {
    setSchedule((prev) => {
      if (!prev) return prev
      const block = prev[dayName]?.blocks.find((b) => b.id === blockId)
      if (!block) return prev
      return {
        ...prev,
        [dayName]: {
          ...prev[dayName],
          blocks: prev[dayName].blocks.map((b) =>
            b.id === blockId ? { ...b, done: !b.done } : b
          ),
        },
      }
    })
  }

  function replaceSchedule(newSchedule) {
    isRemoteUpdate.current = false
    setSchedule(newSchedule)
  }

  function reorderBlocks(dayName, newBlocks) {
    setSchedule(prev => {
      if (!prev || !prev[dayName]) return prev
      return {
        ...prev,
        [dayName]: { ...prev[dayName], blocks: newBlocks }
      }
    })
  }

  async function reportBlockToNextDay(dayName, blockId) {
    const currentIndex = DAYS_ORDER.indexOf(dayName)
    const nextDayName = DAYS_ORDER[currentIndex + 1]
    
    // Si c'est dimanche, on ne peut pas reporter facilement au "lendemain" dans ce hook (limitée à une semaine)
    // Sauf si on implémente une logique cross-week. Pour l'instant, limitons à la semaine en cours ou alertons.
    if (!nextDayName) {
      throw new Error("Impossible de reporter au-delà du dimanche pour l'instant.")
    }

    setSchedule(prev => {
      if (!prev || !prev[dayName] || !prev[nextDayName]) return prev
      const blockToMove = prev[dayName].blocks.find(b => b.id === blockId)
      if (!blockToMove) return prev

      const newDayBlocks = prev[dayName].blocks.filter(b => b.id !== blockId)
      const nextDayBlocks = [...prev[nextDayName].blocks, { ...blockToMove, done: false }]

      return {
        ...prev,
        [dayName]: { ...prev[dayName], blocks: newDayBlocks },
        [nextDayName]: { ...prev[nextDayName], blocks: nextDayBlocks }
      }
    })
  }

  async function markBlockRecurring(dayName, blockId, isRecurring) {
    // Met à jour le flag recurring dans la semaine courante
    updateBlock(dayName, blockId, { recurring: isRecurring })

    // Met à jour le template utilisateur dans Supabase
    if (!supabase || !userId) return
    const { data: tplData } = await supabase
      .from('user_templates')
      .select('schedule_template')
      .eq('user_id', userId)
      .maybeSingle()

    if (!tplData?.schedule_template) return
    const tpl = JSON.parse(JSON.stringify(tplData.schedule_template))
    const block = schedule?.[dayName]?.blocks.find(b => b.id === blockId)
    if (!block || !tpl[dayName]) return

    // Les semaines récentes ont templateId → ID original dans le template
    const tplId = block.templateId || blockId

    if (isRecurring) {
      const idx = tpl[dayName].blocks.findIndex(b => b.id === tplId)
      // Bloc sans templateId dans le template : on le stocke avec son ID propre
      const tplBlock = { ...block, id: tplId, templateId: undefined, recurring: true, done: false }
      if (idx >= 0) tpl[dayName].blocks[idx] = tplBlock
      else tpl[dayName].blocks.push(tplBlock)
    } else {
      const idx = tpl[dayName].blocks.findIndex(b => b.id === tplId)
      if (idx >= 0) tpl[dayName].blocks[idx] = { ...tpl[dayName].blocks[idx], recurring: false }
    }

    await supabase
      .from('user_templates')
      .update({ schedule_template: tpl })
      .eq('user_id', userId)
  }

  async function copyWeekTo(targetWeekKey) {
    if (!schedule) return
    // Régénère des IDs uniques pour la semaine cible + remet done:false
    const fresh = regenerateWeekIds(schedule, targetWeekKey)

    if (supabase && userId) {
      await supabase.from('weekly_schedules').upsert({
        week_key: targetWeekKey,
        user_id: userId,
        schedule_data: fresh,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'week_key,user_id' })
    } else {
      localStorage.setItem(targetWeekKey + '_' + userId, JSON.stringify(fresh))
    }
  }

  const completionStats = useMemo(() => computeStats(schedule ?? WEEKLY_SCHEDULE), [schedule])

  return {
    schedule: schedule ?? WEEKLY_SCHEDULE,
    templateLoaded,
    toggleBlock,
    addBlock,
    deleteBlock,
    updateBlock,
    reorderBlocks,
    reportBlockToNextDay,
    replaceSchedule,
    markBlockRecurring,
    copyWeekTo,
    completionStats,
  }
}

function computeStats(schedule) {
  let total = 0
  let done = 0
  const byCategory = {}

  for (const dayName of Object.keys(schedule)) {
    const day = schedule[dayName]
    if (!day) continue
    for (const block of day.blocks) {
      total++
      if (block.done) done++
      if (!byCategory[block.category])
        byCategory[block.category] = { total: 0, done: 0 }
      byCategory[block.category].total++
      if (block.done) byCategory[block.category].done++
    }
  }

  const percentage = total === 0 ? 0 : Math.round((done / total) * 100)
  return { total, done, percentage, byCategory }
}
