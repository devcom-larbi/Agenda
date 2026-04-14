import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getWeekKeyForOffset } from '../utils/dateUtils'

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
        const { data } = await supabase
          .from('weekly_schedules')
          .select('week_key, schedule_data')
          .eq('user_id', userId)
          .in('week_key', weekKeys)

        const map = {}
        data?.forEach(row => { map[row.week_key] = row.schedule_data })

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
