import { useState } from 'react'
import { DAYS_ORDER } from '../data/schedule'
import { isCurrentDay, getWeekDatesForKey } from '../utils/dateUtils'
import { Plus, Check } from 'lucide-react'
import { useCategories } from '../contexts/CategoriesContext'
import { format } from 'date-fns'
import BlockEditor from './BlockEditor'

function fmtTime(t) {
  if (!t) return ''
  if (typeof t === 'object') {
    if (t.start && t.end) return `${t.start} – ${t.end}`
    return t.start || ''
  }
  return t.replace(/\s*[–→]\s*/g, ' – ')
}

export default function WeekView({ schedule, onToggle, onUpdate, weekKey, changedDays = new Set(), onAdd, onDelete }) {
  const weekDates = getWeekDatesForKey(weekKey)
  const { getCategoryDetails } = useCategories()
  const [editingBlock, setEditingBlock] = useState(null)

  const todayName = DAYS_ORDER.find(d => isCurrentDay(d, weekKey))
  const todayIndex = todayName ? DAYS_ORDER.indexOf(todayName) : -1

  return (
    <>
      <div className="relative h-full flex flex-col">
        {/* Page Title */}
        <div className="px-10 py-8 shrink-0">
          <div className="text-[10.5px] uppercase tracking-[0.14em] font-medium text-[var(--text-3)] mb-3">
            {weekDates[DAYS_ORDER[0]] ? format(weekDates[DAYS_ORDER[0]], 'dd MMMM') : ''} – {weekDates[DAYS_ORDER[6]] ? format(weekDates[DAYS_ORDER[6]], 'dd MMMM yyyy') : ''}
          </div>
          <h1 className="text-[40px] font-medium tracking-[-0.025em] leading-[1.1] text-[var(--text-1)]">
            Vue semaine.
          </h1>
        </div>

        {/* Scroller horizontal */}
        <div className="flex-1 overflow-x-auto px-4 lg:px-10 pb-10" style={{ scrollbarWidth: 'thin' }}>
          <div className="flex gap-4 h-full" style={{ minWidth: 'max-content' }}>
            {DAYS_ORDER.map((dk, i) => {
              const day = schedule[dk] || { blocks: [] }
              const blocks = day.blocks
              const done = blocks.filter(b => b.done).length
              const pct = blocks.length ? done / blocks.length : 0
              const isToday = i === todayIndex
              const dDate = weekDates[dk]

              return (
                <div key={dk}
                  className="shrink-0 w-[280px] rounded-[16px] border transition-all flex flex-col h-full border-[var(--line)] bg-[var(--surface-0)]/60 hover:bg-[var(--surface-0)]">

                  {/* Card header */}
                  <div className="px-5 pt-5 pb-4 group">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10.5px] font-semibold uppercase tracking-[0.14em]
                        ${isToday ? 'text-[var(--brand)]' : 'text-[var(--text-3)]'}`}>
                        {day.label || dk}
                      </span>
                      <button onClick={() => onAdd(dk, { label: 'Nouveau', category: 'rest', time: '12h' })}
                        className="h-7 w-7 rounded-full flex items-center justify-center text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] transition-colors opacity-0 group-hover:opacity-100">
                        <Plus size={15} strokeWidth={2} />
                      </button>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[28px] font-semibold tabular-nums tracking-[-0.025em] leading-none text-[var(--text-1)]">
                        {dDate ? format(dDate, 'dd') : ''}
                      </span>
                      <span className="text-[13px] text-[var(--text-3)] lowercase">{dDate ? format(dDate, 'MMM') : ''}.</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="flex-1 h-[3px] rounded-full bg-[var(--surface-2)] overflow-hidden">
                        <div className="h-full bg-[var(--ink)] transition-all" style={{ width: `${pct * 100}%` }} />
                      </div>
                      <span className="text-[11px] tabular-nums text-[var(--text-3)] font-medium">{done}/{blocks.length}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 px-4 pb-4 space-y-2 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                    {blocks.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-[12.5px] text-[var(--text-3)]">
                        Aucun événement
                      </div>
                    ) : blocks.map(b => {
                      const baseCat = getCategoryDetails(b.category)
                      const cat = { ...baseCat, color: b.color || baseCat.color }
                      const bgOpacity = b.bgOpacity || '1A'

                      return (
                        <button key={b.id}
                          onClick={() => setEditingBlock({ dayName: dk, block: b })}
                          className={`w-full text-left rounded-[12px] px-3.5 py-2.5 transition-all group/block relative overflow-hidden
                            ${b.done ? 'opacity-45' : ''}`}
                          style={{
                            background: `${cat.color}${bgOpacity}`,
                            border: `1px solid ${cat.color}40`,
                          }}>
                          <span className="absolute inset-y-0 left-0 w-[4px]" style={{ background: cat.color }} />

                          <div className="flex items-center gap-2 mb-1">
                            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: cat.color }} />
                            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: cat.color, opacity: 0.85 }}>
                              {cat.label || 'Catégorie'}
                            </span>
                            {/* Quick toggle */}
                            <span
                              role="button"
                              onClick={e => { e.stopPropagation(); onToggle(dk, b.id) }}
                              className={`ml-auto h-[18px] w-[18px] rounded-full border flex items-center justify-center transition-all shrink-0
                                ${b.done ? 'bg-[var(--ink)] border-[var(--ink)] text-[var(--bg)]' : 'border-[var(--line-strong)] hover:border-[var(--ink)] bg-white/60'}`}>
                              {b.done && <Check size={10} strokeWidth={2.5} />}
                            </span>
                          </div>

                          <div className={`text-[13.5px] font-medium tracking-[-0.005em] leading-snug flex items-center gap-1.5
                            ${b.done ? 'line-through text-[var(--text-2)]' : 'text-[var(--text-1)]'}`}>
                            {b.emoji && <span className="text-[15px]">{b.emoji}</span>}
                            <span>{b.label}</span>
                          </div>
                          <div className="text-[11px] tabular-nums text-[var(--text-3)] mt-1">
                            {fmtTime(b.time)}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {editingBlock && (
        <BlockEditor
          mode="edit"
          block={editingBlock.block}
          onClose={() => setEditingBlock(null)}
          onToggle={(blockId) => onToggle(editingBlock.dayName, blockId)}
          onUpdate={(blockId, updates) => onUpdate(editingBlock.dayName, blockId, updates)}
          onDelete={() => { onDelete(editingBlock.dayName, editingBlock.block.id); setEditingBlock(null) }}
        />
      )}
    </>
  )
}
