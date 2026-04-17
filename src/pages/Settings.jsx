import { useState } from 'react'
import { ArrowLeft, Bell, Moon, Sun, User, ChevronRight, LogOut, Palette } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUserSettings } from '../hooks/useUserSettings'
import { useTheme } from '../hooks/useTheme'
import { ACCENT_PRESETS, RADIUS_PRESETS, FONT_PRESETS, applyTheme } from '../lib/theme'
import { cn } from '@/lib/utils'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

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
  const { settings, updateSetting } = useUserSettings(user?.id)

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark')
  useTheme(settings)

  function toggleDark(val) {
    setDarkMode(val)
    document.documentElement.classList.toggle('dark', val)
    localStorage.setItem('theme', val ? 'dark' : 'light')
    applyTheme({ accentId: settings.accentId, radiusId: settings.radiusId, fontId: settings.fontId, darkMode: val })
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

        {/* ── Personnalisation ──────────────────────────── */}
        <Section title="Personnalisation" icon={<Palette className="w-4 h-4" />}>

          {/* Couleur principale */}
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Couleur principale</p>
            <div className="grid grid-cols-5 gap-2.5">
              {ACCENT_PRESETS.map(preset => {
                const isActive = (settings.accentId || 'violet') === preset.id
                return (
                  <button
                    key={preset.id}
                    onClick={() => updateSetting('accentId', preset.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-150',
                      isActive ? 'border-foreground/30 bg-foreground/5 scale-105' : 'border-border hover:border-foreground/20'
                    )}
                    title={preset.label}
                  >
                    <div className="w-7 h-7 rounded-full shadow-sm" style={{ backgroundColor: preset.hex }} />
                    <span className="text-[9px] text-muted-foreground truncate w-full text-center">{preset.label}</span>
                  </button>
                )
              })}
            </div>
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
