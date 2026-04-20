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
  '#0A84FF', '#5E5CE6', '#FF2D55', '#FF9500', '#34C759',
  '#30B0C7', '#FFCC00', '#FF3B30', '#BF5AF2', '#8E8E93',
]

// ── Goal Sheet (shared by Add + Edit) ───────────────────────────
function GoalSheet({ initial, onClose, onSubmit, title, submitLabel }) {
  const [label,  setLabel]  = useState(initial?.label  ?? '')
  const [emoji,  setEmoji]  = useState(initial?.emoji  ?? '🎯')
  const [type,   setType]   = useState(initial?.type   ?? 'boolean')
  const [target, setTarget] = useState(initial?.target ? String(initial.target) : '')
  const [unit,   setUnit]   = useState(initial?.unit   ?? '')
  const [step,   setStep]   = useState(initial?.step ? String(initial.step) : '')
  const [color,  setColor]  = useState(initial?.color  ?? COLORS[0])

  function handleSubmit(e) {
    e.preventDefault()
    if (!label.trim()) return
    onSubmit({ 
      label: label.trim(), 
      emoji, 
      type, 
      target: type === 'count' ? Number(target) || 1 : 1, 
      unit: type === 'count' ? unit.trim() : '', 
      step: type === 'count' && step ? Number(step) : null,
      color 
    })
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-t-[32px] shadow-2xl flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-center pt-3 shrink-0"><div className="w-12 h-1.5 rounded-full bg-[#E5E5EA] dark:bg-[#3A3A3C]" /></div>
        <div className="px-5 pt-4 pb-4 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-xl tracking-tight text-foreground">{title}</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] hover:bg-[#D1D1D6] dark:hover:bg-[#3A3A3C] transition-colors text-muted-foreground">
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 pb-10 space-y-6">
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 space-y-5 shadow-sm">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Icône</p>
              <div className="grid grid-cols-10 gap-1.5">
                {EMOJIS.map(e => (
                  <button type="button" key={e} onClick={() => setEmoji(e)}
                    className={cn('w-8 h-8 text-lg rounded-full flex items-center justify-center transition-all',
                      emoji === e ? 'bg-primary/10 ring-2 ring-primary scale-110' : 'hover:bg-muted/60')}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Titre *</p>
              <input autoFocus value={label} onChange={e => setLabel(e.target.value)}
                placeholder="Ex: Boire 2L d'eau, Lire..."
                className="w-full px-0 py-2 bg-transparent border-b border-[#E5E5EA] dark:border-[#3A3A3C] text-base text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary transition-all rounded-none" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 space-y-5 shadow-sm">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Type d'objectif</p>
              <div className="grid grid-cols-2 gap-3">
                {[{ id: 'boolean', label: 'Oui / Non', desc: 'Tâche simple' }, { id: 'count', label: 'Quantité', desc: 'Progression' }].map(t => (
                  <button type="button" key={t.id} onClick={() => setType(t.id)}
                    className={cn('py-3 px-4 rounded-[14px] border-2 text-left transition-all',
                      type === t.id ? 'border-[#0A84FF] bg-[#0A84FF]/5' : 'border-transparent bg-[#F2F2F7] dark:bg-[#1C1C1E]')}>
                    <p className={cn('text-sm font-bold', type === t.id ? 'text-[#0A84FF]' : 'text-foreground')}>{t.label}</p>
                    <p className="text-[11px] text-[#8E8E93] mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {type === 'count' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Cible globale</p>
                  <input type="number" min="1" value={target} onChange={e => setTarget(e.target.value)} placeholder="Ex: 2000"
                    className="w-full px-0 py-2 bg-transparent border-b border-[#E5E5EA] dark:border-[#3A3A3C] text-base text-foreground outline-none focus:border-primary transition-all rounded-none" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Incrément par appui</p>
                  <input type="number" min="1" value={step} onChange={e => setStep(e.target.value)} placeholder="Ex: 250 (Auto si vide)"
                    className="w-full px-0 py-2 bg-transparent border-b border-[#E5E5EA] dark:border-[#3A3A3C] text-base text-foreground outline-none focus:border-primary transition-all rounded-none" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Unité</p>
                  <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="ml, pas..."
                    className="w-full px-0 py-2 bg-transparent border-b border-[#E5E5EA] dark:border-[#3A3A3C] text-base text-foreground outline-none focus:border-primary transition-all rounded-none" />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 space-y-4 shadow-sm">
            <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Couleur</p>
            <div className="flex gap-3 flex-wrap">
              {COLORS.map(c => (
                <button type="button" key={c} onClick={() => setColor(c)}
                  className={cn('w-8 h-8 rounded-full transition-all active:scale-90', color === c && 'ring-2 ring-offset-2 ring-offset-[#F2F2F7] dark:ring-offset-[#2C2C2E] scale-110')}
                  style={{ backgroundColor: c, '--tw-ring-color': c }} />
              ))}
            </div>
          </div>

          <button type="submit" disabled={!label.trim()}
            className="w-full py-4 rounded-[14px] bg-[#0A84FF] text-white font-bold text-[15px] disabled:opacity-40 shadow-sm flex items-center justify-center gap-2 active:opacity-80 transition-opacity">
            {submitLabel}
          </button>
        </form>
      </div>
    </>
  )
}

// ── Progress Ring (Style Apple Fitness) ──────────────────────────
function Ring({ pct, color, size = 56 }) {
  const sw = 5.5
  const r = (size - sw) / 2
  const circ = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" className="stroke-[#E5E5EA] dark:stroke-[#3A3A3C]" strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.min(pct, 1))}
        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)', filter: pct >= 1 ? `drop-shadow(0 0 4px ${color}66)` : 'none' }} />
    </svg>
  )
}

// ── Skeleton Card ─────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-[20px] bg-white dark:bg-[#1C1C1E] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-[56px] h-[56px] rounded-full bg-[#E5E5EA] dark:bg-[#3A3A3C] shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded-full w-2/3" />
          <div className="h-2.5 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-full w-1/3" />
        </div>
      </div>
    </div>
  )
}

// ── Goal Card ─────────────────────────────────────────────────────
function GoalCard({ goal, progressData, streak, last7, onToggle, onAddValue, onReset, onDelete, onEdit, swipeX, isBeingDragged }) {
  const { done = false, value = 0 } = progressData || {}
  const [popping, setPopping] = useState(false)
  const [manualInput, setManualInput] = useState(false)
  const [manualValue, setManualValue] = useState('')
  const lastTapTime = useRef(0)

  const pct = goal.type === 'count' ? value / (goal.target || 1) : done ? 1 : 0
  const increment = goal.type === 'count' ? (goal.step || Math.max(1, Math.round(goal.target / 4))) : 1

  function handleManualSubmit(e) {
    if (e) e.preventDefault()
    const val = Number(manualValue)
    if (!isNaN(val) && val > 0) {
      hapticCheck()
      onAddValue(val)
    }
    setManualInput(false)
    setManualValue('')
  }

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
    <div className="relative">
      {swipeX > 0 && (
        <div className="absolute inset-y-0 right-0 flex items-center justify-center bg-[#FF3B30] rounded-[20px]"
          style={{ width: 80, opacity: trashOpacity }}>
          <button onClick={() => { hapticImpact(); onDelete() }}
            className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform">
            <Trash2 className="h-5 w-5 text-white" />
          </button>
        </div>
      )}

      <div className="rounded-[20px] bg-white dark:bg-[#1C1C1E] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4"
        style={{
          transform: `translateX(-${swipeX}px)`,
          opacity: isBeingDragged ? 0.4 : 1,
          transition: 'opacity 0.15s ease-out',
        }}
      >
        {goal.type === 'boolean' ? (
          <div className="flex items-center gap-4">
            <button onClick={handleToggle} className="shrink-0 active:scale-90 transition-transform">
              <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                {goal.emoji}
              </div>
            </button>
            <div className="flex-1 min-w-0 cursor-pointer select-none py-1"
              onDoubleClick={onEdit}
              onPointerUp={handleContentPointerUp}>
              <p className={cn('text-[15px] font-semibold tracking-tight transition-all duration-200', done ? 'text-[#8E8E93] line-through' : 'text-foreground')}>
                {goal.label}
              </p>
            </div>
            <button onClick={handleToggle} className="shrink-0 ml-2">
              <div className={cn(
                'w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-300',
                done ? 'border-transparent' : 'border-[#C7C7CC] dark:border-[#48484A]',
                popping && 'scale-110'
              )} style={{ backgroundColor: done ? goal.color : 'transparent' }}>
                {done && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
              </div>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4 cursor-pointer select-none"
              onDoubleClick={onEdit}
              onPointerUp={handleContentPointerUp}>
              <div className="relative shrink-0">
                <Ring pct={pct} color={goal.color} size={56} />
                <div className="absolute inset-0 flex items-center justify-center text-[22px]">
                  {goal.emoji}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold tracking-tight text-foreground">{goal.label}</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-bold tabular-nums" style={{ color: done ? '#8E8E93' : goal.color }}>{value}</span>
                  <span className="text-[13px] font-medium text-[#8E8E93]">/ {goal.target}{goal.unit ? ` ${goal.unit}` : ''}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-1">
              <button onClick={() => { hapticUncheck(); onReset() }}
                className="px-4 py-2.5 rounded-[12px] bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] transition-colors active:scale-95 font-semibold text-[13px]">
                ↺
              </button>
              {done ? (
                <div className="flex-1 flex items-center justify-center gap-2 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-[14px] py-2">
                  <Check className="h-4 w-4" style={{ color: goal.color }} strokeWidth={3} />
                  <span className="text-[13px] font-semibold" style={{ color: goal.color }}>Objectif atteint</span>
                </div>
              ) : manualInput ? (
                <form onSubmit={handleManualSubmit} className="flex-1 flex gap-2">
                  <input 
                    type="number" autoFocus min="1"
                    placeholder="+" value={manualValue} onChange={e => setManualValue(e.target.value)}
                    className="flex-1 min-w-0 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-[14px] px-3 py-1 text-sm outline-none border border-transparent focus:border-primary"
                  />
                  <button type="submit" disabled={!manualValue} className="px-4 rounded-[14px] font-semibold bg-primary text-primary-foreground text-sm flex items-center transition-opacity active:scale-95">
                    OK
                  </button>
                </form>
              ) : (
                <div className="flex-1 flex gap-2 bg-[#F2F2F7] dark:bg-[#2C2C2E] p-1 rounded-[14px]">
                  <button onClick={() => setManualInput(true)} className="w-10 flex shrink-0 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] transition-colors active:scale-95">
                    ⌨️
                  </button>
                  <button onClick={() => { hapticCheck(); onAddValue(increment) }}
                    className="flex-1 py-1.5 rounded-[10px] text-[13px] font-semibold bg-white dark:bg-[#1C1C1E] text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.1)] active:scale-95 transition-transform">
                    +{increment}
                  </button>
                  <button onClick={() => { hapticCheck(); onAddValue(increment * 2) }}
                    className="flex-1 py-1.5 rounded-[10px] text-[13px] font-semibold bg-white dark:bg-[#1C1C1E] text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.1)] active:scale-95 transition-transform hidden sm:block">
                    +{increment * 2}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F2F2F7] dark:border-[#2C2C2E]">
          {streak > 0 ? (
            <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-[#FF9500]">
              <Flame className="h-3.5 w-3.5" strokeWidth={2.5} />
              {streak} JOUR{streak > 1 ? 'S' : ''}
            </div>
          ) : <div />}

          <div className="flex gap-1.5">
            {last7.map(({ key, done: d, isToday }) => (
              <div key={key}
                className={cn('w-2.5 h-2.5 rounded-full transition-all duration-300', isToday && 'ring-[1.5px] ring-offset-[2px] ring-offset-white dark:ring-offset-[#1C1C1E]')}
                style={{
                  backgroundColor: d ? goal.color : '#E5E5EA',
                  ...(isToday ? { '--tw-ring-color': d ? goal.color : '#8E8E93' } : {})
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function GoalsView({ userId }) {
  const { goals, loading, addGoal, deleteGoal, updateGoal, reorderGoals, toggleGoal, addValue, resetValue, getTodayProgress, getStreak, getLast7Days } = useGoals(userId)
  const [addOpen, setAddOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)

  const todayProg = getTodayProgress()
  const doneCount = goals.filter(g => todayProg[g.id]?.done).length
  const globalPct = goals.length === 0 ? 0 : Math.round((doneCount / goals.length) * 100)

  // ── Swipe-to-delete ──────────────────────────────────────────────
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

  // ── Drag-and-drop ────────────────────────────────────────────────
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
    <div className="max-w-lg mx-auto pb-28 pt-4 px-4 lg:pb-8"
      onClick={() => { if (swipeJustReleased.current) return; if (swipeState.index !== null) closeSwipe() }}>

      {/* ── En-tête iOS ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Objectifs</h1>
          {goals.length > 0 && (
            <p className="text-[13px] font-medium text-[#8E8E93] mt-1">
              {doneCount} sur {goals.length} accompli{doneCount > 1 ? 's' : ''} aujourd'hui
            </p>
          )}
        </div>
        <button onClick={() => setAddOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#0A84FF] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] transition-colors">
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>

      {goals.length > 0 && (
        <div className="mb-6">
          <div className="h-2 w-full bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${globalPct}%`, backgroundColor: globalPct === 100 ? '#34C759' : '#0A84FF' }} />
          </div>
        </div>
      )}

      {loading && goals.length === 0 && (
        <div className="space-y-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      )}

      {!loading && goals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-full flex items-center justify-center text-3xl mb-2">🎯</div>
          <div>
            <p className="text-[17px] font-semibold text-foreground">Aucun objectif</p>
            <p className="text-[15px] text-[#8E8E93] mt-2 max-w-[260px] leading-relaxed">
              Ajoute tes routines quotidiennes pour suivre ta progression.
            </p>
          </div>
          <button onClick={() => setAddOpen(true)}
            className="mt-4 px-6 py-3 rounded-full bg-[#0A84FF] text-white font-semibold text-[15px] active:opacity-80 transition-opacity">
            Créer un objectif
          </button>
        </div>
      )}

      {goals.length > 0 && (
        <div className="flex flex-col gap-4">
          {goals.map((goal, index) => {
            const isSwipeOpen = swipeState.index === index
            const swipeX = isSwipeOpen ? swipeState.x : 0
            const isBeingDragged = dragIndex === index

            return (
              <div key={goal.id}>
                {dragIndex !== null && overIndex === index && dragIndex !== index && dragIndex > index && (
                  <div className="h-[3px] bg-[#0A84FF] rounded-full mx-4 mb-2 animate-in fade-in duration-100" />
                )}

                <div
                  ref={el => cardRefs.current[index] = el}
                  className="relative touch-none"
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

                {dragIndex !== null && overIndex === index && dragIndex !== index && dragIndex < index && (
                  <div className="h-[3px] bg-[#0A84FF] rounded-full mx-4 mt-2 animate-in fade-in duration-100" />
                )}
              </div>
            )
          })}
        </div>
      )}

      {dragIndex !== null && (
        <div style={{
          position: 'fixed', left: ghostPos.x, top: ghostPos.y, width: ghostSize.w,
          pointerEvents: 'none', zIndex: 1000, opacity: 0.95,
          transform: 'scale(1.02) rotate(1deg)',
          filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))',
          willChange: 'transform',
        }}>
          <GoalCard
            goal={goals[dragIndex]} progressData={todayProg[goals[dragIndex]?.id]}
            streak={getStreak(goals[dragIndex]?.id)} last7={getLast7Days(goals[dragIndex]?.id)}
            swipeX={0} isBeingDragged={false}
            onToggle={() => {}} onAddValue={() => {}} onReset={() => {}} onDelete={() => {}} onEdit={() => {}}
          />
        </div>
      )}

      {addOpen && (
        <GoalSheet title="Nouvel objectif" submitLabel="Ajouter" onClose={() => setAddOpen(false)} onSubmit={addGoal} />
      )}
      {editingGoal && (
        <GoalSheet title="Modifier l'objectif" submitLabel="Enregistrer" initial={editingGoal} onClose={() => setEditingGoal(null)} onSubmit={data => updateGoal(editingGoal.id, data)} />
      )}
    </div>
  )
}
