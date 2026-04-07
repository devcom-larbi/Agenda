import { useState, useEffect, useRef, useMemo } from 'react'
import { WEEKLY_SCHEDULE } from '../data/schedule'
import { supabase } from '../lib/supabase'

// weekKey est maintenant fourni de l'extérieur (par Dashboard)
export function useWeekStorage(userId, weekKey) {
  const isRemoteUpdate = useRef(false)
  const [templateLoaded, setTemplateLoaded] = useState(false)
  const [schedule, setSchedule] = useState(null)

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
        try { setSchedule(JSON.parse(saved)) } catch { setSchedule(JSON.parse(JSON.stringify(WEEKLY_SCHEDULE))) }
      } else {
        const fallback = JSON.parse(JSON.stringify(WEEKLY_SCHEDULE))
        setSchedule(fallback)
        localStorage.setItem(lsKey, JSON.stringify(fallback))
      }
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

      if (!cancelled) setTemplateLoaded(true)
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
    if (!templateLoaded || schedule === null || !weekKey) return

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

  const completionStats = useMemo(() => computeStats(schedule ?? WEEKLY_SCHEDULE), [schedule])

  return {
    schedule: schedule ?? WEEKLY_SCHEDULE,
    templateLoaded,
    toggleBlock,
    updateBlock,
    replaceSchedule,
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
