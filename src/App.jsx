import { useState, useRef, useEffect } from 'react'
import { Moon, Sun, BarChart2, X } from 'lucide-react'
import { useWeekStorage } from './hooks/useWeekStorage'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import WeekView from './components/WeekView'
import WeekSummary from './components/WeekSummary'
import MonthView from './components/MonthView'
import DayView from './components/DayView'
import { getTodayFormatted } from './utils/dateUtils'

function App() {
  const { schedule, toggleBlock, updateBlock, weekKey, completionStats } = useWeekStorage()
  const [bilanOpen, setBilanOpen] = useState(false)

  // Thème
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // Titre
  const [title, setTitle] = useState(() => localStorage.getItem('app-title') || 'Mon Agenda')
  const [editingTitle, setEditingTitle] = useState(false)
  const titleInputRef = useRef(null)
  function handleTitleClick() { setEditingTitle(true); setTimeout(() => titleInputRef.current?.select(), 0) }
  function handleTitleSave() {
    const final = title.trim() || 'Mon Agenda'
    setTitle(final); localStorage.setItem('app-title', final); setEditingTitle(false)
  }
  function onTitleKey(e) {
    if (e.key === 'Enter') handleTitleSave()
    if (e.key === 'Escape') { setTitle(localStorage.getItem('app-title') || 'Mon Agenda'); setEditingTitle(false) }
  }

  // Tagline
  const DEFAULT_TAGLINE = "l'action d'aujourd'hui est le confort de demain."
  const [tagline, setTagline] = useState(() => localStorage.getItem('app-tagline') || DEFAULT_TAGLINE)
  const [editingTagline, setEditingTagline] = useState(false)
  const taglineInputRef = useRef(null)
  function handleTaglineClick() { setEditingTagline(true); setTimeout(() => taglineInputRef.current?.select(), 0) }
  function handleTaglineSave() {
    const final = tagline.trim() || DEFAULT_TAGLINE
    setTagline(final); localStorage.setItem('app-tagline', final); setEditingTagline(false)
  }
  function onTaglineKey(e) {
    if (e.key === 'Enter') handleTaglineSave()
    if (e.key === 'Escape') { setTagline(localStorage.getItem('app-tagline') || DEFAULT_TAGLINE); setEditingTagline(false) }
  }

  const todayFormatted = getTodayFormatted()

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <div className="max-w-screen-2xl mx-auto px-4 py-5 md:px-8 md:py-6">

        {/* ── Header ──────────────────────────────────── */}
        <header className="mb-6">
          <div className="flex items-start justify-between gap-4">

            {/* Gauche : titre + date */}
            <div className="min-w-0">
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={onTitleKey}
                  className="text-xl font-semibold bg-transparent border-b border-primary outline-none max-w-[200px] text-foreground"
                  maxLength={30}
                />
              ) : (
                <button onClick={handleTitleClick} className="group flex items-center gap-1.5 text-left">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
                  <span className="opacity-0 group-hover:opacity-40 transition-opacity text-foreground text-xs">✎</span>
                </button>
              )}
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">{todayFormatted}</p>
            </div>

            {/* Droite : tagline + toggle thème */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDarkMode((d) => !d)}
                className="h-7 w-7 text-muted-foreground"
              >
                {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </Button>

              {editingTagline ? (
                <input
                  ref={taglineInputRef}
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  onBlur={handleTaglineSave}
                  onKeyDown={onTaglineKey}
                  className="text-xs italic text-muted-foreground bg-transparent border-b border-primary outline-none text-right w-64"
                  maxLength={80}
                />
              ) : (
                <button onClick={handleTaglineClick} className="group flex items-center gap-1 text-right">
                  <span className="text-xs italic text-muted-foreground group-hover:text-foreground transition-colors max-w-[250px] text-right">
                    {tagline}
                  </span>
                  <span className="opacity-0 group-hover:opacity-40 transition-opacity text-foreground text-xs flex-shrink-0">✎</span>
                </button>
              )}
            </div>
          </div>
          <Separator className="mt-4" />
        </header>

        {/* ── Split-Screen Layout (Desktop) ───────────── */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Colonne de Gauche (Agenda interactif) */}
          <main className="flex-1 w-full min-w-0">
            <Tabs defaultValue="day">
              <TabsList className="mb-4">
                <TabsTrigger value="day">Jour</TabsTrigger>
                <TabsTrigger value="week">Semaine</TabsTrigger>
                <TabsTrigger value="month">Mois</TabsTrigger>
              </TabsList>

              <TabsContent value="day">
                <DayView schedule={schedule} onToggle={toggleBlock} onUpdate={updateBlock} />
              </TabsContent>
              <TabsContent value="week">
                <WeekView schedule={schedule} onToggle={toggleBlock} onUpdate={updateBlock} />
              </TabsContent>
              <TabsContent value="month">
                <MonthView />
              </TabsContent>
            </Tabs>
          </main>

          {/* Colonne de Droite : Bilan (Uniquement sur PC) */}
          <aside className="hidden lg:block w-full lg:w-[320px] xl:w-[380px] shrink-0 sticky top-6">
            <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-2xl">
              <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent mb-6 text-center">Bilan de la Semaine</h2>
              <WeekSummary stats={completionStats} />
            </div>
          </aside>
          
        </div>
      </div>

      {/* ── Bouton flottant bilan (Mobile Uniquement) ─ */}
      <div className="lg:hidden fixed bottom-6 left-0 right-0 flex justify-center z-40 px-4">
        <Button
          onClick={() => setBilanOpen(true)}
          size="lg"
          className="gap-3 rounded-full px-8 py-6 bg-gradient-to-r from-primary to-purple-500 hover:from-primary hover:to-primary text-white border-0 hover:scale-105 transition-all duration-300 animate-glow-pulse shadow-2xl"
        >
          <BarChart2 className="h-5 w-5" />
          <span className="font-semibold text-sm">Voir mon bilan</span>
          <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full font-bold ml-1 backdrop-blur-sm">
            {completionStats.percentage}%
          </span>
        </Button>
      </div>

      {/* ── Drawer bilan (Mobile Uniquement) ────────── */}
      {bilanOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-md animate-fade-in-up" style={{ animationDuration: '0.2s' }} onClick={() => setBilanOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 glass-card rounded-t-[2rem] max-h-[85vh] flex flex-col animate-slide-up border-b-0 border-l-0 border-r-0">
            <div className="flex justify-center pt-4 pb-2 relative">
              <div className="w-12 h-1.5 rounded-full bg-foreground/20" />
              <Button variant="ghost" size="icon" onClick={() => setBilanOpen(false)} className="absolute right-4 top-2 h-8 w-8 rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="px-6 pt-2 pb-4 text-center">
              <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">Bilan de la semaine</h2>
            </div>
            <div className="overflow-y-auto px-6 py-2 flex-1 pb-10">
              <WeekSummary stats={completionStats} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
