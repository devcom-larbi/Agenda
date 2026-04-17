import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, MoreHorizontal, CheckCheck, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DAYS_ORDER } from '../data/schedule'
import { getCurrentDayName, getWeekDatesForKey, formatShortDate, isCurrentDay } from '../utils/dateUtils'
import Block from './Block'
import AddBlockSheet from './AddBlockSheet'
import { toast } from 'sonner'
import { hapticImpact } from '../lib/haptic'

function parseBlockStartMinutes(timeStr) {
  const m = timeStr?.match(/^(\d{1,2})h(\d*)/)
  if (!m) return null
  return parseInt(m[1]) * 60 + (parseInt(m[2]) || 0)
}

export default function DayView({ schedule, onToggle, onUpdate, weekKey, onAdd, onDelete, onNextWeek, onPrevWeek, onReorder, initialDayIndex }) {
  const todayName = getCurrentDayName()
  const todayIndex = DAYS_ORDER.indexOf(todayName)
  const [dayIndex, setDayIndex] = useState(
    initialDayIndex !== undefined ? initialDayIndex : (todayIndex >= 0 ? todayIndex : 0)
  )

  const dayName = DAYS_ORDER[dayIndex]
  const dayData = schedule[dayName]
  const isToday = isCurrentDay(dayName, weekKey)
  const weekDates = getWeekDatesForKey(weekKey)

  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // ── Progression ──────────────────────────────────────────────────
  const totalBlocks = dayData.blocks.length
  const completedBlocks = dayData.blocks.filter(b => b.done).length
  const progressPercent = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0
  const hue = Math.round(progressPercent * 1.2)
  const barColor = `hsl(${hue}, 80%, 48%)`

  // Pulse : la barre se soulève brièvement à chaque cochage puis redescend
  const [pulsing, setPulsing] = useState(false)
  const pulseTimer = useRef(null)
  const prevCompleted = useRef(completedBlocks)
  useEffect(() => {
    if (completedBlocks === prevCompleted.current) return
    prevCompleted.current = completedBlocks
    if (pulseTimer.current) clearTimeout(pulseTimer.current)
    setPulsing(true)
    pulseTimer.current = setTimeout(() => setPulsing(false), 1400)
    return () => clearTimeout(pulseTimer.current)
  }, [completedBlocks])

  const barHeight = pulsing ? 8 : 2

  // ── Heure courante ───────────────────────────────────────────────
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date(); return n.getHours() * 60 + n.getMinutes()
  })
  useEffect(() => {
    const interval = setInterval(() => {
      const n = new Date(); setNowMinutes(n.getHours() * 60 + n.getMinutes())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const timeIndicatorIndex = (() => {
    if (!isToday) return null
    const idx = dayData.blocks.findIndex(b => {
      const t = parseBlockStartMinutes(b.time)
      return t !== null && t > nowMinutes
    })
    return idx === -1 ? null : idx
  })()

  // ── Swipe-to-delete ──────────────────────────────────────────────
  const [swipeState, setSwipeState] = useState({ index: null, x: 0 })
  const swipeRef = useRef({ startX: 0, startY: 0, active: false, index: null })
  const isHorizSwipe = useRef(false)
  const swipeAutoClose = useRef(null)
  const swipeJustReleased = useRef(false)

  function closeSwipe() {
    setSwipeState({ index: null, x: 0 })
    if (swipeAutoClose.current) {
      clearTimeout(swipeAutoClose.current)
      swipeAutoClose.current = null
    }
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
  const blockItemRefs = useRef([])
  const dragStartPos = useRef({ x: 0, y: 0 })
  const isDragging = useRef(false)

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function resetDrag() {
    isDragging.current = false
    setDragIndex(null)
    setOverIndex(null)
  }

  const handlePointerDown = useCallback((e, index) => {
    if (e.target.closest('button')) return
    const rect = blockItemRefs.current[index]?.getBoundingClientRect()
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
        try { blockItemRefs.current[index]?.setPointerCapture(e.pointerId) } catch (_) {}
      }
    }, 480)
  }, [])

  const handlePointerMove = useCallback((e, index) => {
    const deltaX = e.clientX - dragStartPos.current.x
    const deltaY = e.clientY - dragStartPos.current.y

    // Détection swipe horizontal → annule le long press
    if (!isHorizSwipe.current && swipeRef.current.active && swipeRef.current.index === index) {
      if (Math.abs(deltaX) > Math.abs(deltaY) + 4 && Math.abs(deltaX) > 7) {
        isHorizSwipe.current = true
        cancelLongPress()
      }
    }

    // Mise à jour swipe (seulement vers la gauche)
    if (isHorizSwipe.current && swipeRef.current.index === index && !isDragging.current) {
      setSwipeState({ index, x: Math.max(0, -deltaX) })
      return
    }

    // Mise à jour ghost drag
    if (isDragging.current && dragIndex !== null) {
      setGhostPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
      let closest = dragIndex
      let closestDist = Infinity
      blockItemRefs.current.forEach((ref, i) => {
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

    // Finaliser swipe
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

    // Finaliser drag
    if (isDragging.current) {
      const from = dragIndex
      const to = overIndex
      if (from !== null && to !== null && from !== to) {
        const newBlocks = [...dayData.blocks]
        const [moved] = newBlocks.splice(from, 1)
        newBlocks.splice(to, 0, moved)
        onReorder(dayName, newBlocks)
        hapticImpact()
      }
      resetDrag()
      resetSwipe()
      return
    }

    resetSwipe()
  }, [dragIndex, overIndex, dayData.blocks, dayName, onReorder])

  const handlePointerCancel = useCallback(() => {
    cancelLongPress()
    resetDrag()
    closeSwipe()
    resetSwipe()
  }, [])

  // ── Actions journée ───────────────────────────────────────────────
  function handleMarkAllDone() {
    dayData.blocks.forEach(b => { if (!b.done) onToggle(dayName, b.id) })
    setMenuOpen(false)
    toast.success('Tous les blocs marqués comme terminés !')
  }

  function handleClearDay() {
    if (confirm('Voulez-vous vraiment supprimer tous les blocs de cette journée ?')) {
      dayData.blocks.forEach(b => onDelete(dayName, b.id))
      setMenuOpen(false)
      toast.success('Journée vidée.')
    }
  }

  const nowLabel = `${String(Math.floor(nowMinutes / 60)).padStart(2, '0')}h${String(nowMinutes % 60).padStart(2, '0')}`

  return (
    <div
      className="max-w-lg mx-auto space-y-4"
      onClick={() => { if (swipeJustReleased.current) return; if (swipeState.index !== null) closeSwipe(); if (menuOpen) setMenuOpen(false) }}
    >

      {/* Navigation + Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon"
          onClick={() => dayIndex === 0 ? onPrevWeek?.() : setDayIndex(i => i - 1)}
          disabled={dayIndex === 0 && !onPrevWeek}
          className="h-8 w-8 rounded-full border-muted-foreground/20 transition-opacity"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="text-center flex-1 relative">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-lg font-bold capitalize tracking-tight">{dayData.label || dayName}</h2>
            {isToday && (
              <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full shadow-sm">
                AUJOURD'HUI
              </span>
            )}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-muted-foreground/60 hover:text-foreground transition-colors"
                onClick={() => setMenuOpen(v => !v)}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
              {menuOpen && (
                <div className="absolute top-8 right-0 w-44 bg-card border border-border rounded-xl shadow-2xl z-30 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  <button onClick={handleMarkAllDone} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left hover:bg-muted transition-colors border-b border-border/40">
                    <CheckCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                    Tout cocher
                  </button>
                  <button onClick={handleClearDay} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left hover:bg-red-500/10 text-red-500 transition-colors">
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    Vider la journée
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            {weekDates[dayName] ? formatShortDate(weekDates[dayName]) : ''}{dayData.type ? ` · ${dayData.type}` : ''}
          </p>
        </div>

        <Button variant="outline" size="icon"
          onClick={() => dayIndex === DAYS_ORDER.length - 1 ? onNextWeek?.() : setDayIndex(i => i + 1)}
          disabled={dayIndex === DAYS_ORDER.length - 1 && !onNextWeek}
          className="h-8 w-8 rounded-full border-muted-foreground/20"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Barre de progression */}
      <div className="space-y-1">
        <div className="flex justify-between items-center px-0.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Progression</span>
          <span className="text-xs font-bold transition-colors duration-500" style={{ color: barColor }}>
            {completedBlocks}/{totalBlocks}
            <span className="text-muted-foreground font-normal"> ({progressPercent}%)</span>
          </span>
        </div>
        <div
          className="w-full bg-muted/50 rounded-full overflow-hidden"
          style={{
            height: `${barHeight}px`,
            transition: pulsing ? 'height 0.12s ease-out' : 'height 1s ease-in-out',
          }}
        >
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: 'inherit',
            boxShadow: progressPercent > 0 ? `0 0 8px ${barColor}88` : 'none',
            transition: 'width 0.45s ease-out, background-color 0.6s ease-out',
          }} />
        </div>
      </div>

      {/* Blocs */}
      <div className="flex flex-col gap-2">
        {dayData.blocks.map((block, index) => {
          const isBeingDragged = dragIndex === index
          const isSwipeOpen = swipeState.index === index
          const swipeX = isSwipeOpen ? swipeState.x : 0
          const trashOpacity = Math.min(swipeX / 60, 1)

          return (
            <div key={`${weekKey}_${block.id}`}>
              {/* Indicateur heure courante */}
              {timeIndicatorIndex === index && (
                <div className="flex items-center gap-2 mb-1.5 pointer-events-none">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
                  <div className="flex-1 h-px bg-red-500/40" />
                  <span className="text-[9px] text-red-400 font-semibold tabular-nums">{nowLabel}</span>
                </div>
              )}

              {/* Wrapper drag + swipe */}
              <div
                ref={el => blockItemRefs.current[index] = el}
                className="relative overflow-hidden rounded-lg touch-none"
                onPointerDown={e => handlePointerDown(e, index)}
                onPointerMove={e => handlePointerMove(e, index)}
                onPointerUp={e => handlePointerUp(e, index)}
                onPointerCancel={handlePointerCancel}
                style={{
                  opacity: isBeingDragged ? 0.25 : 1,
                  transition: 'opacity 0.15s ease-out',
                }}
              >
                {/* Fond rouge — proportionnel au swipe */}
                {onDelete && isSwipeOpen && (
                  <div
                    className="absolute inset-y-0 right-0 bg-red-500 flex items-center justify-center rounded-r-lg"
                    style={{ width: 80, opacity: trashOpacity, transition: 'opacity 0.15s ease-out' }}
                  >
                    <button
                      className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
                      onClick={(e) => { e.stopPropagation(); hapticImpact(); onDelete(dayName, block.id); closeSwipe() }}
                    >
                      <Trash2 className="h-4 w-4 text-white" />
                      <span className="text-[9px] text-white font-semibold">Suppr.</span>
                    </button>
                  </div>
                )}

                {/* Bloc glissant */}
                <div
                  className="relative z-10"
                  style={{
                    transform: `translateX(-${swipeX}px)`,
                    transition: isHorizSwipe.current ? 'none' : 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  }}
                >
                  <Block
                    block={block}
                    onToggle={() => onToggle(dayName, block.id)}
                    onUpdate={(updates) => onUpdate(dayName, block.id, updates)}
                  />
                </div>
              </div>

              {/* Indicateur de drop */}
              {dragIndex !== null && overIndex === index && dragIndex !== index && (
                <div className="h-0.5 bg-primary/70 rounded-full mx-3 mt-1 animate-in fade-in duration-100" />
              )}
            </div>
          )
        })}

        {/* Indicateur heure si après tous les blocs */}
        {timeIndicatorIndex === null && isToday && dayData.blocks.length > 0 && (
          <div className="flex items-center gap-2 pointer-events-none">
            <div className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
            <div className="flex-1 h-px bg-red-500/40" />
            <span className="text-[9px] text-red-400 font-semibold tabular-nums">{nowLabel}</span>
          </div>
        )}

        {/* Bouton ajouter */}
        {onAdd && (
          <button
            onClick={() => setAddSheetOpen(true)}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-dashed border-border/50 text-muted-foreground/40 hover:border-primary/40 hover:text-primary/60 transition-all duration-200 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter un bloc
          </button>
        )}
      </div>

      {/* Ghost drag */}
      {dragIndex !== null && (
        <div
          style={{
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
          }}
        >
          <Block block={dayData.blocks[dragIndex]} onToggle={() => {}} />
        </div>
      )}

      {addSheetOpen && (
        <AddBlockSheet
          dayName={dayData.label || dayName}
          onClose={() => setAddSheetOpen(false)}
          onAdd={(blockData) => onAdd(dayName, blockData)}
        />
      )}

      {/* Sélecteur jours */}
      <div className="flex justify-center gap-1 pt-1 flex-wrap">
        {DAYS_ORDER.map((name, idx) => {
          const isSelected = idx === dayIndex
          const isT = name === todayName
          const dateNum = weekDates[name] ? format(weekDates[name], 'd') : ''
          return (
            <button
              key={name}
              onClick={() => setDayIndex(idx)}
              className={cn(
                'text-[10px] px-2 py-1 rounded-lg font-medium transition-all duration-200 flex flex-col items-center leading-tight min-w-[2rem]',
                isSelected ? 'bg-primary text-primary-foreground shadow-sm' :
                isT        ? 'bg-primary/10 text-primary' :
                             'text-muted-foreground hover:bg-accent'
              )}
            >
              <span>{name.slice(0, 3)}</span>
              <span className="text-[8px] opacity-60 tabular-nums">{dateNum}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
