import { useState, useRef, useEffect } from 'react'
import { Plus, MoreHorizontal, CheckCheck, Trash2, ChevronLeft, ChevronRight, Copy } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { DAYS_ORDER } from '../data/schedule'
import { getCurrentDayName, getWeekDatesForKey, formatShortDate, isCurrentDay } from '../utils/dateUtils'
import Block from './Block'
import AddBlockSheet from './AddBlockSheet'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { hapticImpact } from '../lib/haptic'
import { useCategories } from '../contexts/CategoriesContext'


// ── Time helpers ──────────────────────────────────────────────────
function parseBlockStartMinutes(timeStr) {
  const m = timeStr?.match(/^(\d{1,2})[h:](\d*)/)
  if (!m) return null
  return parseInt(m[1]) * 60 + (parseInt(m[2]) || 0)
}

const HOUR_H = 64

function parseTimeRange(timeStr) {
  if (!timeStr) return { start: 0, end: 60 }
  const hasSep = /→|–|-/.test(timeStr)
  if (!hasSep) {
    const start = parseBlockStartMinutes(timeStr) ?? 0
    return { start, end: start + 60 }
  }
  const parts = timeStr.split(/→|–|-/).map(s => s.trim())
  const start = parseBlockStartMinutes(parts[0]) ?? 0
  let end = parseBlockStartMinutes(parts[1]) ?? start + 60
  if (end <= start) end += 24 * 60
  return { start, end }
}

function timeToTop(minutes) {
  return (minutes / 60) * HOUR_H
}

function formatMinutes(m) {
  const total = ((m % 1440) + 1440) % 1440
  const h = Math.floor(total / 60)
  const min = total % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function buildTimeString(start, end, originalTimeStr) {
  const hasSep = /→|–/.test(originalTimeStr ?? '')
  if (!hasSep) return formatMinutes(start)
  return `${formatMinutes(start)} → ${formatMinutes(end)}`
}

function calculateLayout(blocks) {
  const sorted = [...blocks].sort((a, b) => parseTimeRange(a.time).start - parseTimeRange(b.time).start)
  const columns = []
  const layout = {}

  for (const block of sorted) {
    const { start } = parseTimeRange(block.time)
    let placed = false
    for (let i = 0; i < columns.length; i++) {
      const lastBlock = columns[i][columns[i].length - 1]
      const { end } = parseTimeRange(lastBlock.time)
      if (end <= start) {
        columns[i].push(block)
        layout[block.id] = { column: i }
        placed = true
        break
      }
    }
    if (!placed) {
      columns.push([block])
      layout[block.id] = { column: columns.length - 1 }
    }
  }

  let groups = []
  let currentGroup = []
  let currentMaxEnd = 0

  for (const block of sorted) {
    const { start, end } = parseTimeRange(block.time)
    if (currentGroup.length === 0) {
      currentGroup.push(block)
      currentMaxEnd = end
    } else if (start < currentMaxEnd) {
      currentGroup.push(block)
      currentMaxEnd = Math.max(currentMaxEnd, end)
    } else {
      groups.push(currentGroup)
      currentGroup = [block]
      currentMaxEnd = end
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup)

  for (const group of groups) {
    let maxCol = 0
    for (const block of group) {
      if (layout[block.id].column > maxCol) maxCol = layout[block.id].column
    }
    const totalColumns = maxCol + 1
    for (const block of group) {
      layout[block.id].totalColumns = totalColumns
    }
  }

  return layout
}

// ── Edit Block Sheet ──────────────────────────────────────────────
const PRIORITIES = [
  { value: 'normal', label: 'Normal' },
  { value: 'important', label: 'Important' },
  { value: 'urgent', label: 'Urgent' },
]

const THEME_PALETTES = {
  "Pastel": ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E8DFF5'],
  "Néon":   ['#FF10F0', '#00FFFF', '#39FF14', '#FFFF00', '#FF3131', '#7A04EB'],
  "Vintage":['#4A0404', '#0F172A', '#166534', '#8C7851', '#C19A6B', '#4B5563']
}
const POPULAR_EMOJIS = ['💻', '📚', '💪', '🧘', '🍔', '🚗', '📞', '✍️', '🎯', '😴']

function EditBlockSheet({ block, onClose, onSave, onDelete }) {
  const { allLabels } = useCategories()
  const [label, setLabel]       = useState(block.label)
  const [time, setTime]         = useState(block.time)
  const [note, setNote]         = useState(block.description || '')
  const [priority, setPriority] = useState(block.priority || 'normal')
  const [category, setCategory] = useState(block.category || '')
  const [color, setColor]       = useState(block.color || '')
  const [emoji, setEmoji]       = useState(block.emoji || '')
  const [bgOpacity, setBgOpacity] = useState(block.bgOpacity || '12')

  function handleSave() {
    onSave({
      label: label.trim() || block.label,
      time: time.trim() || block.time,
      description: note,
      priority,
      category,
      color: color || null,
      emoji: emoji || null,
      bgOpacity,
    })
    onClose()
  }

  return (
    <Sheet open onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="px-5 pt-4 pb-8 max-h-[85dvh] overflow-y-auto bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-t-[32px] border-none shadow-2xl">
        <div className="flex justify-center shrink-0 mb-4">
          <div className="w-12 h-1.5 rounded-full bg-[#E5E5EA] dark:bg-[#3A3A3C]" />
        </div>
        <SheetHeader className="mb-6 text-left">
          <SheetTitle className="text-xl font-bold tracking-tight">Modifier le bloc</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Titre & Emoji */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 shadow-sm">
            <label className="text-[11px] uppercase tracking-wider text-[#8E8E93] font-semibold mb-2 block">Titre & Icône</label>
            <div className="flex gap-3">
              <input
                value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={2} placeholder="🌍"
                className="w-12 text-center text-xl bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-[12px] outline-none text-foreground focus:ring-2 focus:ring-[#0A84FF]"
              />
              <input
                autoFocus value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="flex-1 text-[15px] font-medium bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-[12px] px-4 py-2.5 outline-none text-foreground focus:ring-2 focus:ring-[#0A84FF] transition-colors"
                placeholder="Titre du bloc"
              />
            </div>
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {POPULAR_EMOJIS.map(e => (
                <button type="button" key={e} onClick={() => setEmoji(e)}
                  className="text-xl p-1.5 hover:bg-[#F2F2F7] dark:hover:bg-[#1C1C1E] rounded-lg transition-colors shrink-0">
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Couleurs thématiques */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Couleur</label>
              <button type="button" onClick={() => setColor('')}
                className={cn(
                  'text-[10px] font-bold px-2 py-1 rounded-md transition-all',
                  color === '' ? 'bg-[#0A84FF]/10 text-[#0A84FF]' : 'text-[#8E8E93] bg-[#F2F2F7] dark:bg-[#1C1C1E]'
                )}>
                AUTO
              </button>
            </div>
            <div className="space-y-3">
              {Object.entries(THEME_PALETTES).map(([themeName, colors]) => (
                <div key={themeName} className="flex items-center gap-3">
                  <span className="text-[10px] font-medium text-[#8E8E93] w-12 text-right">{themeName}</span>
                  <div className="flex gap-2.5">
                    {colors.map(c => (
                      <button type="button" key={c} onClick={() => setColor(c)}
                        className={cn('w-6 h-6 rounded-full transition-all', color === c && 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#2C2C2E] scale-110')}
                        style={{ backgroundColor: c, '--tw-ring-color': c }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <span className="text-[10px] font-medium text-[#8E8E93] w-12 text-right">Opacité</span>
              <div className="flex gap-2">
                {[{ label: '25%', value: '40' }, { label: '13%', value: '21' }, { label: '7%', value: '12' }, { label: '5%', value: '0D' }].map(o => (
                  <button type="button" key={o.value} onClick={() => setBgOpacity(o.value)}
                    className={cn(
                      'text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all',
                      bgOpacity === o.value ? 'bg-[#0A84FF] text-white' : 'bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#8E8E93]'
                    )}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Heure + Priorité */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 shadow-sm grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#8E8E93] font-semibold mb-1.5 block">Heure</label>
              <input value={time} onChange={e => setTime(e.target.value)}
                className="w-full text-[15px] bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-[12px] px-3 py-2.5 outline-none text-foreground tabular-nums focus:ring-2 focus:ring-[#0A84FF]"
                placeholder="ex: 9h → 10h" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#8E8E93] font-semibold mb-1.5 block">Priorité</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full text-[15px] font-medium bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-[12px] px-3 py-2.5 outline-none text-foreground focus:ring-2 focus:ring-[#0A84FF] appearance-none">
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Catégorie */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 shadow-sm">
            <label className="text-[11px] uppercase tracking-wider text-[#8E8E93] font-semibold mb-2 block">Catégorie</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(allLabels).map(([key, lbl]) => (
                <button key={key} onClick={() => setCategory(key)}
                  className={cn(
                    'text-[12px] px-3 py-1.5 rounded-full font-medium transition-all duration-150',
                    category === key ? 'bg-[#0A84FF] text-white shadow-sm' : 'bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#8E8E93] hover:bg-[#E5E5EA]'
                  )}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 shadow-sm">
            <label className="text-[11px] uppercase tracking-wider text-[#8E8E93] font-semibold mb-1.5 block">Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Ajouter une note..."
              className="w-full text-[14px] bg-transparent border-b border-[#E5E5EA] dark:border-[#3A3A3C] px-0 py-2 outline-none resize-none text-foreground focus:border-[#0A84FF] rounded-none" />
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => { onDelete(); onClose() }}
              className="flex items-center justify-center w-14 h-14 rounded-[14px] bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 transition-colors text-[#FF3B30]">
              <Trash2 className="h-5 w-5" />
            </button>
            <button onClick={onClose}
              className="flex-1 flex items-center justify-center text-[15px] font-semibold text-foreground bg-white dark:bg-[#2C2C2E] rounded-[14px] shadow-sm active:scale-95 transition-transform">
              Annuler
            </button>
            <button onClick={handleSave}
              className="flex-1 flex items-center justify-center text-[15px] font-bold text-white bg-[#0A84FF] rounded-[14px] shadow-sm active:scale-95 transition-transform">
              Enregistrer
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Calendar Timeline ─────────────────────────────────────────────
function CalendarTimeline({ blocks, isToday, nowMinutes, dayName, dayLabel, weekKey, onToggle, onUpdate, onDelete, onAdd, onEditBlock, addSheetOpen, setAddSheetOpen }) {
  const scrollRef = useRef(null)
  const [swipeState, setSwipeState] = useState({ id: null, x: 0 })
  const swipeRef = useRef({ startX: 0, startY: 0, active: false, id: null })
  const isHorizSwipe = useRef(false)
  const swipeAutoClose = useRef(null)
  const swipeJustReleased = useRef(false)

  const [dragState, setDragState] = useState(null)
  const longPressTimer = useRef(null)
  const dragStateRef = useRef(null)
  const lastPointerDownTime = useRef(0)

  useEffect(() => { dragStateRef.current = dragState }, [dragState])

  useEffect(() => {
    if (!scrollRef.current) return
    const top = timeToTop(nowMinutes) - 150
    scrollRef.current.scrollTop = Math.max(0, top)

    const hasHinted = localStorage.getItem('swipe_hint')
    if (!hasHinted && blocks.length > 0) {
      setTimeout(() => {
        setSwipeState({ id: blocks[0].id, x: 60 })
        setTimeout(() => {
          setSwipeState({ id: null, x: 0 })
          localStorage.setItem('swipe_hint', 'true')
        }, 600)
      }, 1000)
    }
  }, [blocks.length]) // Triggered gently on logic load

  function closeSwipe() {
    setSwipeState({ id: null, x: 0 })
    clearTimeout(swipeAutoClose.current)
  }

  function handlePointerDown(e, block) {
    if (e.target.closest('button')) return
    clearTimeout(longPressTimer.current)
    const now = Date.now()
    const sinceLastTap = now - lastPointerDownTime.current
    lastPointerDownTime.current = now
    
    // We only capture pointer start coords, we DO NOT call setPointerCapture natively 
    // immediately to allow browser touch-action to trigger vertical scroll easily
    const { clientX, clientY } = e
    swipeRef.current = { startX: clientX, startY: clientY, active: true, id: block.id }
    isHorizSwipe.current = false

    if (sinceLastTap < 350) return

    longPressTimer.current = setTimeout(() => {
      if (!swipeRef.current.active || swipeRef.current.id !== block.id) return
      
      // Stop native scrolling when long-press initiates
      try { e.target.setPointerCapture(e.pointerId) } catch(e){}

      const { start, end } = parseTimeRange(block.time)
      hapticImpact()
      const newDrag = { id: block.id, startY: clientY, deltaY: 0, originalStart: start, originalEnd: end, originalTime: block.time }
      setDragState(newDrag)
      dragStateRef.current = newDrag
      swipeRef.current.active = false
    }, 450)
  }

  function handlePointerMove(e, blockId) {
    const ds = dragStateRef.current
    if (ds?.id === blockId) {
      if (e.cancelable) e.preventDefault() // prevent scrolling while dragging
      const deltaY = e.clientY - ds.startY
      setDragState(prev => prev ? { ...prev, deltaY } : prev)
      return
    }
    if (!swipeRef.current.active || swipeRef.current.id !== blockId) return
    const deltaX = e.clientX - swipeRef.current.startX
    const deltaY = e.clientY - swipeRef.current.startY
    if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
      clearTimeout(longPressTimer.current)
    }
    if (!isHorizSwipe.current) {
      if (Math.abs(deltaX) > Math.abs(deltaY) + 6 && Math.abs(deltaX) > 10) {
        isHorizSwipe.current = true
      } else return
    }
    const rawX = Math.max(0, -deltaX)
    const finalX = rawX > 80 ? 80 + Math.log10(1 + (rawX - 80) / 10) * 20 : rawX
    setSwipeState({ id: blockId, x: finalX })
  }

  function handlePointerUp(e, block) {
    clearTimeout(longPressTimer.current)

    const ds = dragStateRef.current
    if (ds?.id === block.id) {
      const deltaMinutes = Math.round(ds.deltaY / HOUR_H * 60 / 15) * 15
      if (deltaMinutes !== 0) {
        const newStart = ds.originalStart + deltaMinutes
        const newEnd = ds.originalEnd + deltaMinutes
        const newTime = buildTimeString(newStart, newEnd, ds.originalTime)
        onUpdate(dayName, block.id, { time: newTime })
      }
      setDragState(null)
      dragStateRef.current = null
      return
    }

    if (isHorizSwipe.current && swipeRef.current.id === block.id) {
      const swipeX = Math.max(0, -(e.clientX - swipeRef.current.startX))
      if (swipeX < 72) {
        closeSwipe()
      } else {
        swipeJustReleased.current = true
        setTimeout(() => { swipeJustReleased.current = false }, 100)
        setSwipeState({ id: block.id, x: 80 })
        clearTimeout(swipeAutoClose.current)
        swipeAutoClose.current = setTimeout(closeSwipe, 3000)
      }
    }
    swipeRef.current = { startX: 0, startY: 0, active: false, id: null }
    isHorizSwipe.current = false
  }

  const totalH = 24 * HOUR_H

  return (
    <div className="flex flex-col">
      <div
        ref={scrollRef}
        className="overflow-y-auto pb-32 pt-4"
        style={{ height: 'calc(100dvh - 220px)', minHeight: '280px', touchAction: 'pan-y' }}
        onClick={() => { if (swipeJustReleased.current) return; if (swipeState.id !== null) closeSwipe() }}
      >
        <div className="relative select-none" style={{ height: totalH + 96 }}>

          {/* Lignes d'heures iOS */}
          {Array.from({ length: 25 }, (_, h) => (
            <div key={h} className="absolute left-0 right-0 flex items-start pointer-events-none"
              style={{ top: h * HOUR_H }}>
              <span className="w-14 text-[11px] text-muted-foreground/60 font-medium tabular-nums text-right pr-3 shrink-0"
                style={{ marginTop: -8 }}>
                {h < 24 ? `${String(h).padStart(2, '0')}:00` : ''}
              </span>
              <div className="flex-1 border-t border-border/40" />
            </div>
          ))}

          {/* Indicateur heure courante */}
          {isToday && (
            <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
              style={{ top: timeToTop(nowMinutes) }}>
              <div className="w-14 flex justify-end pr-1 shrink-0">
                <div className="w-2 h-2 rounded-full bg-[#FF3B30]" style={{ marginTop: -1 }} />
              </div>
              <div className="flex-1 h-[1.5px] bg-[#FF3B30]" />
            </div>
          )}

          {/* Blocs */}
          {(() => {
            const layout = calculateLayout(blocks)
            return blocks.map((block) => {
              const { start, end } = parseTimeRange(block.time)
              const rawH = timeToTop(Math.min(end, 24 * 60)) - timeToTop(start)
              const height = Math.max(rawH, 36)

              const isDragging = dragState?.id === block.id
              const snapDeltaMinutes = isDragging ? Math.round(dragState.deltaY / HOUR_H * 60 / 15) * 15 : 0
              const snapDeltaY = snapDeltaMinutes / 60 * HOUR_H
              const top = timeToTop(start) + snapDeltaY

              const isSwipeOpen = swipeState.id === block.id && !isDragging
              const swipeX = isSwipeOpen ? swipeState.x : 0
              const trashOpacity = Math.min(swipeX / 60, 1)

              // Overlapping calculus
              const colParams = layout[block.id] || { column: 0, totalColumns: 1 }
              const isMulti = colParams.totalColumns > 1
              const leftCss = isMulti 
                ? `calc(56px + ((100% - 56px) / ${colParams.totalColumns}) * ${colParams.column})` 
                : '56px'
              const widthCss = isMulti
                ? `calc(((100% - 56px) / ${colParams.totalColumns}) - 8px)`
                : 'calc(100% - 64px)'

              return (
                <div key={`${weekKey}_${block.id}`}
                  className="absolute"
                  style={{
                    top: top + 1,
                    height: height - 2,
                    left: leftCss,
                    width: widthCss,
                    zIndex: isDragging ? 40 : 10 + colParams.column,
                    opacity: isDragging ? 0.88 : 1,
                    transition: isDragging ? 'none' : 'top 0.15s cubic-bezier(0.25,0.46,0.45,0.94)',
                    touchAction: dragState?.id === block.id ? 'none' : 'pan-y', // Pan-y permet le défilement vertical, none bloque pour le drag
                  }}
                onPointerDown={e => handlePointerDown(e, block)}
                onPointerMove={e => handlePointerMove(e, block.id)}
                onPointerUp={e => handlePointerUp(e, block)}
                onPointerCancel={() => {
                  clearTimeout(longPressTimer.current)
                  setDragState(null)
                  dragStateRef.current = null
                  swipeRef.current.active = false
                  isHorizSwipe.current = false
                }}
              >
                {isDragging && (
                  <div className="absolute -top-5 left-0 text-[9px] font-mono text-primary/80 bg-card/80 px-1.5 py-0.5 rounded border border-primary/20 z-40 pointer-events-none">
                    {formatMinutes(dragState.originalStart + snapDeltaMinutes)}
                  </div>
                )}

                <div className="relative h-full overflow-hidden" style={{ borderRadius: 'var(--radius)' }}>
                  {onDelete && isSwipeOpen && (
                    <div className="absolute inset-y-0 right-0 bg-red-500 flex items-center justify-center z-10"
                      style={{ width: 80, opacity: trashOpacity, borderRadius: 'var(--radius)', transition: 'opacity 0.15s' }}>
                      <button className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
                        onClick={e => { e.stopPropagation(); hapticImpact(); onDelete(dayName, block.id); closeSwipe() }}>
                        <Trash2 className="h-4 w-4 text-white" />
                        <span className="text-[8px] text-white font-semibold uppercase tracking-wide">Suppr.</span>
                      </button>
                    </div>
                  )}
                  <div className="h-full"
                    style={{ transform: `translateX(-${swipeX}px)`, transition: isHorizSwipe.current ? 'none' : 'transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94)' }}>
                    <Block
                      block={block}
                      onToggle={() => onToggle(dayName, block.id)}
                      onUpdate={updates => onUpdate(dayName, block.id, updates)}
                      onEdit={() => { clearTimeout(longPressTimer.current); onEditBlock(dayName, block) }}
                      height={height}
                      calendarMode
                    />
                  </div>
                </div>
              </div>
            )
          })})()}
        </div>
      </div>

      {addSheetOpen && (
        <AddBlockSheet
          dayName={dayLabel}
          onClose={() => setAddSheetOpen(false)}
          onAdd={blockData => { onAdd(dayName, blockData); setAddSheetOpen(false) }}
        />
      )}
    </div>
  )
}

// ── Main DayView ──────────────────────────────────────────────────
export default function DayView({ schedule, onToggle, onUpdate, weekKey, onAdd, onDelete, initialDayIndex, onNextWeek, onPrevWeek, isCurrentWeek, weekLabel, onCopyWeek, onGoToToday }) {
  const todayName = getCurrentDayName()
  const todayIndex = DAYS_ORDER.indexOf(todayName)
  const [dayIndex, setDayIndex] = useState(
    initialDayIndex !== undefined ? initialDayIndex : (todayIndex >= 0 ? todayIndex : 0)
  )

  const dayName = DAYS_ORDER[dayIndex]
  const dayData = schedule[dayName]
  const isToday = isCurrentDay(dayName, weekKey)
  const weekDates = getWeekDatesForKey(weekKey)

  const [menuOpen, setMenuOpen] = useState(false)
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState(null)
  const [addSheetOpen, setAddSheetOpen] = useState(false)

  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date(); return n.getHours() * 60 + n.getMinutes()
  })
  useEffect(() => {
    const interval = setInterval(() => {
      const n = new Date(); setNowMinutes(n.getHours() * 60 + n.getMinutes())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  function handleMarkAllDone() {
    const allDone = dayData.blocks.every(b => b.done)
    if (allDone) {
      dayData.blocks.forEach(b => onToggle(dayName, b.id))
      toast.success('Tous les blocs décochés.')
    } else {
      dayData.blocks.forEach(b => { if (!b.done) onToggle(dayName, b.id) })
      toast.success('Tous les blocs cochés !')
    }
    setMenuOpen(false)
  }

  function handleClearDay() {
    dayData.blocks.forEach(b => onDelete(dayName, b.id))
    setClearDialogOpen(false)
    toast.success('Journée vidée.')
  }

  const shortDate = weekDates[dayName] ? formatShortDate(weekDates[dayName]) : ''

  return (
    <div
      className="max-w-lg mx-auto w-full flex flex-col"
      onClick={() => { if (menuOpen) setMenuOpen(false) }}
    >
      {/* ── Header Façon iOS ─────────────────────────────────────────────── */}
      <div className="px-4 pt-2 pb-4 shrink-0 bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground capitalize">
              {dayData.label || dayName}
            </h1>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {shortDate}{dayData.type ? ` · ${dayData.type}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            {/* Navigation semaine */}
            {(onPrevWeek || onNextWeek) && (
              <div className="flex items-center gap-0.5 mr-1">
                <button onClick={onPrevWeek} className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide min-w-[60px] text-center">
                  {weekLabel ?? 'Sem.'}
                </span>
                <button onClick={onNextWeek} className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
                {!isCurrentWeek && onGoToToday && (
                  <button onClick={onGoToToday} className="text-[10px] font-semibold text-primary px-1.5 hover:text-primary/70 transition-colors">
                    Auj.
                  </button>
                )}
              </div>
            )}

            {/* Menu 3 points */}
            <div className="relative">
              <button onClick={() => setMenuOpen(v => !v)} className="w-8 h-8 flex items-center justify-center rounded-full text-primary hover:bg-primary/10 transition-colors">
                <MoreHorizontal className="h-6 w-6" />
              </button>
              {menuOpen && (
                <div className="absolute top-9 right-0 w-48 bg-card border border-border rounded-[var(--radius)] shadow-2xl z-30 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  <button onClick={handleMarkAllDone} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left hover:bg-muted transition-colors border-b border-border/40">
                    <CheckCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                    {dayData.blocks.every(b => b.done) ? 'Tout décocher' : 'Tout cocher'}
                  </button>
                  {onCopyWeek && (
                    <button onClick={() => { onCopyWeek(); setMenuOpen(false) }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left hover:bg-muted transition-colors border-b border-border/40">
                      <Copy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      Copier à la sem. suivante
                    </button>
                  )}
                  <button onClick={() => { setMenuOpen(false); setClearDialogOpen(true) }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left hover:bg-red-500/10 text-red-500 transition-colors">
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    Vider la journée
                  </button>
                </div>
              )}
            </div>
            {onAdd && (
              <button onClick={() => setAddSheetOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-full text-primary hover:bg-primary/10 transition-colors">
                <Plus className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>

        {/* ── Sélecteur de jours iOS ─────────────────────────────────── */}
        <div className="flex justify-between items-center px-1">
          {DAYS_ORDER.map((name, idx) => {
            const isSelected = idx === dayIndex
            const isT = name === todayName
            const dateNum = weekDates[name] ? format(weekDates[name], 'd') : ''

            return (
              <button
                key={name}
                onClick={() => setDayIndex(idx)}
                className="flex flex-col items-center gap-1.5"
              >
                <span className={cn(
                  "text-[10px] uppercase font-semibold",
                  isSelected ? "text-primary" : (isT ? "text-primary/70" : "text-muted-foreground")
                )}>
                  {name.charAt(0)}
                </span>
                <div className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium tabular-nums transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" :
                  isT ? "text-primary bg-primary/10" : "text-foreground hover:bg-muted"
                )}>
                  {dateNum}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Timeline ───────────────────────────────────────────── */}
      <CalendarTimeline
        blocks={dayData.blocks}
        isToday={isToday}
        nowMinutes={nowMinutes}
        dayName={dayName}
        dayLabel={dayData.label || dayName}
        weekKey={weekKey}
        onToggle={onToggle}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onAdd={onAdd}
        onEditBlock={(dn, block) => setEditingBlock({ dayName: dn, block })}
        addSheetOpen={addSheetOpen}
        setAddSheetOpen={setAddSheetOpen}
      />

      {/* ── Edit Sheet ─────────────────────────────────────────── */}
      {editingBlock && (
        <EditBlockSheet
          block={editingBlock.block}
          onClose={() => setEditingBlock(null)}
          onSave={updates => onUpdate(editingBlock.dayName, editingBlock.block.id, updates)}
          onDelete={() => onDelete(editingBlock.dayName, editingBlock.block.id)}
        />
      )}

      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="p-5 sm:p-6 pb-8 md:max-w-md md:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Vider ta journée ?</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-sm text-muted-foreground mt-2 mb-6">
            Les {dayData.blocks.length} blocs de {dayData.label || dayName} seront supprimés. Action irréversible.
          </DialogDescription>
          <div className="flex items-center justify-end gap-3">
            <DialogClose asChild>
              <button className="text-sm px-4 py-2 text-muted-foreground font-medium rounded-[var(--radius-sm)] border border-border">Annuler</button>
            </DialogClose>
            <button onClick={handleClearDay} className="text-sm px-4 py-2 bg-red-500 text-white font-medium rounded-[var(--radius-sm)] hover:bg-red-600 transition-colors">
              Vider
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
