import { useState, useRef, useEffect } from 'react'
import { Moon, Sun, BarChart2, X, MessageCircle, Send, LogOut, ChevronLeft, ChevronRight, RotateCcw, Copy, Search } from 'lucide-react'
import { useWeekStorage } from '../hooks/useWeekStorage'
import { useUserSettings } from '../hooks/useUserSettings'
import { useAuth } from '../contexts/AuthContext'
import { CategoriesProvider } from '../contexts/CategoriesContext'
import { supabase } from '../lib/supabase'
import { sendDashboardMessage } from '../lib/ai'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import WeekView from '../components/WeekView'
import WeekSummary from '../components/WeekSummary'
import MonthView from '../components/MonthView'
import DayView from '../components/DayView'
import JournalView from '../components/JournalView'
import StatsView from '../components/StatsView'
import SearchDrawer from '../components/SearchDrawer'
import { getTodayFormatted, getWeekKeyForOffset, getOffsetForWeekKey } from '../utils/dateUtils'
import { getWeekDateRange } from '../utils/monthUtils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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

const markdownComponents = {
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="text-xs w-full border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-primary/10">{children}</thead>,
  th: ({ children }) => <th className="px-2 py-1 text-left font-semibold border border-primary/20">{children}</th>,
  td: ({ children }) => <td className="px-2 py-1 border border-primary/20 opacity-80">{children}</td>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
}

export default function Dashboard() {
  const { user } = useAuth()

  // Navigation semaines
  const [weekOffset, setWeekOffset] = useState(0)
  const weekKey = getWeekKeyForOffset(weekOffset)
  const isCurrentWeek = weekOffset === 0

  const { schedule, templateLoaded, toggleBlock, addBlock, deleteBlock, updateBlock, replaceSchedule, markBlockRecurring, copyWeekTo, completionStats } = useWeekStorage(user?.id, weekKey)
  const { settings, updateSetting } = useUserSettings(user?.id)

  const [activeTab, setActiveTab] = useState('day')
  const [bilanOpen, setBilanOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [dayInitIndex, setDayInitIndex] = useState(undefined)

  function handleSelectWeek(weekKey) {
    setWeekOffset(getOffsetForWeekKey(weekKey))
    setActiveTab('week')
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
                <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} className="h-7 w-7 text-muted-foreground" title="Rechercher">
                  <Search className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDarkMode(d => !d)} className="h-7 w-7 text-muted-foreground">
                  {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
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
                  <TabsTrigger value="week">Semaine</TabsTrigger>
                  <TabsTrigger value="month">Mois</TabsTrigger>
                  <TabsTrigger value="journal">Journal</TabsTrigger>
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                </TabsList>

                {/* Navigation semaines — masquée sur Journal et Stats */}
                {activeTab !== 'journal' && activeTab !== 'stats' && (
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
              <TabsContent value="week" className="flex-1 overflow-y-auto pb-24 lg:pb-6">
                <WeekView key={weekKey} schedule={schedule} onToggle={toggleBlock} onUpdate={updateBlock} weekKey={weekKey} changedDays={changedDays}
                  onAdd={addBlock} onDelete={deleteBlock}
                  onMarkRecurring={(day, id, val) => markBlockRecurring(day, id, val)} />
              </TabsContent>
              <TabsContent value="month" className="flex-1 overflow-y-auto pb-24 lg:pb-6">
                <MonthView onSelectWeek={handleSelectWeek} />
              </TabsContent>
              <TabsContent value="journal" className="flex-1 overflow-y-auto pb-24 lg:pb-6">
                <JournalView schedule={schedule} weekKey={weekKey} userId={user?.id} />
              </TabsContent>
              <TabsContent value="stats" className="flex-1 overflow-y-auto pb-24 lg:pb-6">
                <StatsView userId={user?.id} />
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

      {/* ── Boutons flottants (Mobile) ─ */}
      <div className="lg:hidden fixed bottom-6 left-0 right-0 flex justify-center z-40 px-4 gap-3">
        <Button onClick={() => setBilanOpen(true)} size="lg"
          className="gap-2 rounded-full px-6 py-6 bg-gradient-to-r from-primary to-purple-500 text-white border-0 shadow-2xl">
          <BarChart2 className="h-5 w-5" />
          <span className="font-semibold text-sm">{completionStats.percentage}%</span>
        </Button>
      </div>

      {/* ── Bouton Chat IA flottant ─ */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-purple-500 shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </button>

      {/* ── Drawer bilan (Mobile) ────────── */}
      {bilanOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-md" onClick={() => setBilanOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 glass-card rounded-t-[2rem] max-h-[85vh] flex flex-col">
            <div className="flex justify-center pt-4 pb-2 relative">
              <div className="w-12 h-1.5 rounded-full bg-foreground/20" />
              <Button variant="ghost" size="icon" onClick={() => setBilanOpen(false)} className="absolute right-4 top-2 h-8 w-8 rounded-full">
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

      {/* ── Search Drawer ────────── */}
      {searchOpen && (
        <SearchDrawer
          userId={user?.id}
          onSelectWeek={(wk) => { setWeekOffset(getOffsetForWeekKey(wk)); setActiveTab('week') }}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {/* ── Chat IA Drawer ────────── */}
      {chatOpen && (
        <ChatDrawer
          schedule={schedule}
          weekDates={getWeekDatesForKey(weekKey)}
          userId={user?.id}
          onClose={() => setChatOpen(false)}
          onScheduleUpdate={handleScheduleUpdate}
        />
      )}
    </div>
    </CategoriesProvider>
  )
}

function ChatDrawer({ schedule, weekDates, userId, onClose, onScheduleUpdate }) {
  const STORAGE_KEY = `dashboard-chat-${userId || 'local'}`
  const INITIAL_MSG = {
    role: 'assistant',
    content: "Bonjour ! Je connais ton planning. Dis-moi ce que tu veux modifier ou demande-moi conseil sur ton organisation.",
  }

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : [INITIAL_MSG]
    } catch { return [INITIAL_MSG] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function confirmUpdate(msgIndex, pendingSchedule) {
    onScheduleUpdate(pendingSchedule)
    toast.success('Planning mis à jour !')
    setMessages(m => m.map((msg, i) =>
      i === msgIndex ? { ...msg, pendingSchedule: undefined, confirmed: true } : msg
    ))
  }

  function cancelUpdate(msgIndex) {
    setMessages(m => m.map((msg, i) =>
      i === msgIndex ? { ...msg, pendingSchedule: undefined, cancelled: true } : msg
    ))
  }

  async function send(e, retryContent) {
    if (e) e.preventDefault()
    const content = retryContent ?? input
    if (!content.trim() || loading) return

    const userMsg = { role: 'user', content }
    const newMsgs = retryContent
      ? messages  // retry : pas de doublon dans la liste
      : [...messages, userMsg]

    if (!retryContent) {
      setMessages(newMsgs)
      setInput('')
    }
    setLoading(true)

    try {
      const chatMsgs = newMsgs
        .filter(m => !(m.role === 'assistant' && newMsgs.indexOf(m) === 0))
        .map(({ role, content }) => ({ role, content }))
      const result = await sendDashboardMessage(chatMsgs, schedule, weekDates)

      if (result.type === 'UPDATE') {
        setMessages(m => [...m, {
          role: 'assistant',
          content: result.reply,
          pendingSchedule: result.schedule,
        }])
      } else {
        setMessages(m => [...m, { role: 'assistant', content: result.reply }])
      }
    } catch (err) {
      toast.error(err.message)
      setMessages(m => [...m, {
        role: 'assistant',
        content: `Erreur : ${err.message}`,
        isError: true,
        retryContent: content,
      }])
    }

    setLoading(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md glass-card border-l border-white/10 flex flex-col shadow-2xl">

        <div className="p-4 border-b border-primary/20 flex items-center justify-between">
          <div>
            <h2 className="font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">Coach IA</h2>
            <p className="text-xs text-muted-foreground">Modifie ton agenda en temps réel</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : msg.confirmed
                    ? 'bg-green-500/20 text-foreground border border-green-500/30 rounded-tl-sm'
                    : msg.cancelled
                      ? 'bg-muted/50 text-muted-foreground border border-border rounded-tl-sm'
                      : msg.isError
                        ? 'bg-red-500/10 text-foreground border border-red-500/20 rounded-tl-sm'
                        : 'bg-background/80 text-foreground border border-primary/20 rounded-tl-sm'
              }`}>
                {msg.confirmed && <span className="text-green-400 text-xs font-semibold block mb-1">✓ Planning mis à jour</span>}
                {msg.cancelled && <span className="text-muted-foreground text-xs font-semibold block mb-1">✗ Modification annulée</span>}

                <div className="text-sm">
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>

                {/* Boutons confirmation */}
                {msg.pendingSchedule && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => confirmUpdate(i, msg.pendingSchedule)}
                      className="flex-1 text-xs py-1.5 px-3 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors font-medium">
                      Appliquer
                    </button>
                    <button onClick={() => cancelUpdate(i)}
                      className="flex-1 text-xs py-1.5 px-3 rounded-lg bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors font-medium">
                      Annuler
                    </button>
                  </div>
                )}

                {/* Bouton retry sur erreur */}
                {msg.isError && msg.retryContent && (
                  <button onClick={() => send(null, msg.retryContent)}
                    className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <RotateCcw className="h-3 w-3" />
                    Réessayer
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-background/80 border border-primary/20 p-3 rounded-2xl rounded-tl-sm">
                <span className="animate-pulse text-sm">...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="p-4 border-t border-primary/20 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ex: Déplace mon sport au matin..."
            className="flex-1 bg-transparent border border-primary/30 rounded-full px-4 py-2 outline-none focus:border-primary text-foreground text-sm"
            autoFocus
          />
          <Button type="submit" disabled={loading} size="icon" className="rounded-full shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </>
  )
}
