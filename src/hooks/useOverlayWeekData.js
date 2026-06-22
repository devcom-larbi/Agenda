import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { DAYS_ORDER } from '../data/schedule'
import { usePlanning } from '../contexts/PlanningContext'

function getEmptyWeek() {
  const w = {}
  DAYS_ORDER.forEach(d => { w[d] = { label: d.charAt(0).toUpperCase() + d.slice(1), blocks: [] } })
  return w
}

function timeToMin(t) {
  const m = String(t?.start || t || '').match(/(\d{1,2})[h:](\d{0,2})/)
  return m ? parseInt(m[1]) * 60 + (parseInt(m[2]) || 0) : 9999
}

/**
 * Lecture seule multi-plannings (mode superposition). Chaque bloc est teinté de
 * la couleur de SON planning (block.color = couleur planning) et porte
 * planningId/planningName pour distinction. Aucune mutation ici.
 */
export function useOverlayWeekData(weekKey, visiblePlanningIds) {
  const { user } = useAuth()
  const { plannings, getPlanningColor } = usePlanning()
  const [schedule, setSchedule] = useState(getEmptyWeek())
  const [loading, setLoading] = useState(true)

  const idsKey = (visiblePlanningIds || []).join(',')

  useEffect(() => {
    const ids = visiblePlanningIds || []
    if (!user || !supabase || ids.length === 0) { setSchedule(getEmptyWeek()); setLoading(false); return }
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data } = await supabase.from('blocks').select('*')
        .eq('user_id', user.id).in('planning_id', ids).eq('week_key', weekKey)
      if (cancelled) return

      const wk = getEmptyWeek()
      const nameById = Object.fromEntries(plannings.map(p => [p.id, p.name]))
      ;(data || []).forEach(row => {
        if (!wk[row.day_name]) return
        wk[row.day_name].blocks.push({
          id: row.id, time: row.time, label: row.label, category: row.category,
          priority: row.priority, description: row.description, note: row.note || '',
          color: getPlanningColor(row.planning_id),   // teinte = couleur du planning
          emoji: row.emoji, done: row.done,
          planningId: row.planning_id,
          planningName: nameById[row.planning_id] || '',
        })
      })
      Object.keys(wk).forEach(d => { wk[d].blocks.sort((a, b) => timeToMin(a.time) - timeToMin(b.time)) })

      setSchedule(wk)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, user, idsKey])

  return { schedule, loading }
}
