import { useState, useEffect, useMemo } from 'react'
import { Moon, Sun, ChevronLeft, ChevronRight, Copy, Search, Bell, BellRing, BellOff, Download, Settings, Calendar, CalendarDays, Sparkles, Target, BarChart2, Plus, List, Clock, PanelRight } from 'lucide-react'
import TempoOrb from '../components/TempoOrb'
import { useWeekStorage } from '../hooks/useWeekStorage'
import { useUserSettings } from '../hooks/useUserSettings'
import { useNotifications } from '../hooks/useNotifications'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CategoriesProvider } from '../contexts/CategoriesContext'
import DayView from '../components/DayView'
import PanoramaView from '../components/PanoramaView'
import BilanView from '../components/BilanView'
import GoalsView from '../components/GoalsView'
import FloatingChat from '../components/FloatingChat'
import SearchDrawer from '../components/SearchDrawer'
import DesktopSidebar from '../components/DesktopSidebar'
import RightPanel from '../components/RightPanel'
import { getWeekKeyForOffset, getOffsetForWeekKey, getCurrentDayName, getWeekDatesForKey } from '../utils/dateUtils'
import { useTheme } from '../hooks/useTheme'
import { getWeekDateRange } from '../utils/monthUtils'
import { DAYS_ORDER } from '../data/schedule'
import { toast } from 'sonner'
import { deepEqual } from '@/lib/utils'
import { useGoals } from '../hooks/useGoals'
import { parseNoteForGoals } from '../lib/ai'

// ── Bottom Tab Bar (mobile iOS style) ────────────────────────
function BottomTabBar({ active, onChange, onAI }) {
  const tabs = [
    { id: 'day',       label: 'Jour',      Icon: Calendar },
    { id: 'panorama',  label: 'Semaine',   Icon: CalendarDays },
    { id: 'ai',        label: '',          Icon: Sparkles, primary: true },
    { id: 'objectifs', label: 'Objectifs', Icon: Target },
    { id: 'bilan',     label: 'Bilan',     Icon: BarChart2 },
  ]
  return (
    <div className="lg:hidden fixed left-0 right-0 bottom-0 z-40">
      <div className="absolute inset-x-0 bottom-0 h-[120px] pointer-events-none"
           style={{ background: 'linear-gradient(to top, var(--bg) 65%, transparent)' }}></div>
      <div className="relative px-3 pt-1" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}>
        <div className="flex items-center justify-around px-1 py-1 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.12)]"
             style={{ background: 'color-mix(in srgb, var(--surface-0) 85%, transparent)', backdropFilter: 'blur(24px)', border: '1px solid var(--line)', borderRadius: '24px' }}>
          {tabs.map(t => {
            const Ico = t.Icon;
            if (t.primary) {
              return (
                <div key={t.id} className="flex flex-col items-center gap-0.5 px-3 py-1 active:scale-90 transition-transform">
                  <TempoOrb size={44} onClick={onAI} className="shadow-[0_0_18px_-4px_rgba(0,0,0,0.4)]" />
                </div>
              );
            }
            const isActive = active === t.id;
            return (
              <button key={t.id} onClick={() => onChange(t.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-[14px] active:scale-95 transition-all flex-1`}
                style={{ color: isActive ? 'var(--text-1)' : 'var(--text-3)' }}>
                <Ico size={20} strokeWidth={isActive ? 2.2 : 1.7}/>
                <span className="text-[10px] font-medium tracking-tight">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  )
}

const TAB_LABELS = {
  day: "Aujourd'hui",
  panorama: 'Semaine',
  objectifs: 'Objectifs',
  bilan: 'Bilan',
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [weekOffset, setWeekOffset] = useState(0)
  const weekKey = getWeekKeyForOffset(weekOffset)
  const isCurrentWeek = weekOffset === 0

  const { schedule, loading: scheduleLoading, toggleBlock, addBlock, deleteBlock, updateBlock, updateSchedule } = useWeekStorage(weekKey)
  const templateLoaded = !scheduleLoading
  const replaceSchedule = updateSchedule
  const markBlockRecurring = async () => { toast.info("Fonctionnalité de récurrence en cours de migration") }
  const copyWeekTo = async () => { toast.info("Fonctionnalité de copie en cours de migration") }

  const completionStats = useMemo(() => {
    let total = 0, done = 0
    const byCategory = {}
    if (schedule) {
      Object.values(schedule).forEach(day => {
        if (!day.blocks) return
        day.blocks.forEach(block => {
          total++
          if (block.done) done++
          if (!byCategory[block.category]) byCategory[block.category] = { total: 0, done: 0 }
          byCategory[block.category].total++
          if (block.done) byCategory[block.category].done++
        })
      })
    }
    return { total, done, percentage: total === 0 ? 0 : Math.round((done / total) * 100), byCategory }
  }, [schedule])

  const { settings } = useUserSettings(user?.id)
  useTheme(settings)
  const { permission, requestPermission } = useNotifications(schedule, settings)
  const { canInstall, install } = useInstallPrompt()

  const [activeTab, setActiveTab] = useState('day')
  const [searchOpen, setSearchOpen] = useState(false)
  const [dayInitIndex, setDayInitIndex] = useState(undefined)
  const [chatOpenRequest, setChatOpenRequest] = useState(null)
  const [viewMode, setViewMode] = useState('list') // list ou timeline
  const [rightPanelOpen, setRightPanelOpen] = useState(() => localStorage.getItem('rightPanelOpen') !== 'false')

  useEffect(() => {
    localStorage.setItem('rightPanelOpen', rightPanelOpen)
  }, [rightPanelOpen])

  function handleSelectWeek(wk) {
    setWeekOffset(getOffsetForWeekKey(wk))
    setActiveTab('panorama')
  }

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

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const weekDates = getWeekDatesForKey(weekKey)

  if (!templateLoaded) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <p className="text-[13px] animate-pulse" style={{ color: 'var(--text-3)' }}>Chargement...</p>
    </div>
  )

  return (
    <CategoriesProvider userId={user?.id}>
      <div className="h-[100dvh] flex overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>

        {/* ═══════════════════════════════════════════════
            DESKTOP SIDEBAR (lg+)
        ════════════════════════════════════════════════ */}
        <DesktopSidebar 
          activeView={activeTab}
          onChange={setActiveTab}
          schedule={schedule}
          onAdd={() => { /* Add logic, maybe active day or monday */ addBlock(getCurrentDayName()) }}
          dark={darkMode}
          onToggleDark={() => setDarkMode(d => !d)}
        />

        {/* ═══════════════════════════════════════════════
            MAIN CONTENT
        ════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* ── Mobile header ── */}
          <header className="lg:hidden shrink-0 px-4 pb-2 flex items-center justify-between"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
            <button onClick={() => navigate('/settings')}
              className="flex items-center justify-center h-8 w-8 -ml-1 rounded-full active:bg-[var(--surface-1)] transition-colors"
              style={{ color: 'var(--text-2)' }}>
              <Settings size={18} strokeWidth={1.7} />
            </button>
            <div className="flex items-center gap-2">
              {activeTab === 'day' && (
                <div className="flex bg-[var(--surface-2)] rounded-[10px] p-[3px] shrink-0 mr-1">
                  <button onClick={() => setViewMode('list')}
                    className={`px-2 py-1 rounded-[7px] text-[11px] font-medium transition-all flex items-center gap-1 ${viewMode === 'list' ? 'bg-[var(--surface-0)] text-[var(--text-1)] shadow-sm' : 'text-[var(--text-3)]'}`}>
                    <List size={11} strokeWidth={2}/> Liste
                  </button>
                  <button onClick={() => setViewMode('timeline')}
                    className={`px-2 py-1 rounded-[7px] text-[11px] font-medium transition-all flex items-center gap-1 ${viewMode === 'timeline' ? 'bg-[var(--surface-0)] text-[var(--text-1)] shadow-sm' : 'text-[var(--text-3)]'}`}>
                    <Clock size={11} strokeWidth={2}/> Timeline
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* ── Desktop top bar ── */}
          <header className="hidden lg:flex shrink-0 h-[52px] items-center justify-between px-7 border-b" style={{ borderColor: 'var(--line)' }}>
            <div className="flex items-center gap-3 text-[12.5px]">
              <span style={{ color: 'var(--text-3)' }}>Mon Agenda</span>
              <span style={{ color: 'var(--text-3)', opacity: 0.5 }}>/</span>
              <span className="font-medium" style={{ color: 'var(--text-1)' }}>{TAB_LABELS[activeTab]}</span>
              {(activeTab === 'panorama' || activeTab === 'day') && !isCurrentWeek && (
                <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>· {getWeekDateRange(weekKey)}</span>
              )}
            </div>
            
            <div className="flex items-center gap-1.5">
              {activeTab === 'day' && (
                <div className="flex items-center bg-[var(--surface-1)] rounded-[7px] p-0.5 mr-2">
                  <button onClick={() => setViewMode('list')}
                    className={`px-2.5 py-1 text-[11.5px] rounded-[5px] transition-all flex items-center gap-1 ${viewMode === 'list' ? 'bg-[var(--bg)] text-[var(--text-1)] shadow-sm' : 'text-[var(--text-3)] hover:text-[var(--text-1)]'}`}>
                    <List size={12} strokeWidth={1.8}/> Liste
                  </button>
                  <button onClick={() => setViewMode('timeline')}
                    className={`px-2.5 py-1 text-[11.5px] rounded-[5px] transition-all flex items-center gap-1 ${viewMode === 'timeline' ? 'bg-[var(--bg)] text-[var(--text-1)] shadow-sm' : 'text-[var(--text-3)] hover:text-[var(--text-1)]'}`}>
                    <Clock size={12} strokeWidth={1.8}/> Timeline
                  </button>
                </div>
              )}
              {(activeTab === 'panorama' || activeTab === 'day') && (
                <>
                  <div className="w-[1px] h-4 bg-[var(--line)] mx-1" />
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setWeekOffset(o => o - 1); setDayInitIndex(undefined) }}
                      className="p-1.5 rounded-[6px] transition-colors hover:bg-[var(--surface-1)] text-[var(--text-3)]">
                      <ChevronLeft size={15} />
                    </button>
                    <span className="text-[11.5px] tabular-nums min-w-[110px] text-center" style={{ color: 'var(--text-2)' }}>
                      {isCurrentWeek ? 'Cette semaine' : getWeekDateRange(weekKey)}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); setWeekOffset(o => o + 1); setDayInitIndex(undefined) }}
                      className="p-1.5 rounded-[6px] transition-colors hover:bg-[var(--surface-1)] text-[var(--text-3)]">
                      <ChevronRight size={15} />
                    </button>
                    {(!isCurrentWeek && activeTab === 'panorama') && (
                      <button onClick={() => setWeekOffset(0)} className="text-[11px] px-1.5 font-medium transition-colors text-[var(--brand,#B45309)]">
                        Auj.
                      </button>
                    )}
                    {activeTab === 'panorama' && (
                      <button onClick={handleCopyWeek} className="p-1.5 rounded-[6px] transition-colors hover:bg-[var(--surface-1)] text-[var(--text-3)]" title="Copier vers semaine suivante">
                        <Copy size={13} />
                      </button>
                    )}
                  </div>
                  <div className="w-[1px] h-4 bg-[var(--line)] mx-1" />
                </>
              )}
              <button onClick={() => setChatOpenRequest(Date.now())}
                className="flex items-center gap-2 px-2 py-1 rounded-[7px] text-[12px] transition-colors hover:bg-[var(--surface-1)] text-[var(--text-2)]">
                <TempoOrb size={22} />
                <span>Tempo</span>
              </button>
              {canInstall && (
                <button onClick={install} className="p-1.5 rounded-[7px] transition-colors hover:bg-[var(--surface-1)] text-[var(--text-3)]">
                  <Download size={14} />
                </button>
              )}
              <button onClick={() => permission === 'default' && requestPermission()} className="p-1.5 rounded-[7px] transition-colors hover:bg-[var(--surface-1)] text-[var(--text-3)]">
                {permission === 'granted' ? <BellRing size={14} style={{ color: 'var(--success)' }} />
                  : permission === 'denied' ? <BellOff size={14} style={{ color: 'var(--danger)' }} />
                  : <Bell size={14} />}
              </button>
              <div className="w-[1px] h-4 bg-[var(--line)] mx-1" />
              <button onClick={() => setRightPanelOpen(o => !o)} 
                className={`p-1.5 rounded-[7px] transition-colors ${rightPanelOpen ? 'bg-[var(--surface-2)] text-[var(--text-1)]' : 'hover:bg-[var(--surface-1)] text-[var(--text-3)]'}`}
                title="Afficher/Masquer le panneau de détails">
                <PanelRight size={14} />
              </button>
            </div>
          </header>

          {/* ── Content ── */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto mobile-content-scroll lg:pb-6">
              {/* Le conteneur max-w-[820px] permet de centrer et limiter la largeur sur Desktop comme sur app.jsx */}
              <div className="w-full max-w-[820px] mx-auto px-4 lg:px-10 lg:py-8">
                {activeTab === 'day' && (
                  <DayView 
                    key={weekKey} schedule={schedule} 
                    onToggle={toggleBlock} onUpdate={handleUpdateBlock} 
                    weekKey={weekKey}
                    onAdd={addBlock} onDelete={deleteBlock}
                    initialDayIndex={dayInitIndex}
                    onNextWeek={() => { setWeekOffset(o => o + 1); setDayInitIndex(0) }}
                    onPrevWeek={() => { setWeekOffset(o => o - 1); setDayInitIndex(6) }}
                    isCurrentWeek={isCurrentWeek}
                    weekLabel={isCurrentWeek ? 'Cette sem.' : getWeekDateRange(weekKey)}
                    onCopyWeek={handleCopyWeek}
                    onGoToToday={() => { setWeekOffset(0); setDayInitIndex(undefined) }}
                    viewMode={viewMode} // Passé au composant DayView qui gérera Liste ou Timeline
                  />
                )}
                {activeTab === 'panorama' && (
                  <PanoramaView 
                    key={weekKey} schedule={schedule} weekKey={weekKey} changedDays={changedDays}
                    onToggle={toggleBlock} onUpdate={handleUpdateBlock}
                    onAdd={addBlock} onDelete={deleteBlock}
                    onMarkRecurring={(day, id, val) => markBlockRecurring(day, id, val)}
                    onSelectWeek={handleSelectWeek} 
                  />
                )}
                {activeTab === 'objectifs' && <GoalsView userId={user?.id} />}
                {activeTab === 'bilan' && (
                  <BilanView 
                    schedule={schedule} 
                    weekKey={weekKey} 
                    userId={user?.id}
                    onNextWeek={() => { setWeekOffset(o => o + 1); setDayInitIndex(0) }}
                    onPrevWeek={() => { setWeekOffset(o => o - 1); setDayInitIndex(6) }}
                    isCurrentWeek={isCurrentWeek}
                    onGoToToday={() => { setWeekOffset(0); setDayInitIndex(undefined) }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            DESKTOP RIGHT PANEL (xl+)
        ════════════════════════════════════════════════ */}
        {rightPanelOpen && (
          <RightPanel 
            schedule={schedule}
            currentDayKey={DAYS_ORDER[dayInitIndex !== undefined ? dayInitIndex : DAYS_ORDER.indexOf(getCurrentDayName())]}
          />
        )}

        {/* ── Search ── */}
        {searchOpen && (
          <SearchDrawer
            userId={user?.id}
            onSelectWeek={(wk) => { setWeekOffset(getOffsetForWeekKey(wk)); setActiveTab('panorama') }}
            onClose={() => setSearchOpen(false)}
          />
        )}

        {/* ── Floating Chat ── */}
        <FloatingChat
          schedule={schedule}
          weekDates={weekDates}
          weekKey={weekKey}
          missedBlocks={missedBlocks}
          userId={user?.id}
          onScheduleUpdate={handleScheduleUpdate}
          onAddBlock={addBlock}
          onUpdateBlock={updateBlock}
          onDeleteBlock={deleteBlock}
          onNavigate={setActiveTab}
          onSelectWeek={handleSelectWeek}
          openRequest={chatOpenRequest}
        />

        {/* ── Mobile Bottom Tab Bar ── */}
        <BottomTabBar
          active={activeTab}
          onChange={setActiveTab}
          onAI={() => setChatOpenRequest(Date.now())}
        />
      </div>
    </CategoriesProvider>
  )
}
