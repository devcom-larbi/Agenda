import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const DEFAULTS = {
  title: 'Mon Agenda',
  tagline: "l'action d'aujourd'hui est le confort de demain.",
  notifBlocksEnabled: true,
  notifAdvanceMinutes: 5,
  notifBilanEnabled: true,
  notifBilanHour: 20,
  accentId: 'violet',
  customHex: null,
  customPresets: [],
  categoryColors: {},
  radiusId: 'rounded',
  fontId:   'sans',
}

const SettingsContext = createContext({
  settings: DEFAULTS,
  updateSetting: () => {},
  updateSettings: () => {},
  loading: true,
})

export function SettingsProvider({ userId, children }) {
  const [settings, setSettings] = useState(() => {
    const stored = {}
    try { Object.assign(stored, JSON.parse(localStorage.getItem('app-settings') || '{}')) } catch {}
    return { ...DEFAULTS, ...stored }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !supabase) {
      setLoading(false)
      return
    }

    supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.settings) {
          const merged = { ...DEFAULTS, ...data.settings }
          setSettings(merged)
          localStorage.setItem('app-settings', JSON.stringify(merged))
        }
        setLoading(false)
      })
  }, [userId])

  // Single key update
  function updateSetting(key, value) {
    return updateSettings({ [key]: value })
  }

  // Atomic multi-key update
  function updateSettings(newValues) {
    setSettings(prev => {
      const next = { ...prev, ...newValues }
      localStorage.setItem('app-settings', JSON.stringify(next))
      return next
    })
  }

  // Side effect: Persist to Supabase when settings change
  useEffect(() => {
    if (!userId || !supabase || loading) return

    const timer = setTimeout(() => {
      supabase
        .from('user_settings')
        .upsert(
          { user_id: userId, settings, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        .then(({ error }) => { if (error) console.error('Settings sync error:', error) })
    }, 1000) // Small debounce for DB persistence
    
    return () => clearTimeout(timer)
  }, [settings, userId, loading])

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
