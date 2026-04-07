import { useState, useEffect, useRef } from 'react'
import { WEEKLY_SCHEDULE, DAYS_ORDER } from '../data/schedule'
import { getWeekKey } from '../utils/dateUtils'
import { supabase } from '../lib/supabase'

export function useWeekStorage() {
  const weekKey = getWeekKey()
  const isRemoteUpdate = useRef(false)

  const [schedule, setSchedule] = useState(() => {
    const saved = localStorage.getItem(weekKey)
    const newSchedule = JSON.parse(JSON.stringify(WEEKLY_SCHEDULE))
    
    if (saved) {
      const savedData = JSON.parse(saved)
      DAYS_ORDER.forEach(day => {
        if (savedData[day] && newSchedule[day]) {
          newSchedule[day].blocks = newSchedule[day].blocks.map(newBlock => {
            const oldBlock = savedData[day].blocks?.find(b => b.id === newBlock.id)
            if (oldBlock) {
              return { 
                ...newBlock, 
                done: oldBlock.done, 
                description: oldBlock.description, 
                color: oldBlock.color 
              }
            }
            return newBlock
          })
        }
      })
    }
    return newSchedule
  })

  // 1. Abonnement aux données en temps réel Supabase (si configuré)
  useEffect(() => {
    if (!supabase) return

    async function fetchRemote() {
      const { data, error } = await supabase
        .from('weekly_schedules')
        .select('schedule_data')
        .eq('week_key', weekKey)
        .single()
      
      if (!error && data?.schedule_data) {
        // Fusion douce pour ne pas casser le format natif
        const remoteData = data.schedule_data
        const fresh = JSON.parse(JSON.stringify(WEEKLY_SCHEDULE))
        DAYS_ORDER.forEach(day => {
          if (remoteData[day] && fresh[day]) {
            fresh[day].blocks = fresh[day].blocks.map(nb => {
              const ob = remoteData[day].blocks?.find(b => b.id === nb.id)
              if (ob) return { ...nb, done: ob.done, description: ob.description, color: ob.color }
              return nb
            })
          }
        })
        isRemoteUpdate.current = true
        setSchedule(fresh)
      }
    }
    fetchRemote()

    // Écoute des futurs changements (ex: modif depuis l'iPhone)
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'weekly_schedules', filter: `week_key=eq.${weekKey}` },
        (payload) => {
          if (payload.new && payload.new.schedule_data) {
            isRemoteUpdate.current = true
            setSchedule(payload.new.schedule_data)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [weekKey])

  // 2. Persistance locale (toujours) et Cloud (si configuré)
  useEffect(() => {
    localStorage.setItem(weekKey, JSON.stringify(schedule))

    if (!supabase) return
    
    // Empêcher la boucle infinie si la modification vient du réseau
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false
      return
    }

    // Si on a fait la modification localement, on pousse l'update vers Supabase
    async function pushRemote() {
      await supabase
        .from('weekly_schedules')
        .upsert({ 
          week_key: weekKey, 
          schedule_data: schedule,
          updated_at: new Date().toISOString()
        })
    }
    pushRemote()
  }, [schedule, weekKey])


  function updateBlock(dayName, blockId, updates) {
    setSchedule((prev) => {
      const updated = { ...prev }
      updated[dayName] = {
        ...prev[dayName],
        blocks: prev[dayName].blocks.map((block) =>
          block.id === blockId
            ? { ...block, ...updates }
            : block
        ),
      }
      return updated
    })
  }

  function toggleBlock(dayName, blockId) {
    setSchedule((prev) => {
      const block = prev[dayName].blocks.find((b) => b.id === blockId)
      if (!block) return prev
      const updated = { ...prev }
      updated[dayName] = {
        ...prev[dayName],
        blocks: prev[dayName].blocks.map((b) =>
          b.id === blockId ? { ...b, done: !b.done } : b
        ),
      }
      return updated
    })
  }

  const completionStats = computeStats(schedule)

  return { schedule, toggleBlock, updateBlock, weekKey, completionStats }
}

function computeStats(schedule) {
  let total = 0
  let done = 0
  const byCategory = {}

  for (const dayName of DAYS_ORDER) {
    const day = schedule[dayName]
    if (!day) continue
    for (const block of day.blocks) {
      total++
      if (block.done) done++
      if (!byCategory[block.category]) byCategory[block.category] = { total: 0, done: 0 }
      byCategory[block.category].total++
      if (block.done) byCategory[block.category].done++
    }
  }

  const percentage = total === 0 ? 0 : Math.round((done / total) * 100)
  return { total, done, percentage, byCategory }
}
