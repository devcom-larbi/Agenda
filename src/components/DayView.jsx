import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Check, Trash2, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { DAYS_ORDER } from '../data/schedule'
import { getCurrentDayName, getWeekDatesForKey, isCurrentDay } from '../utils/dateUtils'
import AddBlockSheet from './AddBlockSheet'
import { hapticImpact } from '../lib/haptic'
import { useCategories } from '../contexts/CategoriesContext'
import BlockDetail from './BlockDetail'

const HOUR_H = 56

// ── Helpers ───────────────────────────────────────────────────────

function parseTime(timeVal) {
  if (!timeVal) return { start: 0, end: 60 }
  // Object format: { start: 'HH:MM', end: 'HH:MM' }
  if (typeof timeVal === 'object') {
    const toMin = (s) => {
      if (!s) return 0
      const parts = s.split(':')
      return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0)
    }
    const start = toMin(timeVal.start)
    const end = timeVal.end ? toMin(timeVal.end) : start + 60
    return { start, end: end > start ? end : end + 1440 }
  }
  // String format: "9h00 → 10h00" or "09:00 – 10:00" or "À définir"
  const parts = timeVal.split(/\s*[–→]\s*/).map(s => s.trim())
  const parseOne = (s) => {
    const m = s.match(/(\d{1,2})[h:](\d{0,2})/)
    if (!m) return 0
    return parseInt(m[1]) * 60 + (parseInt(m[2]) || 0)
  }
  const start = parseOne(parts[0])
  let end = parts[1] ? parseOne(parts[1]) : start + 60
  if (end <= start) end += 1440
  return { start, end }
}

function fmtRange(t) {
  if (!t) return ''
  if (typeof t === 'object') {
    if (t.start && t.end) return `${t.start} – ${t.end}`
    return t.start || t.end || ''
  }
  return t.replace(/\s*[–→]\s*/g, ' – ')
}

// ── Block (list view) ─────────────────────────────────────────────

function Block({ block, onToggle, onSelect, onDelete, currentMin, onDragStart, isDragging, dragOffset }) {
  const { getCategoryDetails } = useCategories()
  const baseCat = getCategoryDetails(block.category)
  const cat = { ...baseCat, color: block.color || baseCat?.color }
  const { start, end } = parseTime(block.time)
  const isPast = currentMin > end
  const isNow = currentMin >= start && currentMin < end

  const contentRef = useRef(null)
  const lastTouchTime = useRef(0)
  const lastTapTime = useRef(0)
  const tapTimer = useRef(null)
  const mouseClickCount = useRef(0)
  const mouseClickTimer = useRef(null)
  const [deleteProgress, setDeleteProgress] = useState(0)

  const onToggleRef = useRef(onToggle)
  const onSelectRef = useRef(onSelect)
  const onDeleteRef = useRef(onDelete)
  const onDragStartRef = useRef(onDragStart)
  const blockRef = useRef(block)
  useEffect(() => {
    onToggleRef.current = onToggle
    onSelectRef.current = onSelect
    onDeleteRef.current = onDelete
    onDragStartRef.current = onDragStart
    blockRef.current = block
  })

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const SWIPE_THRESHOLD = 80
    const LONG_PRESS_MS = 500
    let startX = 0, startY = 0, curX = 0, dir = null
    let longPressTimer = null
    let longPressed = false

    function onStart(e) {
      if (e.touches.length !== 1) return
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      dir = null; curX = 0; longPressed = false

      longPressTimer = setTimeout(() => {
        longPressed = true
        hapticImpact()
        onDragStartRef.current?.(blockRef.current.id, e.touches[0].clientY)
      }, LONG_PRESS_MS)
    }

    function onMove(e) {
      if (e.touches.length !== 1) return
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY
      if (!dir) {
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return
        dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      }
      // Cancel long press on any significant movement
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        clearTimeout(longPressTimer)
      }
      if (longPressed) return // drag handled by ListView
      if (dir !== 'h' || dx > 0) return
      e.preventDefault()
      curX = Math.max(dx, -(SWIPE_THRESHOLD + 24))
      el.style.transform = `translateX(${curX}px)`
      setDeleteProgress(Math.min(Math.abs(curX) / SWIPE_THRESHOLD, 1))
    }

    function onEnd() {
      clearTimeout(longPressTimer)
      if (longPressed) { longPressed = false; return }
      const now = Date.now()
      lastTouchTime.current = now

      if (curX < -SWIPE_THRESHOLD) {
        hapticImpact()
        onDeleteRef.current?.()
      } else if (Math.abs(curX) > 5) {
        el.style.transition = 'transform 0.25s cubic-bezier(0.2,0.8,0.2,1)'
        el.style.transform = 'translateX(0)'
        setTimeout(() => { el.style.transition = '' }, 300)
        setDeleteProgress(0)
      } else {
        setDeleteProgress(0)
        if (now - lastTapTime.current < 320) {
          clearTimeout(tapTimer.current)
          lastTapTime.current = 0
          onSelectRef.current(blockRef.current)
        } else {
          lastTapTime.current = now
          tapTimer.current = setTimeout(() => {
            lastTapTime.current = 0
            onToggleRef.current()
            hapticImpact()
          }, 300)
        }
      }
      curX = 0; dir = null
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      clearTimeout(longPressTimer)
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [])

  function handleClick() {
    if (Date.now() - lastTouchTime.current < 600) return
    mouseClickCount.current++
    if (mouseClickCount.current === 1) {
      mouseClickTimer.current = setTimeout(() => {
        onToggle(); hapticImpact(); mouseClickCount.current = 0
      }, 250)
    } else {
      clearTimeout(mouseClickTimer.current)
      mouseClickCount.current = 0
      onSelect(block)
    }
  }

  return (
    <div
      className="relative overflow-hidden mb-2"
      style={{
        transform: isDragging ? `translateY(${dragOffset ?? 0}px) scale(1.03)` : undefined,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.92 : 1,
        transition: isDragging ? 'none' : 'transform 0.2s ease',
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.18)' : undefined,
        borderRadius: isDragging ? '12px' : undefined,
      }}
    >
      {!isDragging && (
        <div className="absolute inset-0 flex items-center justify-end px-4 rounded-[12px]"
          style={{ background: `rgba(239,68,68,${0.15 + deleteProgress * 0.85})` }}>
          <Trash2 size={15} className="text-white" style={{ opacity: deleteProgress }} />
        </div>
      )}

      <div ref={contentRef} onClick={handleClick}
        className={`relative w-full text-left flex gap-2 cursor-pointer select-none
          ${isNow && !block.done ? 'scale-[1.01]' : ''}`}
      >
        {/* Drag handle — visible as hint */}
        <div className="w-[4px] shrink-0 rounded-full" style={{ background: cat.color }} />
        <div className={`flex-1 border rounded-[12px] p-3 ${block.done ? 'opacity-50' : ''} ${isNow && !block.done ? 'ring-1 ring-[var(--line-strong)] border-transparent' : ''}`}
          style={{ background: 'var(--surface-0)', borderColor: 'var(--line)' }}>
          <div className="flex items-start justify-between gap-2">
            <div className={`text-[14px] font-semibold tracking-[-0.01em] flex items-center gap-2 min-w-0 ${block.done ? 'line-through text-[var(--text-3)]' : 'text-[var(--text-1)]'}`}>
              {block.emoji && <span className="text-[16px] shrink-0">{block.emoji}</span>}
              <span className="truncate">{block.label}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <GripVertical size={13} className="text-[var(--text-3)] opacity-40" />
              <div className={`w-[22px] h-[22px] rounded-full border flex items-center justify-center transition-all ${block.done ? 'bg-[var(--ink)] border-[var(--ink)] text-[var(--bg)]' : 'border-[var(--line-strong)]'}`}>
                {block.done && <Check size={13} strokeWidth={2.5} />}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="text-[11.5px] text-[var(--text-3)] tabular-nums flex items-center gap-1.5">
              <span>{fmtRange(block.time)}</span>
              <span className="opacity-40">·</span>
              <span className="uppercase tracking-widest text-[9.5px] font-semibold" style={{ color: cat.color }}>{cat?.label}</span>
              {block.note && <span className="opacity-40 truncate max-w-[100px]">· {block.note}</span>}
            </div>
            {isPast && !block.done && (
              <span className="text-[9.5px] uppercase tracking-wider font-semibold shrink-0 ml-1" style={{ color: 'var(--accent)' }}>Manqué</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── TimelineBlock ─────────────────────────────────────────────────

function TimelineBlock({ b, cat: baseCat, top, height, onToggle, onSelect }) {
  const clickCount = useRef(0)
  const clickTimer = useRef(null)
  const cat = { ...baseCat, color: b.color || baseCat?.color }
  const bgOpacity = b.bgOpacity || '15'

  function handleClick(e) {
    e.stopPropagation()
    clickCount.current++
    if (clickCount.current === 1) {
      clickTimer.current = setTimeout(() => { onToggle(); hapticImpact(); clickCount.current = 0 }, 230)
    } else {
      clearTimeout(clickTimer.current); clickCount.current = 0; onSelect()
    }
  }

  return (
    <div className="absolute left-0 right-0 px-1 cursor-pointer select-none" style={{ top, height }} onClick={handleClick}>
      <div className={`h-full rounded-[8px] px-2 py-1 overflow-hidden border-l-[3px] transition-opacity ${b.done ? 'opacity-40' : ''}`}
        style={{
          background: `${cat.color}${bgOpacity}`,
          borderColor: cat.color,
          borderTopWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px',
          borderTopColor: `${cat.color}40`, borderRightColor: `${cat.color}40`, borderBottomColor: `${cat.color}40`,
        }}>
        <div className={`text-[11px] font-semibold leading-tight truncate ${b.done ? 'line-through text-[var(--text-3)]' : 'text-[var(--text-1)]'}`}>
          {b.emoji && <span className="mr-1">{b.emoji}</span>}
          {b.label}
        </div>
        {height > 40 && (
          <div className="text-[9.5px] text-[var(--text-3)] tabular-nums mt-0.5">{fmtRange(b.time)}</div>
        )}
      </div>
    </div>
  )
}

// ── TimelineView ──────────────────────────────────────────────────

function TimelineView({ schedule, dayKey, onToggle, onSelect, onAddClick, onAdd }) {
  const day = schedule[dayKey]
  const blocks = day?.blocks || []
  const { getCategoryDetails } = useCategories()
  const innerRef = useRef(null)
  const nowLineRef = useRef(null)

  const now = new Date()
  const [liveMin, setLiveMin] = useState(now.getHours() * 60 + now.getMinutes())

  // Update time indicator every minute
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setLiveMin(d.getHours() * 60 + d.getMinutes())
    }
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  // Scroll to current time on mount
  useEffect(() => {
    if (!nowLineRef.current) return
    setTimeout(() => {
      nowLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
  }, [])

  const HOUR_START = 0
  const HOUR_END = 23
  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i)

  function handleTimelineClick(e) {
    if (e.target !== innerRef.current && !innerRef.current?.contains(e.target)) return
    // Ignore clicks on existing blocks
    if (e.target.closest('[data-block]')) return
    const rect = innerRef.current?.getBoundingClientRect()
    if (!rect) return
    const y = e.clientY - rect.top
    const rawMin = HOUR_START * 60 + (y / HOUR_H) * 60
    const snapped = Math.round(rawMin / 15) * 15
    const clamped = Math.max(HOUR_START * 60, Math.min(HOUR_END * 60, snapped))
    const fmt = (min) => {
      const h = Math.floor(min / 60) % 24
      const m = min % 60
      return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
    }
    hapticImpact()
    onAdd({ label: 'À définir', time: `${fmt(clamped)} → ${fmt(Math.min(clamped + 60, 24 * 60))}`, category: 'rest', priority: 'normal', description: '', done: false })
  }

  const nowTop = ((liveMin - HOUR_START * 60) / 60) * HOUR_H
  const nowVisible = liveMin >= HOUR_START * 60 && liveMin <= (HOUR_END + 1) * 60

  return (
    <div className="relative pb-16">
      <div className="grid" style={{ gridTemplateColumns: '48px 1fr', gap: 0 }}>
        {/* Hours column */}
        <div className="relative">
          {hours.map((h) => (
            <div key={h} className="text-[10px] tabular-nums text-[var(--text-3)] font-medium -mt-1.5 pr-2 text-right" style={{ height: HOUR_H }}>
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Grid + blocks */}
        <div ref={innerRef} className="relative border-l border-[var(--line)]" onClick={handleTimelineClick}>
          {hours.map((h) => (
            <div key={h} className="border-b border-[var(--line)]/50" style={{ height: HOUR_H }} />
          ))}

          {/* Current time indicator */}
          {nowVisible && (
            <div ref={nowLineRef} className="absolute left-0 right-0 pointer-events-none z-20" style={{ top: nowTop }}>
              <div className="flex items-center">
                <div className="h-2 w-2 rounded-full bg-red-500 -ml-1 shrink-0" />
                <div className="flex-1 h-[1.5px] bg-red-500" />
              </div>
            </div>
          )}

          {/* Blocks */}
          <div className="absolute inset-0 px-1.5 py-0">
            {blocks.map((b) => {
              const { start, end } = parseTime(b.time)
              const top = ((start - HOUR_START * 60) / 60) * HOUR_H
              const height = Math.max(28, ((end - start) / 60) * HOUR_H - 4)
              if (start < HOUR_START * 60 || start >= (HOUR_END + 1) * 60) return null
              const cat = getCategoryDetails(b.category)
              return (
                <div key={b.id} data-block="1">
                  <TimelineBlock b={b} cat={cat} top={top} height={height}
                    onToggle={() => onToggle(dayKey, b.id)}
                    onSelect={() => onSelect(b)} />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button onClick={onAddClick}
          className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-1)] rounded-[10px] transition-all border border-dashed border-[var(--line)] hover:border-[var(--line-strong)]">
          <Plus size={14} /> <span>Ajouter un bloc</span>
        </button>
      </div>
    </div>
  )
}

// ── ListView with drag-to-reorder ─────────────────────────────────

function ListView({ schedule, dayKey, onToggle, onSelect, onAddClick, onDelete, onReorder }) {
  const day = schedule[dayKey]
  const blocks = day?.blocks || []
  const now = new Date()
  const liveMin = now.getHours() * 60 + now.getMinutes()

  // Drag state
  const [dragId, setDragId] = useState(null)
  const [dragY, setDragY] = useState(0)
  const [dropIndex, setDropIndex] = useState(-1)
  const dragStartY = useRef(0)
  const itemRefs = useRef({})

  // Flat sorted list (used for reordering)
  const sortedBlocks = [...blocks].sort((a, b) => {
    if (a.position != null && b.position != null) return a.position - b.position
    return parseTime(a.time).start - parseTime(b.time).start
  })

  const dragIndex = dragId ? sortedBlocks.findIndex(b => b.id === dragId) : -1

  function handleDragStart(id, touchClientY) {
    setDragId(id)
    setDragY(0)
    dragStartY.current = touchClientY
    setDropIndex(sortedBlocks.findIndex(b => b.id === id))
  }

  const handleDocTouchMove = useCallback((e) => {
    if (!dragId) return
    e.preventDefault()
    const y = e.touches[0].clientY
    const offset = y - dragStartY.current
    setDragY(offset)

    // Find closest block to drop position
    let closest = dragIndex
    let closestDist = Infinity
    sortedBlocks.forEach((b, i) => {
      const el = itemRefs.current[b.id]
      if (!el) return
      const rect = el.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      const dist = Math.abs(y - midY)
      if (dist < closestDist) { closestDist = dist; closest = i }
    })
    setDropIndex(closest)
  }, [dragId, dragIndex, sortedBlocks])

  const handleDocTouchEnd = useCallback(() => {
    if (!dragId) return
    if (dropIndex !== dragIndex && dropIndex >= 0) {
      const newOrder = [...sortedBlocks]
      const [moved] = newOrder.splice(dragIndex, 1)
      newOrder.splice(dropIndex, 0, moved)
      onReorder?.(dayKey, newOrder.map((b, i) => ({ id: b.id, position: i })))
      hapticImpact()
    }
    setDragId(null)
    setDragY(0)
    setDropIndex(-1)
  }, [dragId, dragIndex, dropIndex, sortedBlocks, dayKey, onReorder])

  useEffect(() => {
    if (!dragId) return
    document.addEventListener('touchmove', handleDocTouchMove, { passive: false })
    document.addEventListener('touchend', handleDocTouchEnd)
    return () => {
      document.removeEventListener('touchmove', handleDocTouchMove)
      document.removeEventListener('touchend', handleDocTouchEnd)
    }
  }, [dragId, handleDocTouchMove, handleDocTouchEnd])

  const phases = [
    { key: 'morning',   label: 'Matin',      range: [0, 12 * 60] },
    { key: 'afternoon', label: 'Après-midi',  range: [12 * 60, 18 * 60] },
    { key: 'evening',   label: 'Soir',        range: [18 * 60, 30 * 60] },
  ]

  return (
    <div className="space-y-7 pb-12">
      {phases.map(p => {
        const items = sortedBlocks.filter(b => {
          const { start } = parseTime(b.time)
          return start >= p.range[0] && start < p.range[1]
        })
        if (items.length === 0) return null
        return (
          <section key={p.key}>
            <div className="flex items-baseline justify-between mb-2.5 px-0.5">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-3)]">{p.label}</h3>
              <span className="text-[11px] tabular-nums text-[var(--text-3)]">{items.filter(b => b.done).length}/{items.length}</span>
            </div>
            <div>
              {items.map((b) => {
                const globalIndex = sortedBlocks.findIndex(x => x.id === b.id)
                const isDragging = dragId === b.id
                // Shift non-dragged items around the drag target
                let offset = 0
                if (dragId && !isDragging) {
                  const dragH = itemRefs.current[dragId]?.offsetHeight || 64
                  if (dragIndex < globalIndex && dropIndex >= globalIndex) offset = -dragH - 8
                  else if (dragIndex > globalIndex && dropIndex <= globalIndex) offset = dragH + 8
                }
                return (
                  <div key={b.id} ref={el => { itemRefs.current[b.id] = el }}
                    style={{ transform: !isDragging && dragId ? `translateY(${offset}px)` : undefined, transition: dragId && !isDragging ? 'transform 0.15s ease' : undefined }}>
                    <Block
                      block={b}
                      onToggle={() => onToggle(dayKey, b.id)}
                      onSelect={onSelect}
                      onDelete={() => onDelete?.(dayKey, b.id)}
                      currentMin={liveMin}
                      onDragStart={handleDragStart}
                      isDragging={isDragging}
                      dragOffset={isDragging ? dragY : 0}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      <button onClick={onAddClick}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-[12.5px] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-1)] rounded-[10px] transition-all border border-dashed border-[var(--line)] hover:border-[var(--line-strong)]">
        <Plus size={14} /> <span>Ajouter un bloc</span>
      </button>
    </div>
  )
}

// ── Main DayView ──────────────────────────────────────────────────

export default function DayView({ schedule, onToggle, onUpdate, weekKey, onAdd, onDelete, initialDayIndex, onNextWeek, onPrevWeek, isCurrentWeek, weekLabel, onGoToToday, viewMode }) {
  const todayName = getCurrentDayName()
  const todayIndex = DAYS_ORDER.indexOf(todayName)
  const [dayIndex, setDayIndex] = useState(
    initialDayIndex !== undefined ? initialDayIndex : (todayIndex >= 0 ? todayIndex : 0)
  )

  const dayName = DAYS_ORDER[dayIndex]
  const dayData = schedule[dayName]
  const isToday = isCurrentDay(dayName, weekKey)
  const weekDates = getWeekDatesForKey(weekKey)

  const [editingBlock, setEditingBlock] = useState(null)
  const [addSheetOpen, setAddSheetOpen] = useState(false)

  const todayBlocks = dayData?.blocks || []
  const todayDone = todayBlocks.filter(b => b.done).length
  const todayPct = todayBlocks.length ? Math.round((todayDone / todayBlocks.length) * 100) : 0

  const dDate = weekDates[dayName]

  function handleReorder(dKey, updates) {
    updates.forEach(({ id, position }) => {
      onUpdate(dKey, id, { position })
    })
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg)]">
      {/* ── Header ── */}
      <div className="px-4 pt-1 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)]">
            {dDate
              ? format(dDate, 'EEEE d MMMM', { locale: fr })
              : (dayData?.label || dayName)}
          </div>
          <div className="flex lg:hidden items-center gap-1">
            <button onClick={onPrevWeek} className="p-1 rounded-[6px] hover:bg-[var(--surface-1)] transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="min-w-[70px] text-center text-[11px] text-[var(--text-3)]">{weekLabel}</span>
            <button onClick={onNextWeek} className="p-1 rounded-[6px] hover:bg-[var(--surface-1)] transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-[3px] rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div className="h-full rounded-full bg-[var(--ink)] transition-all duration-700"
              style={{ width: `${todayPct}%` }} />
          </div>
          <span className="text-[11px] tabular-nums text-[var(--text-3)] shrink-0">{todayDone}/{todayBlocks.length}</span>
        </div>

        {!isToday && (
          <div className="mt-1.5">
            <button onClick={() => {
              if (!isCurrentWeek) onGoToToday()
              setDayIndex(todayIndex >= 0 ? todayIndex : 0)
            }} className="text-[11.5px] font-medium text-[var(--brand,#B45309)]">↩ Aujourd'hui</button>
          </div>
        )}
      </div>

      {/* ── Day Strip ── */}
      <div className="px-3 shrink-0 mb-2">
        <div className="flex gap-1">
          {DAYS_ORDER.map((dk, i) => {
            const isSel = dayName === dk
            const isT = i === todayIndex
            const bks = schedule[dk]?.blocks || []
            const hasDots = bks.length > 0
            return (
              <button key={dk} onClick={() => setDayIndex(i)}
                className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-[12px] transition-all relative
                  ${isSel ? 'bg-[var(--surface-1)] border border-[var(--line)]' : 'hover:bg-[var(--surface-1)]/50'}`}>
                <div className={`text-[10px] font-semibold uppercase mb-1
                  ${isSel ? 'text-[var(--text-1)]' : isT ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'}`}>
                  {schedule[dk]?.label?.slice(0, 1) || dk.slice(0, 1)}
                </div>
                <div className={`text-[16px] font-medium tracking-[-0.02em]
                  ${isSel ? 'text-[var(--text-1)]' : 'text-[var(--text-2)]'}`}>
                  {weekDates[dk] ? format(weekDates[dk], 'dd') : ''}
                </div>
                {hasDots && (
                  <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-[var(--accent)] opacity-80" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-3 pb-32">
        {viewMode === 'timeline' ? (
          <TimelineView
            schedule={schedule} dayKey={dayName}
            onToggle={onToggle}
            onSelect={(b) => setEditingBlock({ dayName, block: b })}
            onAddClick={() => setAddSheetOpen(true)}
            onAdd={blockData => onAdd(dayName, blockData)}
          />
        ) : (
          <ListView
            schedule={schedule} dayKey={dayName}
            onToggle={onToggle}
            onSelect={(b) => setEditingBlock({ dayName, block: b })}
            onAddClick={() => setAddSheetOpen(true)}
            onDelete={onDelete}
            onReorder={handleReorder}
          />
        )}
      </div>

      {editingBlock && (
        <BlockDetail
          block={editingBlock.block}
          onClose={() => setEditingBlock(null)}
          onToggle={(blockId) => onToggle(editingBlock.dayName, blockId)}
          onUpdate={(blockId, updates) => onUpdate(editingBlock.dayName, blockId, updates)}
        />
      )}

      {addSheetOpen && (
        <AddBlockSheet
          dayName={dayName}
          onClose={() => setAddSheetOpen(false)}
          onAdd={blockData => { onAdd(dayName, blockData); setAddSheetOpen(false) }}
        />
      )}
    </div>
  )
}
