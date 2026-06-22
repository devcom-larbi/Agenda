import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Block from './Block'
import AddBlockSheet from './AddBlockSheet'
import { hapticImpact } from '../lib/haptic'


export default function DayColumn({ dayName, dayData, onToggle, onUpdate, isToday, dateLabel, isChanged, onAdd, onDelete, weekKey }) {
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const { label, blocks } = dayData
  const doneCount  = blocks.filter(b => b.done).length
  const totalCount = blocks.length
  const pct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)


  const barColor = isToday ? '#0A84FF' : '#8E8E93'
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
  const barHeight = pulsing ? 6 : 4

  const [swipeState, setSwipeState] = useState({ index: null, x: 0 })
  const swipeRef     = useRef({ startX: 0, startY: 0, active: false, index: null })
  const isHorizSwipe = useRef(false)
  const swipeAutoClose = useRef(null)
  const swipeJustReleased = useRef(false)
  const lastClickTime = useRef(0)

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
    const now = Date.now()
    if (e.detail > 1 || (now - lastClickTime.current < 300)) { lastClickTime.current = now; return }
    lastClickTime.current = now
    swipeRef.current = { startX: e.clientX, startY: e.clientY, active: true, index }
    isHorizSwipe.current = false
  }, [])

  const handlePointerMove = useCallback((e, index) => {
    if (!swipeRef.current.active || swipeRef.current.index !== index) return
    const deltaX = e.clientX - swipeRef.current.startX
    const deltaY = e.clientY - swipeRef.current.startY
    const dist = Math.sqrt(deltaX ** 2 + deltaY ** 2)
    if (dist > 8 && !isHorizSwipe.current) {
      if (Math.abs(deltaX) > Math.abs(deltaY) + 6 && Math.abs(deltaX) > 10) {
        isHorizSwipe.current = true
        e.preventDefault()
      }
    }
    if (isHorizSwipe.current) {
      e.preventDefault()
      const rawX = Math.max(0, -deltaX)
      setSwipeState({ index, x: rawX > 80 ? 80 + Math.log10(1 + (rawX - 80) / 10) * 20 : rawX })
    }
  }, [])

  const handlePointerUp = useCallback((e, index) => {
    if (isHorizSwipe.current && swipeRef.current.index === index) {
      const swipeX = Math.max(0, -(e.clientX - swipeRef.current.startX))
      if (swipeX < 60) {
        closeSwipe()
      } else {
        swipeJustReleased.current = true
        setTimeout(() => { swipeJustReleased.current = false }, 100)
        setSwipeState({ index, x: 72 })
        if (swipeAutoClose.current) clearTimeout(swipeAutoClose.current)
        swipeAutoClose.current = setTimeout(closeSwipe, 3000)
      }
    }
    resetSwipe()
  }, [])

  const handlePointerCancel = useCallback(() => { closeSwipe(); resetSwipe() }, [])

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden rounded-3xl transition-all duration-300 bg-white dark:bg-[#1C1C1E] shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
      onClick={() => { if (swipeJustReleased.current) return; if (swipeState.index !== null) closeSwipe() }}
    >
      {/* ── En-tête iOS ────────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-3 shrink-0 flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <span className={cn(
            'text-[13px] font-semibold tracking-wide uppercase',
            isToday ? 'text-[#FF3B30] dark:text-[#FF453A]' : 'text-[#8E8E93]'
          )}>
            {label}
          </span>
          <span className="text-3xl font-bold tracking-tight text-foreground">
            {dateLabel}
          </span>
        </div>

        <div className="flex flex-col items-end gap-2">
          {isChanged && (
            <span className="text-[10px] font-medium bg-[#F2F2F7] dark:bg-[#2C2C2E] text-muted-foreground px-2 py-0.5 rounded-full">
              Généré par l'IA
            </span>
          )}
          {onAdd && (
            <button
              onClick={e => { e.stopPropagation(); setAddSheetOpen(true) }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#0A84FF] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] transition-colors"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* ── Barre de progression ──────────────────────────────────── */}
      <div className="px-4 pb-4 shrink-0">
        <div
          className="w-full bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded-full overflow-hidden"
          style={{ height: `${barHeight}px`, transition: pulsing ? 'height 0.12s ease-out' : 'height 1s ease-in-out' }}
        >
          <div style={{
            width: `${pct}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: 'inherit',
            transition: 'width 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }} />
        </div>
      </div>

      {/* ── Liste des blocs ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
        {blocks.length === 0 && (
          <div className="flex items-center justify-center h-24 text-[#8E8E93] text-sm">
            Aucun événement
          </div>
        )}

        {blocks.map((block, index) => {
          const isSwipeOpen  = swipeState.index === index
          const swipeX       = isSwipeOpen ? swipeState.x : 0
          const trashOpacity = Math.min(swipeX / 60, 1)

          return (
            <div
              key={`${weekKey}_${block.id}`}
              className="relative overflow-hidden rounded-[10px] touch-none select-none"
              onPointerDown={e => handlePointerDown(e, index)}
              onPointerMove={e => handlePointerMove(e, index)}
              onPointerUp={e => handlePointerUp(e, index)}
              onPointerCancel={handlePointerCancel}
            >
              {onDelete && isSwipeOpen && (
                <div
                  className="absolute inset-y-0 right-0 bg-[var(--danger)] flex items-center justify-center rounded-r-[10px]"
                  style={{ width: 72, opacity: trashOpacity, transition: 'opacity 0.15s ease-out' }}
                >
                  <button
                    className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
                    onClick={e => { e.stopPropagation(); hapticImpact(); onDelete(dayName, block.id); closeSwipe() }}
                  >
                    <Trash2 className="h-4 w-4 text-white" />
                  </button>
                </div>
              )}

              <div
                className="h-[52px]"
                style={{
                  transform: `translateX(-${swipeX}px)`,
                  transition: isHorizSwipe.current ? 'none' : 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                }}
              >
                <Block
                  block={block}
                  onToggle={() => onToggle(dayName, block.id)}
                  onUpdate={updates => onUpdate(dayName, block.id, updates)}
                  height={50}
                />
              </div>
            </div>
          )
        })}
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
