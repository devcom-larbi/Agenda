import { useEffect } from 'react'
import { applyTheme } from '../lib/theme'

export function useTheme(settings) {
  useEffect(() => {
    if (!settings) return
    const darkMode = document.documentElement.classList.contains('dark')
    applyTheme({
      accentId: settings.accentId,
      radiusId: settings.radiusId,
      fontId:   settings.fontId,
      darkMode,
    })
  }, [settings?.accentId, settings?.radiusId, settings?.fontId])

  // Aussi réappliquer quand dark mode change (MutationObserver sur classList)
  useEffect(() => {
    if (!settings) return
    const obs = new MutationObserver(() => {
      const darkMode = document.documentElement.classList.contains('dark')
      applyTheme({ accentId: settings.accentId, radiusId: settings.radiusId, fontId: settings.fontId, darkMode })
    })
    obs.observe(document.documentElement, { attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [settings?.accentId, settings?.radiusId, settings?.fontId])
}
