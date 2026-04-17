import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULTS = {
  title: 'Mon Agenda',
  tagline: "l'action d'aujourd'hui est le confort de demain.",
  notifBlocksEnabled: true,
  notifAdvanceMinutes: 5,
  notifBilanEnabled: true,
  notifBilanHour: 20,
  accentId: 'violet',
  radiusId: 'rounded',
  fontId:   'sans',
}

/**
 * Persiste le titre et la tagline dans Supabase (user_settings).
 * Charge d'abord depuis localStorage pour un affichage instantané,
 * puis écrase avec les données Supabase si disponibles.
 */
export function useUserSettings(userId) {
  const [settings, setSettings] = useState(() => {
    const stored = {}
    try { Object.assign(stored, JSON.parse(localStorage.getItem('app-settings') || '{}')) } catch {}
    return { ...DEFAULTS, ...stored }
  })

  useEffect(() => {
    if (!userId || !supabase) return

    supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.settings) {
          setSettings(s => ({ ...DEFAULTS, ...s, ...data.settings }))
          localStorage.setItem('app-settings', JSON.stringify({ ...DEFAULTS, ...data.settings }))
        }
      })
  }, [userId])

  async function updateSetting(key, value) {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('app-settings', JSON.stringify(newSettings))

    if (!supabase || !userId) return

    await supabase
      .from('user_settings')
      .upsert(
        { user_id: userId, settings: newSettings, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
  }

  return { settings, updateSetting }
}
