import { useState, useEffect } from 'react'
import { Sparkles, ChevronDown, BookOpen, Moon, Dumbbell, Brain, Briefcase, Coffee, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORY_LABELS, DAYS_ORDER } from '../data/schedule'
import { generateDayRecap, generateWeekRecap } from '../lib/ai'
import { getTodayFormatted, getCurrentDayName } from '../utils/dateUtils'
import { toast } from 'sonner'

const CAT_ICONS = {
  sommeil: Moon, coran: BookOpen, learning: Brain, clients: Briefcase,
  salam: Brain, sport: Dumbbell, school: Brain, work: Briefcase, rest: Coffee,
}
const CAT_COLORS = {
  sommeil: 'text-blue-500', coran: 'text-violet-500', learning: 'text-amber-500',
  clients: 'text-orange-500', salam: 'text-pink-500', sport: 'text-indigo-500',
  school: 'text-sky-500', work: 'text-blue-400', rest: 'text-teal-500',
}

function getRecapKey(type, id, userId) {
  return `recap_${type}_${id}_${userId || 'local'}`
}

function RecapCard({ title, subtitle, content, icon: Icon, color, onGenerate, loading }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={cn('rounded-2xl border border-border bg-card overflow-hidden', open && 'ring-1 ring-primary/20')}>
      <button className="w-full px-4 py-3.5 flex items-center gap-3 text-left" onClick={() => setOpen(o => !o)}>
        <div className={cn('w-8 h-8 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0', color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground/50 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3">
          {content ? (
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Aucun récap généré pour cette période.</p>
              <button
                onClick={onGenerate}
                disabled={loading}
                className="flex items-center gap-2 text-xs font-semibold text-primary border border-primary/30 rounded-xl px-3 py-2 hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {loading ? 'Génération...' : 'Générer avec l\'IA'}
              </button>
            </div>
          )}
          {content && (
            <button
              onClick={onGenerate}
              disabled={loading}
              className="flex items-center gap-2 text-xs text-muted-foreground mt-3 hover:text-primary transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Regénérer
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function JournalView({ schedule, weekKey, userId }) {
  const todayName = getCurrentDayName()
  const [recaps, setRecaps] = useState({})
  const [loadingKey, setLoadingKey] = useState(null)

  // Charge les recaps depuis localStorage
  useEffect(() => {
    const loaded = {}
    // Recap journaliers
    DAYS_ORDER.forEach(day => {
      const key = getRecapKey('day', `${weekKey}_${day}`, userId)
      const saved = localStorage.getItem(key)
      if (saved) loaded[`day_${day}`] = saved
    })
    // Recap hebdomadaire
    const weekRecapKey = getRecapKey('week', weekKey, userId)
    const savedWeek = localStorage.getItem(weekRecapKey)
    if (savedWeek) loaded['week'] = savedWeek

    setRecaps(loaded)
  }, [weekKey, userId])

  async function handleGenerateDay(dayName) {
    const dayData = schedule[dayName]
    if (!dayData) return
    const notesBlocks = dayData.blocks.filter(b => b.description?.trim())
    if (notesBlocks.length === 0) {
      toast.error('Aucune note trouvée pour ce jour. Ajoute des notes dans tes blocs complétés.')
      return
    }
    const key = `day_${dayName}`
    setLoadingKey(key)
    try {
      const recap = await generateDayRecap(dayName, dayData.blocks)
      setRecaps(prev => ({ ...prev, [key]: recap }))
      localStorage.setItem(getRecapKey('day', `${weekKey}_${dayName}`, userId), recap)
      toast.success('Récap généré !')
    } catch (e) {
      toast.error(e.message)
    }
    setLoadingKey(null)
  }

  async function handleGenerateWeek() {
    const hasNotes = Object.values(schedule).some(day =>
      day.blocks.some(b => b.description?.trim())
    )
    if (!hasNotes) {
      toast.error('Aucune note trouvée cette semaine. Ajoute des notes dans tes blocs.')
      return
    }
    setLoadingKey('week')
    try {
      const recap = await generateWeekRecap(schedule)
      setRecaps(prev => ({ ...prev, week: recap }))
      localStorage.setItem(getRecapKey('week', weekKey, userId), recap)
      toast.success('Récap semaine généré !')
    } catch (e) {
      toast.error(e.message)
    }
    setLoadingKey(null)
  }

  // Stats de notes par jour
  function getDayNotesCount(dayName) {
    return schedule[dayName]?.blocks.filter(b => b.description?.trim()).length || 0
  }

  const totalNotes = DAYS_ORDER.reduce((acc, d) => acc + getDayNotesCount(d), 0)

  return (
    <div className="max-w-lg mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Journal IA</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">{totalNotes} note{totalNotes > 1 ? 's' : ''} cette semaine</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-full">
          <Sparkles className="h-3 w-3 text-primary" />
          Powered by IA
        </div>
      </div>

      {/* Récap hebdomadaire */}
      <RecapCard
        title="Bilan de la semaine"
        subtitle={`Synthèse IA · ${DAYS_ORDER.filter(d => getDayNotesCount(d) > 0).length}/7 jours avec notes`}
        content={recaps['week']}
        icon={Sparkles}
        color="text-primary"
        onGenerate={handleGenerateWeek}
        loading={loadingKey === 'week'}
      />

      <div className="h-px bg-border" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bilans journaliers</p>

      {/* Récaps journaliers */}
      {DAYS_ORDER.map(dayName => {
        const notesCount = getDayNotesCount(dayName)
        const isToday = dayName === todayName
        const dayData = schedule[dayName]

        return (
          <RecapCard
            key={dayName}
            title={<span className="capitalize">{dayData?.label || dayName}{isToday && <span className="ml-2 text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">Auj.</span>}</span>}
            subtitle={notesCount > 0 ? `${notesCount} note${notesCount > 1 ? 's' : ''} · ${dayData?.blocks.filter(b => b.done).length}/${dayData?.blocks.length} blocs` : 'Aucune note'}
            content={recaps[`day_${dayName}`]}
            icon={Brain}
            color={isToday ? 'text-primary' : 'text-muted-foreground'}
            onGenerate={() => handleGenerateDay(dayName)}
            loading={loadingKey === `day_${dayName}`}
          />
        )
      })}
    </div>
  )
}
