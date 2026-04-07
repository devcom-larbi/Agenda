import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULTS = {
  title: 'Mon Agenda',
  tagline: "l'action d'aujourd'hui est le confort de demain.",
}

/**
 * Persiste le titre et la tagline dans Supabase (user_settings).
 * Charge d'abord depuis localStorage pour un affichage instantané,
 * puis écrase avec les données Supabase si disponibles.
 */
export function useUserSettings(userId) {
  const [settings, setSettings] = useState(() => ({
    title: localStorage.getItem('app-title') || DEFAULTS.title,
    tagline: localStorage.getItem('app-tagline') || DEFAULTS.tagline,
  }))

  useEffect(() => {
    if (!userId || !supabase) return

    supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.settings) {
          setSettings(s => ({ ...s, ...data.settings }))
          // Sync localStorage comme fallback
          if (data.settings.title) localStorage.setItem('app-title', data.settings.title)
          if (data.settings.tagline) localStorage.setItem('app-tagline', data.settings.tagline)
        }
      })
  }, [userId])

  async function updateSetting(key, value) {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('app-' + key, value)

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
