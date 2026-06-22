import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getWeekKeyForOffset } from '../utils/dateUtils'
import { DAYS_ORDER } from '../data/schedule'

function emptyWeek() {
  const w = {}
  DAYS_ORDER.forEach(d => { w[d] = { label: d.charAt(0).toUpperCase() + d.slice(1), blocks: [] } })
  return w
}

export function useMultiWeekData(userId, weekCount = 8) {
  const [weeksData, setWeeksData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }

    async function load() {
      setLoading(true)
      const keys = Array.from({ length: weekCount }, (_, i) => ({
        key: getWeekKeyForOffset(-i),
        offset: -i,
      }))

      if (supabase) {
        const weekKeys = keys.map(k => k.key)
        // Source de vérité = table `blocks` (et non weekly_schedules qui n'est jamais écrite)
        const { data } = await supabase
          .from('blocks')
          .select('*')
          .eq('user_id', userId)
          .in('week_key', weekKeys)

        const map = {}
        data?.forEach(row => {
          if (!map[row.week_key]) map[row.week_key] = emptyWeek()
          const day = map[row.week_key][row.day_name]
          if (day) {
            day.blocks.push({
              id: row.id, time: row.time, label: row.label, category: row.category,
              priority: row.priority, description: row.description, note: row.note || '',
              color: row.color, emoji: row.emoji, done: row.done,
            })
          }
        })

        setWeeksData(keys.map(({ key, offset }) => ({
          weekKey: key,
          offset,
          schedule: map[key] || null,
        })))
      } else {
        setWeeksData(keys.map(({ key, offset }) => {
          const saved = localStorage.getItem(key + '_' + (userId || ''))
          return {
            weekKey: key,
            offset,
            schedule: saved ? JSON.parse(saved) : null,
          }
        }))
      }

      setLoading(false)
    }

    load()
  }, [userId, weekCount])

  return { weeksData, loading }
}
