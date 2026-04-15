import { useState, useRef, useEffect, useMemo } from 'react'
import { Moon, Sun, LogOut, ChevronLeft, ChevronRight, Copy, Search, Bell, BellRing, BellOff, Download, Settings } from 'lucide-react'
import { useWeekStorage } from '../hooks/useWeekStorage'
import { useUserSettings } from '../hooks/useUserSettings'
import { useNotifications } from '../hooks/useNotifications'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CategoriesProvider } from '../contexts/CategoriesContext'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import DayView from '../components/DayView'
import PanoramaView from '../components/PanoramaView'
import BilanView from '../components/BilanView'
import FloatingChat from '../components/FloatingChat'
import WeekSummary from '../components/WeekSummary'
import SearchDrawer from '../components/SearchDrawer'
import { getTodayFormatted, getWeekKeyForOffset, getOffsetForWeekKey, getCurrentDayName, getWeekDatesForKey } from '../utils/dateUtils'
import { getWeekDateRange } from '../utils/monthUtils'
import { DAYS_ORDER } from '../data/schedule'
import { toast } from 'sonner'

// DeepEqual robuste (résout le bug d'ordre des clés JSON.stringify)
function deepEqual(a, b) {
  if (a === b) return true
  if (typeof a !== typeof b || typeof a !== 'object' || a === null || b === null) return a === b
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false
    return a.every((v, i) => deepEqual(v, b[i]))
  }
  const keysA = Object.keys(a).sort()
  const keysB = Object.keys(b).sort()
  if (keysA.join(',') !== keysB.join(',')) return false
  return keysA.every(k => deepEqual(a[k], b[k]))
}

export default function Dashboard() {
  const { user } = useAuth()

  // Navigation semaines
  const [weekOffset, setWeekOffset] = useState(0)
  const weekKey = getWeekKeyForOffset(weekOffset)
  const isCurrentWeek = weekOffset === 0

  const { schedule, templateLoaded, toggleBlock, addBlock, deleteBlock, updateBlock, replaceSchedule, markBlockRecurring, copyWeekTo, completionStats } = useWeekStorage(user?.id, weekKey)
  const { settings, updateSetting } = useUserSettings(user?.id)
  const navigate = useNavigate()
  const { permission, requestPermission } = useNotifications(schedule, settings)
  const { canInstall, install } = useInstallPrompt()

  const [activeTab, setActiveTab] = useState('day')
  const [searchOpen, setSearchOpen] = useState(false)
  const [dayInitIndex, setDayInitIndex] = useState(undefined)

  function handleSelectWeek(wk) {
    setWeekOffset(getOffsetForWeekKey(wk))
    setActiveTab('panorama')
  }

  // Jours modifiés par l'IA (highlight 3s)
  const [changedDays, setChangedDays] = useState(new Set())

  async function handleCopyWeek() {
    const nextKey = getWeekKeyForOffset(weekOffset + 1)
    await copyWeekTo(nextKey)
    toast.success('Semaine copiée vers la suivante !')
  }

  function handleScheduleUpdate(newSchedule) {
    const days = Object.keys(newSchedule).filter(k => !deepEqual(newSchedule[k], schedule[k]))
    replaceSchedule(newSchedule)
    if (days.length > 0) {
      setChangedDays(new Set(days))
      setTimeout(() => setChangedDays(new Set()), 3000)
    }
  }

  // Blocs non complétés des jours passés cette semaine
  const missedBlocks = useMemo(() => {
    const todayIdx = DAYS_ORDER.indexOf(getCurrentDayName())
    if (todayIdx <= 0) return []
    return DAYS_ORDER
      .slice(0, todayIdx)
      .flatMap(day => (schedule[day]?.blocks ?? [])
        .filter(b => !b.done)
        .map(b => ({ ...b, day, dayLabel: schedule[day].label }))
      ).slice(0, 5)
  }, [schedule])

  // Thème
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // Titre éditable
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const titleInputRef = useRef(null)
  function handleTitleClick() {
    setDraftTitle(settings.title)
    setEditingTitle(true)
    setTimeout(() => titleInputRef.current?.select(), 0)
  }
  function handleTitleSave() {
    const final = draftTitle.trim() || 'Mon Agenda'
    updateSetting('title', final)
    setEditingTitle(false)
  }
  function onTitleKey(e) {
    if (e.key === 'Enter') handleTitleSave()
    if (e.key === 'Escape') setEditingTitle(false)
  }

  // Tagline éditable
  const [editingTagline, setEditingTagline] = useState(false)
  const [draftTagline, setDraftTagline] = useState('')
  const taglineInputRef = useRef(null)
  function handleTaglineClick() {
    setDraftTagline(settings.tagline)
    setEditingTagline(true)
    setTimeout(() => taglineInputRef.current?.select(), 0)
  }
  function handleTaglineSave() {
    const final = draftTagline.trim() || "l'action d'aujourd'hui est le confort de demain."
    updateSetting('tagline', final)
    setEditingTagline(false)
  }
  function onTaglineKey(e) {
    if (e.key === 'Enter') handleTaglineSave()
    if (e.key === 'Escape') setEditingTagline(false)
  }

  const todayFormatted = getTodayFormatted()
  const weekDates = getWeekDatesForKey(weekKey)

  if (!templateLoaded) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground text-sm animate-pulse">Chargement de ton agenda...</p>
    </div>
  )

  return (
    <CategoriesProvider userId={user?.id}>
    <div className="h-dvh flex flex-col overflow-hidden bg-background">
      <div className="flex-1 flex flex-col overflow-hidden max-w-screen-2xl w-full mx-auto px-4 pt-5 md:px-8 md:pt-6">

        {/* ── Header ──────────────────────────────────── */}
        <header className="mb-6 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {editingTitle ? (
                <input ref={titleInputRef} value={draftTitle} onChange={e => setDraftTitle(e.target.value)}
                  onBlur={handleTitleSave} onKeyDown={onTitleKey}
                  className="text-xl font-semibold bg-transparent border-b border-primary outline-none max-w-[200px] text-foreground" maxLength={30} />
              ) : (
                <button onClick={handleTitleClick} className="group flex items-center gap-1.5 text-left">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground">{settings.title}</h1>
                  <span className="opacity-0 group-hover:opacity-40 transition-opacity text-foreground text-xs">✎</span>
                </button>
              )}
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">{todayFormatted}</p>
            </div>

            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="flex items-center gap-1">
                {canInstall && (
                  <Button variant="ghost" size="icon" onClick={install} className="h-7 w-7 text-muted-foreground" title="Installer l'application">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => permission === 'default' ? requestPermission() : null} className="h-7 w-7 text-muted-foreground" title={permission === 'granted' ? "Notifications activées" : "Activer les notifications"}>
                  {permission === 'granted' ? <BellRing className="h-3.5 w-3.5 text-primary" /> : permission === 'denied' ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5 relative"><span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span><span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full"></span></Bell>}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} className="h-7 w-7 text-muted-foreground" title="Rechercher">
                  <Search className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDarkMode(d => !d)} className="h-7 w-7 text-muted-foreground">
                  {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} className="h-7 w-7 text-muted-foreground" title="Réglages">
                  <Settings className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => supabase?.auth.signOut()} className="h-7 w-7 text-muted-foreground hover:text-red-400">
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
              {editingTagline ? (
                <input ref={taglineInputRef} value={draftTagline} onChange={e => setDraftTagline(e.target.value)}
                  onBlur={handleTaglineSave} onKeyDown={onTaglineKey}
                  className="text-xs italic text-muted-foreground bg-transparent border-b border-primary outline-none text-right w-64" maxLength={80} />
              ) : (
                <button onClick={handleTaglineClick} className="group flex items-center gap-1 text-right">
                  <span className="text-xs italic text-muted-foreground group-hover:text-foreground transition-colors max-w-[250px] text-right">{settings.tagline}</span>
                  <span className="opacity-0 group-hover:opacity-40 transition-opacity text-foreground text-xs flex-shrink-0">✎</span>
                </button>
              )}
            </div>
          </div>
          <Separator className="mt-4" />
        </header>

        {/* ── Split-Screen Layout ───────────── */}
        <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">
          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <div className="shrink-0 flex items-center justify-between mb-4 gap-3 flex-wrap">
                <TabsList>
                  <TabsTrigger value="day">Jour</TabsTrigger>
                  <TabsTrigger value="panorama">Panorama</TabsTrigger>
                  <TabsTrigger value="bilan">Bilan</TabsTrigger>
                </TabsList>

                {/* Navigation semaines — masquée sur Bilan */}
                {activeTab !== 'bilan' && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => { setWeekOffset(o => o - 1); setDayInitIndex(undefined) }}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs text-muted-foreground min-w-[130px] text-center">
                      {isCurrentWeek ? 'Cette semaine' : getWeekDateRange(weekKey)}
                    </span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => { setWeekOffset(o => o + 1); setDayInitIndex(undefined) }}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    {!isCurrentWeek && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-primary px-2" onClick={() => { setWeekOffset(0); setDayInitIndex(undefined) }}>
                        Aujourd'hui
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" title="Copier vers semaine suivante" onClick={handleCopyWeek}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <TabsContent value="day" className="flex-1 overflow-y-auto pb-24 lg:pb-6">
                <DayView key={weekKey} schedule={schedule} onToggle={toggleBlock} onUpdate={updateBlock} weekKey={weekKey}
                  onAdd={addBlock} onDelete={deleteBlock}
                  onMarkRecurring={(day, id, val) => markBlockRecurring(day, id, val)}
                  initialDayIndex={dayInitIndex}
                  onNextWeek={() => { setWeekOffset(o => o + 1); setDayInitIndex(0) }}
                  onPrevWeek={() => { setWeekOffset(o => o - 1); setDayInitIndex(6) }} />
              </TabsContent>
              <TabsContent value="panorama" className="flex-1 overflow-y-auto pb-24 lg:pb-6">
                <PanoramaView key={weekKey} schedule={schedule} weekKey={weekKey} changedDays={changedDays}
                  onToggle={toggleBlock} onUpdate={updateBlock}
                  onAdd={addBlock} onDelete={deleteBlock}
                  onMarkRecurring={(day, id, val) => markBlockRecurring(day, id, val)}
                  onSelectWeek={handleSelectWeek} />
              </TabsContent>
              <TabsContent value="bilan" className="flex-1 overflow-y-auto pb-24 lg:pb-6">
                <BilanView schedule={schedule} weekKey={weekKey} userId={user?.id} />
              </TabsContent>
            </Tabs>
          </main>

          <aside className="hidden lg:block w-full lg:w-[320px] xl:w-[380px] shrink-0 overflow-y-auto py-1">
            <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-2xl">
              <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent mb-6 text-center">Bilan de la Semaine</h2>
              <WeekSummary stats={completionStats} />
            </div>
          </aside>
        </div>
      </div>

      {/* ── Search Drawer ────────── */}
      {searchOpen && (
        <SearchDrawer
          userId={user?.id}
          onSelectWeek={(wk) => { setWeekOffset(getOffsetForWeekKey(wk)); setActiveTab('panorama') }}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {/* ── Coach IA flottant ────────── */}
      <FloatingChat
        schedule={schedule}
        weekDates={weekDates}
        missedBlocks={missedBlocks}
        userId={user?.id}
        onScheduleUpdate={handleScheduleUpdate}
      />
    </div>
    </CategoriesProvider>
  )
}
