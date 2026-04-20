import { useState, useEffect } from 'react'
import { ArrowLeft, Bell, Moon, Sun, User, ChevronRight, LogOut, Palette, Plus, X, Trash2, Volume2 } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUserSettings } from '../hooks/useUserSettings'
import { useTheme } from '../hooks/useTheme'
import { useCategories } from '../contexts/CategoriesContext'
import { ACCENT_PRESETS, RADIUS_PRESETS, FONT_PRESETS, applyTheme } from '../lib/theme'
import { cn } from '@/lib/utils'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { DEFAULT_CATEGORY_COLORS } from '../data/schedule'
import { hapticCheck } from '../lib/haptic'

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      }`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform duration-200 ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </button>
  )
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 px-5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SelectField({ value, options, onChange }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary transition-colors cursor-pointer"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

function Section({ title, icon, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-primary w-4 h-4">{icon}</span>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h2>
      </div>
      <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { settings, updateSetting, updateSettings } = useUserSettings(user?.id)
  const { allLabels, customCategories } = useCategories()

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark')
  useTheme(settings)

  // Local state for hex typing (avoids jitter and too many DB updates)
  const [localHex, setLocalHex] = useState(settings.customHex?.replace('#', '') || '')
  
  // Category customization state
  const [selectedCat, setSelectedCat] = useState(null) // null = editing primary accent
  const [catHex, setCatHex] = useState('')

  useEffect(() => {
    const handler = setTimeout(() => {
      const fullHex = localHex ? '#' + localHex : null
      // Race condition guard: only update if it's different AND wouldn't overwrite a preset selection
      if (fullHex !== settings.customHex) {
        if (!localHex || /^([0-9A-F]{3}|[0-9A-F]{6})$/i.test(localHex)) {
          updateSettings({ customHex: fullHex, accentId: fullHex ? 'custom' : settings.accentId })
        }
      }
    }, 600)
    return () => clearTimeout(handler)
  }, [localHex])

  // Debounce for category colors
  useEffect(() => {
    if (!selectedCat) return
    const handler = setTimeout(() => {
      const fullHex = catHex ? '#' + catHex : null
      const currentMap = settings.categoryColors || {}
      if (fullHex !== currentMap[selectedCat]) {
        if (!catHex || /^([0-9A-F]{3}|[0-9A-F]{6})$/i.test(catHex)) {
          updateSetting('categoryColors', { ...currentMap, [selectedCat]: fullHex })
        }
      }
    }, 600)
    return () => clearTimeout(handler)
  }, [catHex, selectedCat])

  // Sync back if settings change from elsewhere
  useEffect(() => {
    setLocalHex(settings.customHex?.replace('#', '') || '')
  }, [settings.customHex])

  // Sync category hex when selection changes
  useEffect(() => {
    if (selectedCat) {
      setCatHex(settings.categoryColors?.[selectedCat]?.replace('#', '') || '')
    }
  }, [selectedCat, settings.categoryColors?.[selectedCat]])

  function toggleDark(val) {
    setDarkMode(val)
    document.documentElement.classList.toggle('dark', val)
    localStorage.setItem('theme', val ? 'dark' : 'light')
    applyTheme({ accentId: settings.accentId, customHex: settings.customHex, radiusId: settings.radiusId, fontId: settings.fontId, darkMode: val })
  }

  async function handleLogout() {
    try { await supabase?.auth.signOut() } catch {}
    localStorage.clear()
    navigate('/login', { replace: true })
  }

  const notifBlocksEnabled = settings.notifBlocksEnabled ?? true
  const notifAdvanceMinutes = settings.notifAdvanceMinutes ?? 5
  const notifBilanEnabled = settings.notifBilanEnabled ?? true
  const notifBilanHour = settings.notifBilanHour ?? 20

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-xl mx-auto px-4 py-6 pb-16">

        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Retour</span>
        </button>

        <h1 className="text-2xl font-bold mb-8 text-foreground">Réglages</h1>

        {/* ── Notifications ─────────────────────────────── */}
        <Section title="Notifications" icon={<Bell className="w-4 h-4" />}>
          <SettingRow
            label="Rappels avant les blocs"
            description="Notif avant chaque événement non complété"
          >
            <Toggle
              checked={notifBlocksEnabled}
              onChange={v => updateSetting('notifBlocksEnabled', v)}
            />
          </SettingRow>

          {notifBlocksEnabled && (
            <SettingRow label="Délai avant le bloc">
              <SelectField
                value={notifAdvanceMinutes}
                options={[1, 5, 10, 15, 30].map(n => ({ value: n, label: `${n} min` }))}
                onChange={v => {
                  updateSetting('notifAdvanceMinutes', Number(v))
                  toast.success(`Rappel réglé à ${v} min avant`)
                }}
              />
            </SettingRow>
          )}

          <SettingRow
            label="Bilan quotidien"
            description="Rappel du soir pour valider tes blocs"
          >
            <Toggle
              checked={notifBilanEnabled}
              onChange={v => updateSetting('notifBilanEnabled', v)}
            />
          </SettingRow>

          {notifBilanEnabled && (
            <SettingRow label="Heure du bilan">
              <SelectField
                value={notifBilanHour}
                options={[17, 18, 19, 20, 21, 22, 23].map(h => ({ value: h, label: `${h}h00` }))}
                onChange={v => {
                  updateSetting('notifBilanHour', Number(v))
                  toast.success(`Bilan réglé à ${v}h00`)
                }}
              />
            </SettingRow>
          )}
        </Section>

        {/* ── Sons & Haptiques ──────────────────────────── */}
        <Section title="Sons & Haptiques" icon={<Volume2 className="w-4 h-4" />}>
          <SettingRow
            label="Son de validation"
            description="Bruit joué à la complétion d'un bloc/objectif"
          >
            <SelectField
              value={settings.soundId || 'pop'}
              options={[
                { value: 'pop', label: 'Bulle (Défaut)' },
                { value: 'click', label: 'Clic mécanique' },
                { value: 'swoosh', label: 'Swoosh (Doux)' },
                { value: 'none', label: 'Aucun (Silencieux)' }
              ]}
              onChange={v => {
                updateSetting('soundId', v)
                hapticCheck(v) // Teste le son immédiatement
              }}
            />
          </SettingRow>
        </Section>

        {/* ── Personnalisation ──────────────────────────── */}
        <Section title="Personnalisation" icon={<Palette className="w-4 h-4" />}>

          {/* Couleur principale */}
          <div className="px-5 py-4 space-y-4">
            <p className="text-sm font-medium text-foreground">Couleur principale</p>
            
            {/* Presets + Catalog */}
            <div className="grid grid-cols-5 gap-2.5">
              {/* Default Presets */}
              {ACCENT_PRESETS.map(preset => {
                const isActive = !settings.customHex && (settings.accentId || 'violet') === preset.id
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setLocalHex('')
                      updateSettings({
                        accentId: preset.id,
                        customHex: null
                      })
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-150',
                      isActive ? 'border-primary bg-primary/10 shadow-[0_0_12px_rgba(var(--primary-glow),0.2)] scale-105' : 'border-border hover:border-foreground/20'
                    )}
                    title={preset.label}
                  >
                    <div className="w-7 h-7 rounded-full shadow-sm" style={{ backgroundColor: preset.hex }} />
                    <span className="text-[9px] text-muted-foreground truncate w-full text-center">{preset.label}</span>
                  </button>
                )
              })}

              {/* Custom Presets (Catalog) */}
              {(settings.customPresets || []).map(preset => {
                const isActive = settings.customHex === preset.hex
                return (
                  <div key={preset.id} className="relative group/preset">
                    <button
                      onClick={() => {
                        setLocalHex(preset.hex.replace('#', ''))
                        updateSettings({
                          customHex: preset.hex,
                          accentId: 'custom'
                        })
                      }}
                      className={cn(
                        'w-full flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-150',
                        isActive ? 'border-primary bg-primary/10 shadow-[0_0_12px_rgba(var(--primary-glow),0.2)] scale-105' : 'border-border hover:border-foreground/20'
                      )}
                    >
                      <div className="w-7 h-7 rounded-full shadow-sm" style={{ backgroundColor: preset.hex }} />
                      <span className="text-[9px] text-muted-foreground truncate w-full text-center">Favori</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const newPresets = settings.customPresets.filter(p => p.id !== preset.id)
                        updateSetting('customPresets', newPresets)
                      }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/preset:opacity-100 transition-opacity shadow-sm"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Custom Hex & Save to Catalog */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <input
                    type="color"
                    value={settings.customHex || '#7c5bf5'}
                    onChange={e => {
                      const hex = e.target.value.toLowerCase()
                      setLocalHex(hex.replace('#', ''))
                      applyTheme({ ...settings, customHex: hex, darkMode: document.documentElement.classList.contains('dark') })
                    }}
                    className="w-10 h-10 rounded-lg cursor-pointer border-2 border-border hover:border-primary transition-colors bg-card"
                  />
                  <div className="absolute inset-0 rounded-lg pointer-events-none border border-black/5" />
                </div>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">#</span>
                  <input
                    type="text"
                    placeholder="7c5bf5"
                    value={localHex}
                    onChange={e => {
                      const val = e.target.value.trim().replace('#', '')
                      if (val.length <= 6) {
                        setLocalHex(val)
                        const fullHex = val ? '#' + val : null
                        if (fullHex && /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(fullHex)) {
                           applyTheme({ ...settings, customHex: fullHex, darkMode: document.documentElement.classList.contains('dark') })
                        }
                      }
                    }}
                    className="w-full bg-muted/50 border border-border rounded-lg pl-6 pr-3 py-2 text-sm font-mono focus:border-primary outline-none transition-colors"
                  />
                </div>
                
                {/* Add to Catalog Button */}
                {localHex && /^([0-9A-F]{3}|[0-9A-F]{6})$/i.test(localHex) && (
                  <button
                    onClick={() => {
                      const hex = '#' + localHex.toLowerCase()
                      const exists = (settings.customPresets || []).find(p => p.hex === hex)
                      if (!exists) {
                        const newPreset = { id: 'custom-' + Date.now(), hex, label: 'Favori' }
                        updateSetting('customPresets', [...(settings.customPresets || []), newPreset])
                        toast.success('Couleur ajoutée au catalogue !')
                      } else {
                        toast.error('Cette couleur est déjà dans tes favoris')
                      }
                    }}
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm group"
                    title="Ajouter au catalogue"
                  >
                    <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                )}

                {(settings.customHex || localHex) && (
                  <button
                    onClick={() => {
                      setLocalHex('')
                      updateSetting('customHex', null)
                    }}
                    className="text-[10px] text-primary font-medium hover:underline"
                  >
                    Rétablir
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Couleurs des catégories */}
          <div className="px-5 py-5 border-t border-border/50 bg-muted/5">
            <p className="text-sm font-medium text-foreground mb-4">Couleurs des catégories</p>
            
            {/* Horizontal list of categories */}
            <div className="flex gap-2 overflow-x-auto pb-4 -mx-1 px-1 no-scrollbar">
              {Object.entries(allLabels).map(([key, label]) => {
                const customColor = settings.categoryColors?.[key]
                const color = customColor || DEFAULT_CATEGORY_COLORS[key] || '#94a3b8'
                const isEditing = selectedCat === key
                
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedCat(isEditing ? null : key)
                      setCatHex(customColor?.replace('#', '') || '')
                    }}
                    className={cn(
                      'shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200',
                      isEditing ? 'border-primary bg-primary/10 shadow-sm scale-105' : 'border-border bg-card hover:border-foreground/20'
                    )}
                  >
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                    <span className="text-xs font-medium whitespace-nowrap">{label}</span>
                  </button>
                )
              })}
            </div>

            {/* Picker for selected category */}
            {selectedCat && (
              <div className="mt-4 p-4 rounded-2xl bg-muted/40 border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-4">
                   <p className="text-xs font-bold text-primary uppercase tracking-widest">Édition : {allLabels[selectedCat]}</p>
                   <button onClick={() => setSelectedCat(null)} className="text-muted-foreground hover:text-foreground">
                     <X className="w-4 h-4" />
                   </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <input
                      type="color"
                      value={settings.categoryColors?.[selectedCat] || DEFAULT_CATEGORY_COLORS[selectedCat] || '#94a3b8'}
                      onChange={e => {
                        const hex = e.target.value.toLowerCase()
                        setCatHex(hex.replace('#', ''))
                        const currentMap = settings.categoryColors || {}
                        updateSetting('categoryColors', { ...currentMap, [selectedCat]: hex })
                      }}
                      className="w-10 h-10 rounded-lg cursor-pointer border-2 border-border hover:border-primary transition-colors bg-card"
                    />
                  </div>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">#</span>
                    <input
                      type="text"
                      placeholder="Hex code..."
                      value={catHex}
                      onChange={e => {
                        const val = e.target.value.trim().replace('#', '')
                        if (val.length <= 6) setCatHex(val)
                      }}
                      className="w-full bg-muted/50 border border-border rounded-lg pl-6 pr-3 py-2 text-sm font-mono focus:border-primary outline-none transition-colors"
                    />
                  </div>
                  
                  {/* Share the same catalog logic */}
                  {catHex && /^([0-9A-F]{3}|[0-9A-F]{6})$/i.test(catHex) && (
                    <button
                      onClick={() => {
                        const hex = '#' + catHex.toLowerCase()
                        const exists = (settings.customPresets || []).find(p => p.hex === hex)
                        if (!exists) {
                          const newPreset = { id: 'custom-' + Date.now(), hex, label: 'Favori' }
                          updateSetting('customPresets', [...(settings.customPresets || []), newPreset])
                          toast.success('Couleur ajoutée au catalogue !')
                        }
                      }}
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/10 hover:bg-primary hover:text-white transition-all shadow-sm"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Catalog shortcuts for categories */}
                {(settings.customPresets?.length > 0) && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/30">
                    <p className="w-full text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Tes favoris</p>
                    {settings.customPresets.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          const currentMap = settings.categoryColors || {}
                          updateSetting('categoryColors', { ...currentMap, [selectedCat]: preset.hex })
                          setCatHex(preset.hex.replace('#', ''))
                        }}
                        className={cn(
                          'w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 active:scale-95',
                          settings.categoryColors?.[selectedCat] === preset.hex ? 'border-primary' : 'border-transparent'
                        )}
                        style={{ backgroundColor: preset.hex }}
                        title={preset.hex}
                      />
                    ))}
                  </div>
                )}
                
                <button
                  onClick={() => {
                    const currentMap = { ...settings.categoryColors }
                    delete currentMap[selectedCat]
                    updateSetting('categoryColors', currentMap)
                    setCatHex('')
                  }}
                  className="mt-4 text-[10px] text-muted-foreground hover:text-primary transition-colors font-medium underline underline-offset-4"
                >
                  Réinitialiser la couleur par défaut
                </button>
              </div>
            )}
          </div>

          {/* Rayon des cartes */}
          <div className="px-5 py-4 border-t border-border/50 space-y-3">
            <p className="text-sm font-medium text-foreground">Style des coins</p>
            <div className="grid grid-cols-4 gap-2">
              {RADIUS_PRESETS.map(preset => {
                const isActive = (settings.radiusId || 'rounded') === preset.id
                return (
                  <button
                    key={preset.id}
                    onClick={() => updateSetting('radiusId', preset.id)}
                    className={cn(
                      'flex flex-col items-center gap-2 py-3 px-2 border transition-all duration-150',
                      isActive ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-foreground/20'
                    )}
                    style={{ borderRadius: preset.value }}
                  >
                    <div className="w-8 h-8 border-2 border-current" style={{ borderRadius: preset.value }} />
                    <span className="text-[10px] font-medium">{preset.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Typographie */}
          <div className="px-5 py-4 border-t border-border/50 space-y-3">
            <p className="text-sm font-medium text-foreground">Typographie</p>
            <div className="flex gap-2">
              {FONT_PRESETS.map(preset => {
                const isActive = (settings.fontId || 'sans') === preset.id
                return (
                  <button
                    key={preset.id}
                    onClick={() => updateSetting('fontId', preset.id)}
                    className={cn(
                      'flex-1 py-3 rounded-xl border text-center transition-all duration-150',
                      isActive ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-foreground/20'
                    )}
                  >
                    <p className="text-base font-bold leading-none mb-1" style={{ fontFamily: preset.value }}>Aa</p>
                    <p className="text-[9px]">{preset.label}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </Section>

        {/* ── Apparence ─────────────────────────────────── */}
        <Section title="Apparence" icon={darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}>
          <SettingRow label="Mode sombre">
            <Toggle checked={darkMode} onChange={toggleDark} />
          </SettingRow>
        </Section>

        {/* ── Compte ────────────────────────────────────── */}
        <Section title="Compte" icon={<User className="w-4 h-4" />}>
          <div className="px-5 py-4">
            <p className="text-xs text-muted-foreground mb-0.5">Connecté en tant que</p>
            <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
          </div>

          <Link
            to="/privacy"
            className="flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm text-foreground">Politique de confidentialité</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-500/5 transition-colors text-left"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400 font-medium">Se déconnecter</span>
          </button>
        </Section>

      </div>
    </div>
  )
}
