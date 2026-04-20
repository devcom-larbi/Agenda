import { useSettings } from '../contexts/SettingsContext'

/**
 * Legacy wrapper for SettingsContext to avoid breaking existing imports.
 * Now uses global state instead of per-instance state.
 */
export function useUserSettings(userId) {
  const { settings, updateSetting, updateSettings, loading } = useSettings()
  return { settings, updateSetting, updateSettings, loading }
}
