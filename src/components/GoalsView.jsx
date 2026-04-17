import { useState, useRef, useCallback } from 'react'
import { Plus, X, Check, Flame, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGoals } from '../hooks/useGoals'
import { hapticCheck, hapticUncheck, hapticImpact } from '../lib/haptic'

// ── Constants ────────────────────────────────────────────────────
const EMOJIS = [
  '💧','🏃','📚','😴','🥗','💪','🧘','🎯','✍️','⏰',
  '🧠','🚶','☀️','🌙','💊','🎸','🏋️','🍎','🥤','🍵',
  '🏊','🚴','🌿','🏆','📖','🎨','🎵','🧴','🦷','🛌',
]
const COLORS = [
  '#3b82f6','#8b5cf6','#ec4899','#f97316','#22c55e',
  '#14b8a6','#f59e0b','#ef4444','#6366f1','#64748b',
]

// ── Goal Sheet (shared by Add + Edit) ───────────────────────────
function GoalSheet({ initial, onClose, onSubmit, title, submitLabel }) {
  const [label,  setLabel]  = useState(initial?.label  ?? '')
  const [emoji,  setEmoji]  = useState(initial?.emoji  ?? '🎯')
  const [type,   setType]   = useState(initial?.type   ?? 'boolean')
  const [target, setTarget] = useState(initial?.target ? String(initial.target) : '')
  const [unit,   setUnit]   = useState(initial?.unit   ?? '')
  const [color,  setColor]  = useState(initial?.color  ?? COLORS[0])

  function handleSubmit(e) {
    e.preventDefault()
    if (!label.trim()) return
    onSubmit({ label: label.trim(), emoji, type, target: type === 'count' ? Number(target) || 1 : 1, unit: type === 'count' ? unit.trim() : '', color })
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-center pt-3 shrink-0"><div className="w-8 h-1 rounded-full bg-muted-foreground/20" /></div>
        <div className="px-5 pt-3 pb-4 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 pb-10 space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Icône</p>
            <div className="grid grid-cols-10 gap-1.5">
              {EMOJIS.map(e => (
                <button type="button" key={e} onClick={() => setEmoji(e)}
                  className={cn('w-8 h-8 text-lg rounded-lg flex items-center justify-center transition-all',
                    emoji === e ? 'bg-primary/20 ring-2 ring-primary scale-110' : 'hover:bg-muted/60')}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Titre *</p>
            <input autoFocus value={label} onChange={e => setLabel(e.target.value)}
              placeholder="Ex: Boire 2L d'eau, Marcher 10 000 pas..."
              className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary transition-all" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Type</p>
            <div className="grid grid-cols-2 gap-2">
              {[{ id: 'boolean', label: 'Oui / Non', desc: 'Fait ou pas fait' }, { id: 'count', label: 'Quantité', desc: 'Atteindre un chiffre' }].map(t => (
                <button type="button" key={t.id} onClick={() => setType(t.id)}
                  className={cn('py-3 px-4 rounded-xl border text-left transition-all',
                    type === t.id ? 'border-primary bg-primary/10' : 'border-border hover:border-foreground/20')}>
                  <p className={cn('text-sm font-semibold', type === t.id ? 'text-primary' : 'text-foreground')}>{t.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
          {type === 'count' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Objectif</p>
                <input type="number" min="1" value={target} onChange={e => setTarget(e.target.value)} placeholder="Ex: 2000"
                  className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground outline-none focus:border-primary transition-all" />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Unité</p>
                <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="ml, pas, min..."
                  className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground outline-none focus:border-primary transition-all" />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Couleur</p>
            <div className="flex gap-2.5 flex-wrap">
              {COLORS.map(c => (
                <button type="button" key={c} onClick={() => setColor(c)}
                  className={cn('w-8 h-8 rounded-full transition-all active:scale-90', color === c && 'ring-2 ring-offset-2 ring-offset-card scale-110')}
                  style={{ backgroundColor: c, '--tw-ring-color': c }} />
              ))}
            </div>
          </div>
          <button type="submit" disabled={!label.trim()}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white font-bold text-sm disabled:opacity-40 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:opacity-80 transition-opacity">
            <Plus className="h-4 w-4" />
            {submitLabel}
          </button>
        </form>
      </div>
    </>
  )
}

// ── Progress Ring ─────────────────────────────────────────────────
function Ring({ pct, color, size = 52 }) {
  const sw = 4
  const r = (size - sw) / 2
  const circ = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-muted/40" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.min(pct, 1))}
        style={{ transition: 'stroke-dashoffset 0.5s ease-out', filter: pct >= 1 ? `drop-shadow(0 0 3px ${color}88)` : 'none' }} />
    </svg>
  )
}

// ── Skeleton Card ─────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-muted/60 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-muted/60 rounded-full w-2/3" />
          <div className="h-2.5 bg-muted/40 rounded-full w-1/3" />
        </div>
        <div className="w-7 h-7 rounded-full bg-muted/60" />
      </div>
    </div>
  )
}

// ── Goal Card (sans gestion gesture — délégué au parent) ─────────
function GoalCard({ goal, progressData, streak, last7, onToggle, onAddValue, onReset, onDelete, onEdit, swipeX, isBeingDragged }) {
  const { done = false, value = 0 } = progressData || {}
  const [popping, setPopping] = useState(false)
  const lastTapTime = useRef(0)

  const pct = goal.type === 'count' ? value / (goal.target || 1) : done ? 1 : 0
  const displayPct = Math.round(pct * 100)
  const increment = goal.type === 'count' ? Math.max(1, Math.round(goal.target / 8)) : 1

  function handleToggle() {
    if (done) hapticUncheck(); else hapticCheck()
    setPopping(true)
    setTimeout(() => setPopping(false), 300)
    onToggle()
  }

  function handleContentPointerUp(e) {
    const now = Date.now()
    if (now - lastTapTime.current < 300) {
      onEdit()
      e.preventDefault()
      e.stopPropagation()
    }
    lastTapTime.current = now
  }

  const trashOpacity = Math.min(swipeX / 60, 1)

  return (
    <div className="space-y-1.5">
      {/* Fond rouge swipe-to-delete */}
      {swipeX > 0 && (
        <div className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 rounded-r-2xl"
          style={{ width: 80, opacity: trashOpacity }}>
          <button onClick={() => { hapticImpact(); onDelete() }}
            className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform">
            <Trash2 className="h-4 w-4 text-white" />
            <span className="text-[9px] text-white font-semibold">Suppr.</span>
          </button>
        </div>
      )}

      {/* Carte glissante */}
      <div className="rounded-2xl border bg-card p-4"
        style={{
          transform: `translateX(-${swipeX}px)`,
          opacity: isBeingDragged ? 0.25 : 1,
          transition: 'opacity 0.15s ease-out',
          borderLeft: done ? `4px solid ${goal.color}` : undefined,
        }}
      >
        {goal.type === 'boolean' ? (
          <div className="flex items-center gap-3">
            <button onClick={handleToggle} className="shrink-0 active:scale-90 transition-transform">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${goal.color}18` }}>
                {goal.emoji}
              </div>
            </button>
            <div className="flex-1 min-w-0 cursor-pointer select-none py-1"
              onDoubleClick={onEdit}
              onPointerUp={handleContentPointerUp}>
              <p className={cn('text-sm font-semibold transition-all duration-200', done && 'line-through text-muted-foreground')}>
                {goal.label}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {done ? "Accompli aujourd'hui ✓" : 'Appui long pour déplacer'}
              </p>
            </div>
            <button onClick={handleToggle} className="shrink-0">
              <div className={cn(
                'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                done ? 'border-transparent' : 'border-muted-foreground/30',
                popping && 'scale-125'
              )} style={{ backgroundColor: done ? goal.color : 'transparent' }}>
                {done && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
              </div>
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-3 cursor-pointer select-none"
              onDoubleClick={onEdit}
              onPointerUp={handleContentPointerUp}>
              <div className="relative shrink-0">
                <Ring pct={pct} color={goal.color} size={52} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl">{goal.emoji}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{goal.label}</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black tabular-nums" style={{ color: goal.color }}>{value}</span>
                  <span className="text-xs text-muted-foreground">/ {goal.target}{goal.unit ? ` ${goal.unit}` : ''}</span>
                </div>
              </div>
              <span className="text-sm font-black tabular-nums" style={{ color: done ? '#22c55e' : goal.color }}>
                {Math.min(displayPct, 100)}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(displayPct, 100)}%`, backgroundColor: goal.color,
                  boxShadow: done ? `0 0 6px ${goal.color}66` : 'none' }} />
            </div>
            <div className="flex gap-2">
              {[1, 2, 4].map(mult => (
                <button key={mult}
                  onClick={() => { hapticCheck(); onAddValue(increment * mult) }}
                  className="flex-1 py-2 rounded-xl text-[11px] font-semibold border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground active:scale-95">
                  +{increment * mult}{goal.unit ? ` ${goal.unit}` : ''}
                </button>
              ))}
              <button onClick={() => { hapticUncheck(); onReset() }}
                className="px-3 py-2 rounded-xl text-[11px] border border-border text-muted-foreground/50 hover:text-red-400 hover:border-red-400/30 transition-all active:scale-95">
                ↺
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer: streak + historique 7 jours */}
      <div className="flex items-center gap-2 px-1">
        {streak > 0 && (
          <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-500">
            <Flame className="h-3 w-3" />
            {streak} jour{streak > 1 ? 's' : ''}
          </div>
        )}
        <div className="flex gap-1 ml-auto">
          {last7.map(({ key, done: d, isToday }) => (
            <div key={key}
              className={cn('w-5 h-5 rounded-md transition-all duration-200', isToday && 'ring-1 ring-offset-1 ring-offset-background')}
              style={{ backgroundColor: d ? goal.color : undefined, ...(isToday ? { '--tw-ring-color': goal.color } : {}) }}
              title={key}>
              {!d && <div className="w-full h-full rounded-md bg-muted/50" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────
export default function GoalsView({ userId }) {
  const { goals, loading, addGoal, deleteGoal, updateGoal, reorderGoals, toggleGoal, addValue, resetValue, getTodayProgress, getStreak, getLast7Days } = useGoals(userId)
  const [addOpen, setAddOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)

  const todayProg = getTodayProgress()
  const doneCount = goals.filter(g => todayProg[g.id]?.done).length
  const globalPct = goals.length === 0 ? 0 : Math.round((doneCount / goals.length) * 100)

  // ── Swipe-to-delete ─────────────────────────────────────────────
  const [swipeState, setSwipeState] = useState({ index: null, x: 0 })
  const swipeRef = useRef({ startX: 0, startY: 0, active: false, index: null })
  const isHorizSwipe = useRef(false)
  const swipeAutoClose = useRef(null)
  const swipeJustReleased = useRef(false)

  function closeSwipe() {
    setSwipeState({ index: null, x: 0 })
    if (swipeAutoClose.current) { clearTimeout(swipeAutoClose.current); swipeAutoClose.current = null }
  }
  function resetSwipe() {
    swipeRef.current = { startX: 0, startY: 0, active: false, index: null }
    isHorizSwipe.current = false
  }

  // ── Drag-and-drop (appui long) ───────────────────────────────────
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 })
  const [ghostSize, setGhostSize] = useState({ w: 0, h: 0 })
  const dragOffset = useRef({ x: 0, y: 0 })
  const longPressTimer = useRef(null)
  const cardRefs = useRef([])
  const dragStartPos = useRef({ x: 0, y: 0 })
  const isDragging = useRef(false)

  function cancelLongPress() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }
  function resetDrag() {
    isDragging.current = false
    setDragIndex(null)
    setOverIndex(null)
  }

  const handlePointerDown = useCallback((e, index) => {
    if (e.target.closest('button')) return
    const rect = cardRefs.current[index]?.getBoundingClientRect()
    if (!rect) return

    dragStartPos.current = { x: e.clientX, y: e.clientY }
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    swipeRef.current = { startX: e.clientX, startY: e.clientY, active: true, index }
    isHorizSwipe.current = false

    longPressTimer.current = setTimeout(() => {
      if (!isHorizSwipe.current) {
        isDragging.current = true
        hapticImpact()
        setGhostSize({ w: rect.width, h: rect.height })
        setGhostPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
        setDragIndex(index)
        setOverIndex(index)
        try { cardRefs.current[index]?.setPointerCapture(e.pointerId) } catch (_) {}
      }
    }, 480)
  }, [])

  const handlePointerMove = useCallback((e, index) => {
    const deltaX = e.clientX - dragStartPos.current.x
    const deltaY = e.clientY - dragStartPos.current.y

    if (!isHorizSwipe.current && swipeRef.current.active && swipeRef.current.index === index) {
      if (Math.abs(deltaX) > Math.abs(deltaY) + 4 && Math.abs(deltaX) > 7) {
        isHorizSwipe.current = true
        cancelLongPress()
      }
    }

    if (isHorizSwipe.current && swipeRef.current.index === index && !isDragging.current) {
      setSwipeState({ index, x: Math.max(0, -deltaX) })
      return
    }

    if (isDragging.current && dragIndex !== null) {
      setGhostPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
      let closest = dragIndex
      let closestDist = Infinity
      cardRefs.current.forEach((ref, i) => {
        if (!ref) return
        const r = ref.getBoundingClientRect()
        const dist = Math.abs(e.clientY - (r.top + r.height / 2))
        if (dist < closestDist) { closestDist = dist; closest = i }
      })
      setOverIndex(closest)
    }
  }, [dragIndex])

  const handlePointerUp = useCallback((e, index) => {
    cancelLongPress()

    if (isHorizSwipe.current && swipeRef.current.index === index) {
      const swipeX = Math.max(0, -(e.clientX - swipeRef.current.startX))
      if (swipeX < 72) {
        closeSwipe()
      } else {
        swipeJustReleased.current = true
        setTimeout(() => { swipeJustReleased.current = false }, 100)
        setSwipeState({ index, x: 80 })
        if (swipeAutoClose.current) clearTimeout(swipeAutoClose.current)
        swipeAutoClose.current = setTimeout(closeSwipe, 3000)
      }
      resetSwipe()
      return
    }

    if (isDragging.current) {
      const from = dragIndex
      const to = overIndex
      if (from !== null && to !== null && from !== to) {
        const next = [...goals]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        reorderGoals(next)
        hapticImpact()
      }
      resetDrag()
      resetSwipe()
      return
    }

    resetSwipe()
  }, [dragIndex, overIndex, goals, reorderGoals])

  const handlePointerCancel = useCallback(() => {
    cancelLongPress()
    resetDrag()
    closeSwipe()
    resetSwipe()
  }, [])

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-24 lg:pb-8"
      onClick={() => { if (swipeJustReleased.current) return; if (swipeState.index !== null) closeSwipe() }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Objectifs du jour</h3>
          {goals.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {doneCount}/{goals.length} accompli{doneCount > 1 ? 's' : ''} aujourd'hui
            </p>
          )}
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 bg-primary/5 px-3 py-2 rounded-xl hover:bg-primary/10 transition-all active:scale-95">
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </button>
      </div>

      {/* Barre globale */}
      {goals.length > 0 && (
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] text-muted-foreground">Progression du jour</span>
            <span className="text-[10px] font-bold tabular-nums" style={{ color: globalPct === 100 ? '#22c55e' : undefined }}>{globalPct}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${globalPct}%`,
                background: globalPct === 100
                  ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                  : 'linear-gradient(90deg, hsl(var(--primary)), #a855f7)',
                boxShadow: globalPct === 100 ? '0 0 8px #22c55e66' : 'none',
              }} />
          </div>
        </div>
      )}

      {loading && goals.length === 0 && (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      )}

      {!loading && goals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="text-5xl">🎯</div>
          <div>
            <p className="text-sm font-semibold text-foreground">Aucun objectif pour l'instant</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Ajoute tes objectifs quotidiens — boire de l'eau, marcher, lire — et suis ta progression jour après jour.
            </p>
          </div>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold text-primary border border-primary/30 bg-primary/5 px-5 py-3 rounded-2xl hover:bg-primary/10 transition-all">
            <Plus className="h-4 w-4" />
            Créer mon premier objectif
          </button>
        </div>
      )}

      {/* Liste avec drag + swipe gérés ici */}
      {goals.length > 0 && (
        <div className="flex flex-col gap-2">
          {goals.map((goal, index) => {
            const isSwipeOpen = swipeState.index === index
            const swipeX = isSwipeOpen ? swipeState.x : 0
            const isBeingDragged = dragIndex === index

            return (
              <div key={goal.id}>
                {/* Drop indicator au-dessus */}
                {dragIndex !== null && overIndex === index && dragIndex !== index && dragIndex > index && (
                  <div className="h-0.5 bg-primary/70 rounded-full mx-3 mb-1 animate-in fade-in duration-100" />
                )}

                <div
                  ref={el => cardRefs.current[index] = el}
                  className="relative overflow-hidden rounded-2xl touch-none"
                  onPointerDown={e => handlePointerDown(e, index)}
                  onPointerMove={e => handlePointerMove(e, index)}
                  onPointerUp={e => handlePointerUp(e, index)}
                  onPointerCancel={handlePointerCancel}
                >
                  <GoalCard
                    goal={goal}
                    progressData={todayProg[goal.id]}
                    streak={getStreak(goal.id)}
                    last7={getLast7Days(goal.id)}
                    swipeX={swipeX}
                    isBeingDragged={isBeingDragged}
                    onToggle={() => toggleGoal(goal.id)}
                    onAddValue={v => addValue(goal.id, v)}
                    onReset={() => resetValue(goal.id)}
                    onDelete={() => { deleteGoal(goal.id); closeSwipe() }}
                    onEdit={() => setEditingGoal(goal)}
                  />
                </div>

                {/* Drop indicator en-dessous */}
                {dragIndex !== null && overIndex === index && dragIndex !== index && dragIndex < index && (
                  <div className="h-0.5 bg-primary/70 rounded-full mx-3 mt-1 animate-in fade-in duration-100" />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Ghost drag (position fixe) */}
      {dragIndex !== null && (
        <div style={{
          position: 'fixed',
          left: ghostPos.x,
          top: ghostPos.y,
          width: ghostSize.w,
          pointerEvents: 'none',
          zIndex: 1000,
          opacity: 0.92,
          transform: 'scale(1.03) rotate(0.5deg)',
          filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.4))',
          willChange: 'transform',
        }}>
          <GoalCard
            goal={goals[dragIndex]}
            progressData={todayProg[goals[dragIndex]?.id]}
            streak={getStreak(goals[dragIndex]?.id)}
            last7={getLast7Days(goals[dragIndex]?.id)}
            swipeX={0}
            isBeingDragged={false}
            onToggle={() => {}}
            onAddValue={() => {}}
            onReset={() => {}}
            onDelete={() => {}}
            onEdit={() => {}}
          />
        </div>
      )}

      {addOpen && (
        <GoalSheet title="Nouvel objectif" submitLabel="Créer l'objectif"
          onClose={() => setAddOpen(false)} onSubmit={addGoal} />
      )}
      {editingGoal && (
        <GoalSheet title="Modifier l'objectif" submitLabel="Mettre à jour"
          initial={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSubmit={data => updateGoal(editingGoal.id, data)} />
      )}
    </div>
  )
}
