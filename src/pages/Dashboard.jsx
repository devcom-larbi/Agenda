import { useState, useRef, useEffect, useMemo } from 'react'
import { Moon, Sun, LogOut, ChevronLeft, ChevronRight, Copy, Search, Bell, BellRing, BellOff, Download, Settings, MoreVertical, Menu } from 'lucide-react'
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
import DayView from '../components/DayView'
import PanoramaView from '../components/PanoramaView'
import BilanView from '../components/BilanView'
import GoalsView from '../components/GoalsView'
import FloatingChat from '../components/FloatingChat'
import WeekSummary from '../components/WeekSummary'
import SearchDrawer from '../components/SearchDrawer'
import { getTodayFormatted, getWeekKeyForOffset, getOffsetForWeekKey, getCurrentDayName, getWeekDatesForKey } from '../utils/dateUtils'
import { useTheme } from '../hooks/useTheme'
import { getWeekDateRange } from '../utils/monthUtils'
import { DAYS_ORDER } from '../data/schedule'
import { toast } from 'sonner'
import { deepEqual } from '@/lib/utils'
import { useGoals } from '../hooks/useGoals'
import { parseNoteForGoals } from '../lib/ai'

export default function Dashboard() {
  const { user } = useAuth()

  // Navigation semaines
  const [weekOffset, setWeekOffset] = useState(0)
  const weekKey = getWeekKeyForOffset(weekOffset)
  const isCurrentWeek = weekOffset === 0

  const { schedule, templateLoaded, toggleBlock, addBlock, deleteBlock, updateBlock, replaceSchedule, markBlockRecurring, copyWeekTo, completionStats} = useWeekStorage(user?.id, weekKey)
  const { settings, updateSetting } = useUserSettings(user?.id)
  useTheme(settings)
  const navigate = useNavigate()
  const { permission, requestPermission } = useNotifications(schedule, settings)
  const { canInstall, install } = useInstallPrompt()

  const [activeTab, setActiveTab] = useState('day')
  const [searchOpen, setSearchOpen] = useState(false)
  const [dayInitIndex, setDayInitIndex] = useState(undefined)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)

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

  const { goals, setExactValue } = useGoals(user?.id)

  function handleUpdateBlock(dayName, blockId, updates) {
    updateBlock(dayName, blockId, updates)
    if (updates.description !== undefined) {
      const parsed = parseNoteForGoals(updates.description, goals)
      parsed.forEach(({ goalId, value }) => setExactValue(goalId, value))
    }
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
      <div className="flex-1 flex flex-col overflow-hidden max-w-screen-2xl w-full mx-auto px-4 pt-2 md:px-8 md:pt-3">

        {/* ── Header éditorial ─────────────────────────────────── */}
        <header className="mb-1 shrink-0">
          <div className="flex items-center justify-between gap-2">
            {/* Titre + date */}
            <div className="min-w-0">
              {editingTitle ? (
                <input ref={titleInputRef} value={draftTitle} onChange={e => setDraftTitle(e.target.value)}
                  onBlur={handleTitleSave} onKeyDown={onTitleKey}
                  className="font-sans text-lg font-bold tracking-tight bg-transparent border-b border-primary outline-none max-w-[160px] text-foreground pb-0.5" maxLength={30} />
              ) : (
                <button onClick={handleTitleClick} className="group text-left">
                  <h1 className="font-sans text-lg font-bold tracking-tight text-foreground group-hover:opacity-80 transition-opacity duration-200">
                    {settings.title}
                  </h1>
                </button>
              )}
              <p className="font-sans text-xs text-muted-foreground capitalize leading-none mt-0.5">
                {todayFormatted}
              </p>
            </div>

            {/* Actions & Navigation Hamburger */}
            <div className="flex items-center gap-0 flex-shrink-0">
              <Button variant="ghost" size="icon" aria-label="Basculer le thème" onClick={() => setDarkMode(d => !d)} className="text-muted-foreground-2 hover:text-foreground h-7 w-7" title="Basculer le thème">
                {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" aria-label="Réglages" onClick={() => navigate('/settings')} className="text-muted-foreground-2 hover:text-foreground h-7 w-7" title="Réglages">
                <Settings className="h-3.5 w-3.5" />
              </Button>
              <div className="relative">
                <Button variant="ghost" size="icon" aria-label="Plus d'actions" onClick={() => setHeaderMenuOpen(o => !o)} className="text-muted-foreground-2 hover:text-foreground h-7 w-7" title="Plus">
                  <Menu className="h-4 w-4" />
                </Button>
                {headerMenuOpen && (
                  <div className="absolute top-10 right-0 w-48 bg-card border border-border rounded-[var(--radius)] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wide border-b border-border/40">Navigation</div>
                    <button onClick={() => { setActiveTab('day'); setHeaderMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-muted transition-colors font-medium">Jour</button>
                    <button onClick={() => { setActiveTab('panorama'); setHeaderMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-muted transition-colors font-medium">Panorama</button>
                    <button onClick={() => { setActiveTab('objectifs'); setHeaderMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-muted transition-colors font-medium">Objectifs</button>
                    <button onClick={() => { setActiveTab('bilan'); setHeaderMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-muted transition-colors font-medium border-b border-border/40">Bilan</button>
                    
                    {canInstall && (
                      <button onClick={() => { install(); setHeaderMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left hover:bg-muted transition-colors border-b border-border/40">
                        <Download className="h-3.5 w-3.5 text-primary shrink-0" />
                        Installer l'application
                      </button>
                    )}
                    <button onClick={() => { setSearchOpen(true); setHeaderMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left hover:bg-muted transition-colors border-b border-border/40">
                      <Search className="h-3.5 w-3.5 shrink-0" />
                      Rechercher (Ctrl+K)
                    </button>
                    <button onClick={() => { if (permission === 'default') requestPermission(); setHeaderMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left hover:bg-muted transition-colors">
                      {permission === 'granted' ? <BellRing className="h-3.5 w-3.5 text-green-500 shrink-0" /> : permission === 'denied' ? <BellOff className="h-3.5 w-3.5 text-red-500 shrink-0" /> : <Bell className="h-3.5 w-3.5 shrink-0" />}
                      {permission === 'granted' ? 'Notifs activées' : 'Activer les notifs'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ── Split-Screen Layout ───────────── */}
        <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">
          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <div className="shrink-0 flex items-center justify-end mb-1 gap-3 flex-wrap text-sm text-muted-foreground">
                {/* Navigation semaines — masquée en vue jour (intégrée dans DayView) */}
                {activeTab !== 'bilan' && activeTab !== 'objectifs' && activeTab !== 'day' && (
                  <div className="flex items-center gap-1.5 pb-1">
                    <button aria-label="Semaine précédente" className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground-2 hover:text-foreground transition-colors" onClick={() => { setWeekOffset(o => o - 1); setDayInitIndex(undefined) }}>
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-mono text-micro uppercase tracking-widest text-muted-foreground-2 min-w-[110px] text-center">
                      {isCurrentWeek ? 'Cette semaine' : getWeekDateRange(weekKey)}
                    </span>
                    <button aria-label="Semaine suivante" className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground-2 hover:text-foreground transition-colors" onClick={() => { setWeekOffset(o => o + 1); setDayInitIndex(undefined) }}>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    {!isCurrentWeek && (
                      <button aria-label="Aller à aujourd'hui" className="font-mono text-micro uppercase tracking-widest text-primary hover:text-primary/70 transition-colors px-1.5" onClick={() => { setWeekOffset(0); setDayInitIndex(undefined) }}>
                        Auj.
                      </button>
                    )}
                    <button aria-label="Copier vers semaine suivante" className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground-2 hover:text-foreground transition-colors" title="Copier vers semaine suivante" onClick={handleCopyWeek}>
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <TabsContent value="day" className="flex-1 overflow-y-auto pb-24 lg:pb-6">
                <DayView key={weekKey} schedule={schedule} onToggle={toggleBlock} onUpdate={handleUpdateBlock} weekKey={weekKey}
                  onAdd={addBlock} onDelete={deleteBlock}
                  initialDayIndex={dayInitIndex}
                  onNextWeek={() => { setWeekOffset(o => o + 1); setDayInitIndex(0) }}
                  onPrevWeek={() => { setWeekOffset(o => o - 1); setDayInitIndex(6) }}
                  isCurrentWeek={isCurrentWeek}
                  weekLabel={isCurrentWeek ? 'Cette sem.' : getWeekDateRange(weekKey)}
                  onCopyWeek={handleCopyWeek}
                  onGoToToday={() => { setWeekOffset(0); setDayInitIndex(undefined) }} />
              </TabsContent>
              <TabsContent value="panorama" className="flex-1 overflow-y-auto pb-24 lg:pb-6">
                <PanoramaView key={weekKey} schedule={schedule} weekKey={weekKey} changedDays={changedDays}
                  onToggle={toggleBlock} onUpdate={handleUpdateBlock}
                  onAdd={addBlock} onDelete={deleteBlock}
                  onMarkRecurring={(day, id, val) => markBlockRecurring(day, id, val)}
                  onSelectWeek={handleSelectWeek} />
              </TabsContent>
              <TabsContent value="objectifs" className="flex-1 overflow-y-auto pb-24 lg:pb-6">
                <GoalsView userId={user?.id} />
              </TabsContent>
              <TabsContent value="bilan" className="flex-1 overflow-y-auto pb-24 lg:pb-6">
                <BilanView schedule={schedule} weekKey={weekKey} userId={user?.id} />
              </TabsContent>
            </Tabs>
          </main>

          <aside className="hidden lg:block w-full lg:w-[300px] xl:w-[340px] shrink-0 overflow-y-auto py-1">
            <div className="border-l border-border/40 pl-8">
              <div className="flex items-baseline gap-3 mb-5">
                <h2 className="font-sans font-semibold text-lg text-foreground">Bilan</h2>
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40">semaine</span>
              </div>
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
        onNavigate={setActiveTab}
      />
    </div>
    </CategoriesProvider>
  )
}
