import { useState, useEffect } from 'react'
import { Sparkles, Loader2, CheckCircle2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DAYS_ORDER } from '../data/schedule'
import { generateDayRecap, generateWeekRecap } from '../lib/ai'
import { getCurrentDayName } from '../utils/dateUtils'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

function lsKey(type, id, userId) {
  return `recap_${type}_${id}_${userId || 'local'}`
}

const DAY_ABBREV = {
  lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu',
  vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim',
}

// ── Supabase helpers ─────────────────────────────────────────────
async function loadRecapsFromSupabase(userId, weekKey) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('journal_recaps')
    .select('day_name, content')
    .eq('user_id', userId)
    .eq('week_key', weekKey)
  if (error) return null
  const result = {}
  for (const row of data) {
    const key = row.day_name ? `day_${row.day_name}` : 'week'
    result[key] = row.content
  }
  return result
}

async function saveRecapToSupabase(userId, weekKey, dayName, content) {
  if (!supabase || !userId) return
  await supabase.from('journal_recaps').upsert({
    user_id: userId,
    week_key: weekKey,
    day_name: dayName || null,
    content,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,week_key,day_name' })
}

// ── Accordion ────────────────────────────────────────────────────
function WeekRecapCard({ content, onGenerate, loading }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={cn('rounded-2xl border bg-card overflow-hidden transition-all duration-200', open ? 'border-primary/30 shadow-sm shadow-primary/5' : 'border-border')}>
      <button className="w-full px-4 py-3.5 flex items-center gap-3 text-left active:bg-muted/30 transition-colors" onClick={() => setOpen(o => !o)}>
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Bilan de la semaine</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Synthèse IA globale</p>
        </div>
        {content && <CheckCircle2 className="h-3.5 w-3.5 text-green-500/60 shrink-0" />}
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground/40 transition-transform duration-200 shrink-0', open && 'rotate-180')} />
      </button>
      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <div style={{ overflow: 'hidden' }}>
          <div className="px-4 pb-4 border-t border-border/40 pt-3">
            {content ? (
              <>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{content}</p>
                <button onClick={onGenerate} disabled={loading} className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-3 hover:text-primary transition-colors disabled:opacity-50">
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Regénérer
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Aucun récap généré pour cette semaine.</p>
                <button onClick={onGenerate} disabled={loading} className="flex items-center gap-2 text-xs font-semibold text-primary border border-primary/30 rounded-xl px-3 py-2 hover:bg-primary/5 transition-colors disabled:opacity-50">
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {loading ? 'Génération...' : "Générer avec l'IA"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Day panel ────────────────────────────────────────────────────
function DayPanel({ dayName, dayData, recap, loading, onGenerate, isToday }) {
  if (!dayData) return null
  const doneCount  = dayData.blocks.filter(b => b.done).length
  const totalCount = dayData.blocks.length
  const notesCount = dayData.blocks.filter(b => b.description?.trim()).length
  const pct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)
  const hue = Math.round(pct * 1.2)
  const barColor = `hsl(${hue}, 72%, 48%)`

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className={cn('px-4 py-3 border-b border-border/50', isToday && 'bg-primary/5')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className={cn('text-sm font-semibold capitalize', isToday ? 'text-primary' : 'text-foreground')}>{dayData.label || dayName}</p>
            {isToday && <span className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">Auj.</span>}
          </div>
          <span className="text-xs font-bold tabular-nums" style={{ color: pct > 0 ? barColor : undefined }}>{pct}%</span>
        </div>
        <div className="mt-2 h-1 w-full bg-muted/50 rounded-full overflow-hidden">
          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: barColor, borderRadius: 'inherit', transition: 'width 0.6s ease-out' }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 tabular-nums">
          {doneCount}/{totalCount} blocs · {notesCount} note{notesCount !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="px-4 py-3">
        {recap ? (
          <>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{recap}</p>
            <button onClick={onGenerate} disabled={loading} className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-3 hover:text-primary transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Regénérer
            </button>
          </>
        ) : (
          <div className="space-y-3">
            {notesCount === 0
              ? <p className="text-xs text-muted-foreground/60 italic">Aucune note pour ce jour — ajoute des notes dans tes blocs pour générer un récap.</p>
              : <p className="text-xs text-muted-foreground">{notesCount} note{notesCount > 1 ? 's' : ''} disponible{notesCount > 1 ? 's' : ''} pour la génération.</p>
            }
            <button onClick={onGenerate} disabled={loading || notesCount === 0}
              className="flex items-center gap-2 text-xs font-semibold text-primary border border-primary/30 rounded-xl px-3 py-2 hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {loading ? 'Génération...' : "Générer avec l'IA"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────
export default function JournalView({ schedule, weekKey, userId }) {
  const todayName = getCurrentDayName()
  const [recaps, setRecaps] = useState({})
  const [loadingKey, setLoadingKey] = useState(null)
  const [selectedDay, setSelectedDay] = useState(todayName)

  // Chargement : Supabase d'abord, fallback localStorage
  useEffect(() => {
    async function load() {
      // Essai Supabase
      const remote = await loadRecapsFromSupabase(userId, weekKey)
      if (remote) {
        setRecaps(remote)
        return
      }
      // Fallback localStorage
      const loaded = {}
      DAYS_ORDER.forEach(day => {
        const saved = localStorage.getItem(lsKey('day', `${weekKey}_${day}`, userId))
        if (saved) loaded[`day_${day}`] = saved
      })
      const savedWeek = localStorage.getItem(lsKey('week', weekKey, userId))
      if (savedWeek) loaded['week'] = savedWeek
      setRecaps(loaded)
    }
    load()
  }, [weekKey, userId])

  async function saveRecap(key, content, dayName) {
    setRecaps(prev => ({ ...prev, [key]: content }))
    // Supabase
    await saveRecapToSupabase(userId, weekKey, dayName, content)
    // Cache localStorage
    const lsk = dayName
      ? lsKey('day', `${weekKey}_${dayName}`, userId)
      : lsKey('week', weekKey, userId)
    localStorage.setItem(lsk, content)
  }

  async function handleGenerateDay(dayName) {
    const dayData = schedule[dayName]
    if (!dayData) return
    const notesBlocks = dayData.blocks.filter(b => b.description?.trim())
    if (!notesBlocks.length) {
      toast.error('Aucune note trouvée pour ce jour.')
      return
    }
    const key = `day_${dayName}`
    setLoadingKey(key)
    try {
      const recap = await generateDayRecap(dayName, dayData.blocks)
      await saveRecap(key, recap, dayName)
      toast.success('Récap généré !')
    } catch (e) {
      toast.error(e.message)
    }
    setLoadingKey(null)
  }

  async function handleGenerateWeek() {
    const hasNotes = Object.values(schedule).some(day => day.blocks.some(b => b.description?.trim()))
    if (!hasNotes) { toast.error('Aucune note trouvée cette semaine.'); return }
    setLoadingKey('week')
    try {
      const recap = await generateWeekRecap(schedule)
      await saveRecap('week', recap, null)
      toast.success('Récap semaine généré !')
    } catch (e) {
      toast.error(e.message)
    }
    setLoadingKey(null)
  }

  function getDayMeta(dayName) {
    const blocks = schedule[dayName]?.blocks ?? []
    return {
      done:      blocks.filter(b => b.done).length,
      total:     blocks.length,
      notes:     blocks.filter(b => b.description?.trim()).length,
      hasRecap:  !!recaps[`day_${dayName}`],
    }
  }

  const totalNotes = DAYS_ORDER.reduce((acc, d) => acc + getDayMeta(d).notes, 0)

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-sm font-bold text-foreground">Journal IA</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">{totalNotes} note{totalNotes !== 1 ? 's' : ''} cette semaine</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] bg-primary/8 border border-primary/20 px-2.5 py-1.5 rounded-full">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="text-primary/70 font-medium">IA</span>
        </div>
      </div>

      {/* Recap semaine */}
      <WeekRecapCard content={recaps['week']} onGenerate={handleGenerateWeek} loading={loadingKey === 'week'} />

      {/* Séparateur */}
      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-border" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Bilans journaliers</p>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Sélecteur jours */}
      <div className="flex gap-1.5">
        {DAYS_ORDER.map(dayName => {
          const { done, total, notes, hasRecap } = getDayMeta(dayName)
          const isToday    = dayName === todayName
          const isSelected = selectedDay === dayName
          const pct        = total === 0 ? 0 : Math.round((done / total) * 100)
          const hue        = Math.round(pct * 1.2)
          return (
            <button key={dayName} onClick={() => setSelectedDay(dayName)}
              className={cn('flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition-all duration-150',
                isSelected ? 'border-primary bg-primary/10' : isToday ? 'border-primary/30 bg-primary/5' : 'border-border bg-card hover:border-border/80 hover:bg-muted/30')}>
              <span className={cn('text-[10px] font-bold', isSelected ? 'text-primary' : isToday ? 'text-primary/70' : 'text-muted-foreground')}>
                {DAY_ABBREV[dayName] ?? dayName.slice(0, 3)}
              </span>
              <div className="relative w-5 h-5">
                <svg viewBox="0 0 20 20" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/30" />
                  {total > 0 && (
                    <circle cx="10" cy="10" r="7" fill="none"
                      stroke={`hsl(${hue}, 72%, 48%)`} strokeWidth="2.5" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 7}
                      strokeDashoffset={2 * Math.PI * 7 * (1 - pct / 100)}
                      style={{ transition: 'stroke-dashoffset 0.5s ease-out' }} />
                  )}
                </svg>
                {hasRecap && <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-500" />}
              </div>
              <span className={cn('text-[8px] tabular-nums', isSelected ? 'text-primary/80' : 'text-muted-foreground/50')}>{done}/{total}</span>
            </button>
          )
        })}
      </div>

      {/* Panneau jour */}
      <DayPanel
        key={selectedDay}
        dayName={selectedDay}
        dayData={schedule[selectedDay]}
        recap={recaps[`day_${selectedDay}`]}
        loading={loadingKey === `day_${selectedDay}`}
        onGenerate={() => handleGenerateDay(selectedDay)}
        isToday={selectedDay === todayName}
      />
    </div>
  )
}
