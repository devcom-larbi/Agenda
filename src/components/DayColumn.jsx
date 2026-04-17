import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Block from './Block'
import AddBlockSheet from './AddBlockSheet'
import { hapticImpact } from '../lib/haptic'

const DAY_ABBREV = {
  lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu',
  vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim',
}

export default function DayColumn({ dayName, dayData, onToggle, onUpdate, isToday, dateLabel, isChanged, compact, onAdd, onDelete, weekKey }) {
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const { label, blocks } = dayData
  const doneCount  = blocks.filter(b => b.done).length
  const totalCount = blocks.length
  const pct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)
  const abbrev = DAY_ABBREV[dayName] || label

  // ── Progression pulse ────────────────────────────────────────────
  const hue      = Math.round(pct * 1.2)
  const barColor = `hsl(${hue}, 80%, 48%)`
  const [pulsing, setPulsing] = useState(false)
  const pulseTimer   = useRef(null)
  const prevDone     = useRef(doneCount)
  useEffect(() => {
    if (doneCount === prevDone.current) return
    prevDone.current = doneCount
    if (pulseTimer.current) clearTimeout(pulseTimer.current)
    setPulsing(true)
    pulseTimer.current = setTimeout(() => setPulsing(false), 1400)
    return () => clearTimeout(pulseTimer.current)
  }, [doneCount])
  const barHeight = pulsing ? 6 : 2

  // ── Swipe-to-delete ──────────────────────────────────────────────
  const [swipeState, setSwipeState]   = useState({ index: null, x: 0 })
  const swipeRef     = useRef({ startX: 0, startY: 0, active: false, index: null })
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

  const handlePointerDown = useCallback((e, index) => {
    if (e.target.closest('button')) return
    swipeRef.current = { startX: e.clientX, startY: e.clientY, active: true, index }
    isHorizSwipe.current = false
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (_) {}
  }, [])

  const handlePointerMove = useCallback((e, index) => {
    if (!swipeRef.current.active || swipeRef.current.index !== index) return
    const deltaX = e.clientX - swipeRef.current.startX
    const deltaY = e.clientY - swipeRef.current.startY
    if (!isHorizSwipe.current) {
      if (Math.abs(deltaX) > Math.abs(deltaY) + 4 && Math.abs(deltaX) > 7) {
        isHorizSwipe.current = true
        e.preventDefault()
      }
    }
    if (isHorizSwipe.current) {
      e.preventDefault()
      setSwipeState({ index, x: Math.max(0, -deltaX) })
    }
  }, [])

  const handlePointerUp = useCallback((e, index) => {
    if (isHorizSwipe.current && swipeRef.current.index === index) {
      const swipeX = Math.max(0, -(e.clientX - swipeRef.current.startX))
      if (swipeX < 60) {
        closeSwipe()
      } else {
        // Marquer pour ignorer le click synthétique qui suit immédiatement
        swipeJustReleased.current = true
        setTimeout(() => { swipeJustReleased.current = false }, 100)
        setSwipeState({ index, x: 72 })
        if (swipeAutoClose.current) clearTimeout(swipeAutoClose.current)
        swipeAutoClose.current = setTimeout(closeSwipe, 3000)
      }
    }
    resetSwipe()
  }, [])

  const handlePointerCancel = useCallback(() => {
    closeSwipe()
    resetSwipe()
  }, [])

  if (compact) {
    return (
      <div
        className={cn(
          'snap-start shrink-0 w-[148px] flex flex-col rounded-2xl border overflow-hidden transition-all duration-300',
          isToday   ? 'border-primary/40 bg-primary/5'       : 'border-border bg-card',
          isChanged && 'border-green-400/60 bg-green-500/5'
        )}
        onClick={() => { if (swipeJustReleased.current) return; if (swipeState.index !== null) closeSwipe() }}
      >
        {/* Header */}
        <div className={cn('px-3 py-2.5 flex items-center justify-between shrink-0', isToday && 'bg-primary/10')}>
          <div>
            <p className={cn('text-xs font-bold uppercase tracking-wide', isToday ? 'text-primary' : 'text-foreground')}>
              {abbrev}
            </p>
            <p className="text-[10px] text-muted-foreground tabular-nums">{dateLabel}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {isToday   && <span className="text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">Auj.</span>}
            {isChanged && <span className="text-[9px] font-semibold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">IA</span>}
          </div>
        </div>

        {/* Barre de progression pulse + couleur */}
        <div className="px-3 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-muted-foreground tabular-nums">{doneCount}/{totalCount}</span>
            <span className="text-[9px] font-semibold transition-colors duration-500" style={{ color: pct > 0 ? barColor : undefined }}>
              {pct}%
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
              width: `${pct}%`,
              height: '100%',
              backgroundColor: barColor,
              borderRadius: 'inherit',
              boxShadow: pct > 0 ? `0 0 6px ${barColor}88` : 'none',
              transition: 'width 0.45s ease-out, background-color 0.6s ease-out',
            }} />
          </div>
        </div>

        {/* Blocs avec swipe-to-delete */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
          {blocks.map((block, index) => {
            const isSwipeOpen  = swipeState.index === index
            const swipeX       = isSwipeOpen ? swipeState.x : 0
            const trashOpacity = Math.min(swipeX / 60, 1)

            return (
              <div
                key={`${weekKey}_${block.id}`}
                className="relative overflow-hidden rounded-lg touch-none"
                onPointerDown={e => handlePointerDown(e, index)}
                onPointerMove={e => handlePointerMove(e, index)}
                onPointerUp={e => handlePointerUp(e, index)}
                onPointerCancel={handlePointerCancel}
              >
                {/* Fond rouge swipe */}
                {onDelete && isSwipeOpen && (
                  <div
                    className="absolute inset-y-0 right-0 bg-red-500 flex items-center justify-center rounded-r-lg"
                    style={{ width: 72, opacity: trashOpacity, transition: 'opacity 0.15s ease-out' }}
                  >
                    <button
                      className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
                      onClick={e => { e.stopPropagation(); hapticImpact(); onDelete(dayName, block.id); closeSwipe() }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-white" />
                      <span className="text-[8px] text-white font-semibold">Suppr.</span>
                    </button>
                  </div>
                )}

                {/* Bloc glissant */}
                <div style={{
                  transform: `translateX(-${swipeX}px)`,
                  transition: isHorizSwipe.current ? 'none' : 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                }}>
                  <Block
                    block={block}
                    onToggle={() => onToggle(dayName, block.id)}
                    onUpdate={updates => onUpdate(dayName, block.id, updates)}
                    compact
                  />
                </div>
              </div>
            )
          })}

          {onAdd && (
            <button
              onClick={() => setAddSheetOpen(true)}
              className="flex items-center justify-center gap-1 w-full py-1.5 rounded-lg border border-dashed border-border/40 text-muted-foreground/30 hover:border-primary/40 hover:text-primary/50 transition-all duration-200"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>

        {addSheetOpen && (
          <AddBlockSheet
            dayName={label || dayName}
            onClose={() => setAddSheetOpen(false)}
            onAdd={blockData => { onAdd(dayName, blockData); setAddSheetOpen(false) }}
          />
        )}
      </div>
    )
  }

  // ── Vue normale (non-compact) ────────────────────────────────────
  return (
    <div className={cn(
      'flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 bg-card',
      isToday   && 'ring-1 ring-primary',
      isChanged && 'ring-2 ring-green-400 bg-green-500/5'
    )}>
      <div className={cn('px-4 py-3 shrink-0 border-b border-border', isToday && 'bg-primary/5')}>
        <div className="flex items-center justify-between">
          <p className={cn('font-semibold capitalize text-sm', isToday ? 'text-primary' : 'text-foreground')}>{label}</p>
          <div className="flex items-center gap-1">
            {isChanged && <span className="text-[9px] font-semibold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">modifié</span>}
            {isToday   && <span className="text-[10px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-sm">Auj.</span>}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">{dateLabel}</p>
      </div>

      <div className="flex-1 flex flex-col gap-1.5 px-3 pb-3 pt-2">
        {blocks.map(block => (
          <Block
            key={block.id}
            block={block}
            onToggle={() => onToggle(dayName, block.id)}
            onUpdate={updates => onUpdate(dayName, block.id, updates)}
          />
        ))}
      </div>

      {/* Barre de progression non-compact */}
      <div className="px-3 pb-3 shrink-0 space-y-1">
        <div className="flex justify-between">
          <span className="text-[10px] text-muted-foreground tabular-nums">{doneCount}/{totalCount}</span>
          <span className="text-[10px] font-medium transition-colors duration-500" style={{ color: pct > 0 ? barColor : undefined }}>{pct}%</span>
        </div>
        <div
          className="w-full bg-muted/50 rounded-full overflow-hidden"
          style={{
            height: `${barHeight}px`,
            transition: pulsing ? 'height 0.12s ease-out' : 'height 1s ease-in-out',
          }}
        >
          <div style={{
            width: `${pct}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: 'inherit',
            boxShadow: pct > 0 ? `0 0 6px ${barColor}88` : 'none',
            transition: 'width 0.45s ease-out, background-color 0.6s ease-out',
          }} />
        </div>
      </div>
    </div>
  )
}
