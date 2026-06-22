import { useState, useEffect, useRef } from 'react'
import { X, Check, FileText, Trash2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useCategories } from '../contexts/CategoriesContext'

const PRIORITIES = [
  { value: 'normal', label: 'Normal' },
  { value: 'important', label: 'Important' },
  { value: 'urgent', label: 'Urgent' },
]
const PALETTE = ['#A8A29E', '#78716C', '#0A0A0A', '#D97706', '#0369A1', '#15803D', '#1E40AF', '#44403C', '#9333EA', '#DC2626', '#0891B2', '#CA8A04']
const POPULAR_EMOJIS = ['💻', '📚', '💪', '🧘', '🍔', '🚗', '📞', '✍️', '🎯', '😴']
const RECURRENCES = [
  { label: 'Aucune', value: null },
  { label: 'Quotidien', value: 0 },
  { label: 'Hebdo', value: 1 },
  { label: '2 sem', value: 2 },
  { label: '3 sem', value: 3 },
  { label: 'Mensuelle', value: 4 },
]

// ── Horaire : on stocke une chaîne canonique "Xh → Yh" (format DB/IA/OCR) ──
function toInputTime(s) {
  if (!s) return ''
  const m = String(s).trim().match(/(\d{1,2})\s*[h:]\s*(\d{0,2})/i)
  if (!m) return ''
  const h = String(Math.min(23, Math.max(0, parseInt(m[1], 10)))).padStart(2, '0')
  const min = (m[2] || '0').padStart(2, '0').slice(0, 2)
  return `${h}:${min}`
}
function toDisplayTime(hhmm) {
  if (!hhmm) return ''
  const [h, mm] = hhmm.split(':')
  const H = parseInt(h, 10)
  return mm && mm !== '00' ? `${H}h${mm}` : `${H}h`
}
function parseTimeString(t) {
  if (!t || t === 'À définir') return { start: '', end: '' }
  const [a, b] = String(t).split('→').map(x => (x || '').trim())
  return { start: toInputTime(a), end: b && b !== 'À définir' ? toInputTime(b) : '' }
}
function buildTimeString(start, end) {
  if (!start) return 'À définir'
  const s = toDisplayTime(start)
  return end ? `${s} → ${toDisplayTime(end)}` : `${s} → À définir`
}

const LABEL_CLS = 'text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-3)]'
const FIELD_CLS = 'bg-[var(--surface-1)] border border-[var(--line)] rounded-[10px] text-[var(--text-1)] outline-none focus:border-[var(--line-strong)] transition-colors'

/**
 * Éditeur de bloc unifié — même UI pour l'ajout et la modification.
 * mode "add"  : submit explicite (onAdd) + ajout en série.
 * mode "edit" : autosave au blur/clic (onUpdate), toggle (onToggle), suppression (onDelete).
 */
export default function BlockEditor({ mode = 'add', dayName, block, initialStartTime = '', onClose, onAdd, onUpdate, onToggle, onDelete }) {
  const isEdit = mode === 'edit'
  const { allLabels, addCategory, getCategoryDetails } = useCategories()

  const [label, setLabel] = useState('')
  const [emoji, setEmoji] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [category, setCategory] = useState('work')
  const [priority, setPriority] = useState('normal')
  const [note, setNote] = useState('')
  const [color, setColor] = useState('')
  const [recurrenceInterval, setRecurrenceInterval] = useState(null)
  const [customRec, setCustomRec] = useState('')
  const [continuousAdd, setContinuousAdd] = useState(false)
  const [addingCat, setAddingCat] = useState(false)
  const [newCatLabel, setNewCatLabel] = useState('')
  const labelRef = useRef(null)
  const newCatRef = useRef(null)

  useEffect(() => {
    if (isEdit && block) {
      const t = parseTimeString(block.time)
      setLabel(block.label || '')
      setEmoji(block.emoji || '')
      setStartTime(t.start)
      setEndTime(t.end)
      setCategory(block.category || 'rest')
      setPriority(block.priority || 'normal')
      setNote(block.note || block.description || '')   // fallback legacy: anciennes notes en colonne description
      setColor(block.color || '')
      setRecurrenceInterval(block.recurrenceInterval ?? null)
      setCustomRec('')
    } else if (!isEdit) {
      setStartTime(initialStartTime || '')
    }
  }, [isEdit, block, initialStartTime])

  // En mode edit : sauvegarde immédiate du patch. En mode add : no-op (collecté au submit).
  const commit = (patch) => { if (isEdit && block) onUpdate?.(block.id, patch) }

  const cat = getCategoryDetails(category)
  const dotColor = color || cat?.color || 'var(--text-1)'

  function handleSubmit(e) {
    e.preventDefault()
    if (isEdit) return
    if (!label.trim()) return
    onAdd?.({
      label: label.trim(),
      time: buildTimeString(startTime, endTime),
      category,
      priority,
      note: note.trim(),
      color: color || undefined,
      emoji: emoji || undefined,
      recurrenceInterval: recurrenceInterval ?? null,
    })
    if (continuousAdd) {
      setLabel(''); setEmoji(''); setStartTime(''); setEndTime(''); setNote(''); setColor(''); setRecurrenceInterval(null); setCustomRec('')
      labelRef.current?.focus()
    } else {
      onClose?.()
    }
  }

  function pickCategory(k) { setCategory(k); setColor(''); commit({ category: k, color: '' }) }
  function pickColor(c) { setColor(c); commit({ color: c }) }
  function resetColor() { setColor(''); commit({ color: '' }) }
  function pickRecurrence(v) { setRecurrenceInterval(v); setCustomRec(''); commit({ recurrenceInterval: v }) }
  function pickPriority(v) { setPriority(v); commit({ priority: v }) }
  function pickEmoji(e2) { setEmoji(e2); commit({ emoji: e2 }) }

  function handleAddCat(e) {
    e.preventDefault()
    if (!newCatLabel.trim()) return
    const key = addCategory(newCatLabel)
    pickCategory(key)
    setNewCatLabel(''); setAddingCat(false)
  }

  return (
    <Sheet open onOpenChange={open => !open && onClose?.()}>
      <SheetContent side="bottom" className="max-h-[92vh] flex flex-col px-0 pb-0 bg-[var(--bg)] rounded-t-[24px] border-t border-[var(--line)] shadow-2xl">
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-[var(--line-strong)]" />
        </div>

        <SheetHeader className="px-5 pt-3 pb-4 shrink-0 text-left">
          <div className="flex items-center justify-between gap-3">
            {isEdit ? (
              <div className="flex items-center gap-2 text-[11.5px] text-[var(--text-3)] min-w-0">
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
                <SheetTitle className="uppercase tracking-[0.1em] font-medium text-[11.5px] text-[var(--text-3)] truncate">{cat?.label || 'Bloc'}</SheetTitle>
              </div>
            ) : (
              <div className="min-w-0">
                <SheetTitle className="text-xl font-bold tracking-tight text-[var(--text-1)]">Nouveau bloc</SheetTitle>
                <SheetDescription className="capitalize mt-0.5 text-[var(--text-3)]">{dayName}</SheetDescription>
              </div>
            )}
            <div className="flex items-center gap-1 shrink-0">
              {isEdit && onDelete && (
                <button type="button" onClick={() => { onDelete(); onClose?.() }}
                  className="p-1.5 rounded-[8px] text-[var(--text-3)] hover:text-[var(--danger)] hover:bg-[var(--surface-1)] transition-colors">
                  <Trash2 size={16} />
                </button>
              )}
              <button type="button" onClick={onClose}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-2)] transition-colors">
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 pb-8 space-y-6">

          {/* Titre & emoji */}
          <div className="space-y-2.5">
            <label className={LABEL_CLS}>Titre {!isEdit && '*'}</label>
            <div className="flex items-start gap-2.5">
              {isEdit && (
                <button type="button" onClick={() => block && onToggle?.(block.id)}
                  className={cn('mt-1 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-all',
                    block?.done ? 'bg-[var(--ink)] border-[var(--ink)] text-[var(--bg)]' : 'border-[var(--line-strong)] hover:border-[var(--ink)]')}>
                  {block?.done && <Check size={13} strokeWidth={2.5} />}
                </button>
              )}
              <input value={emoji} onChange={e => setEmoji(e.target.value)} onBlur={() => commit({ emoji })} maxLength={2} placeholder="🌍"
                className={cn('w-12 text-center py-2 text-xl', FIELD_CLS)} />
              <input ref={labelRef} autoFocus={!isEdit} value={label} onChange={e => setLabel(e.target.value)} onBlur={() => commit({ label })} placeholder="Ex: Réunion, Sport…"
                className={cn('flex-1 px-3 py-2 text-[15px] font-medium', FIELD_CLS, block?.done && isEdit && 'line-through text-[var(--text-2)]')} />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {POPULAR_EMOJIS.map(e => (
                <button type="button" key={e} onClick={() => pickEmoji(e)}
                  className="text-xl p-1.5 hover:bg-[var(--surface-1)] rounded-lg transition-colors shrink-0">{e}</button>
              ))}
            </div>
          </div>

          {/* Horaire + priorité */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className={LABEL_CLS}>Horaire</label>
              <div className="flex items-center gap-1.5">
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} onBlur={() => commit({ time: buildTimeString(startTime, endTime) })}
                  className={cn('px-2 py-1.5 text-[13px] tabular-nums min-w-0 flex-1', FIELD_CLS)} />
                <span className="text-[var(--text-3)] text-[13px]">→</span>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} onBlur={() => commit({ time: buildTimeString(startTime, endTime) })}
                  className={cn('px-2 py-1.5 text-[13px] tabular-nums min-w-0 flex-1', FIELD_CLS)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className={LABEL_CLS}>Priorité</label>
              <Select value={priority} onValueChange={pickPriority}>
                <SelectTrigger className="bg-[var(--surface-1)] border-[var(--line)] rounded-[10px] h-[37px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Catégorie */}
          <div className="space-y-2.5">
            <label className={LABEL_CLS}>Catégorie</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(allLabels).map(([k, lbl]) => {
                const active = k === category
                const { color: c } = getCategoryDetails(k)
                return (
                  <button type="button" key={k} onClick={() => pickCategory(k)}
                    className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11.5px] border transition-all',
                      active ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]' : 'border-[var(--line)] hover:border-[var(--line-strong)] text-[var(--text-2)]')}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
                    {lbl}
                  </button>
                )
              })}
            </div>
            {addingCat ? (
              <div className="flex gap-2 pt-1">
                <input ref={newCatRef} autoFocus value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} placeholder="Nom…"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCat(e) }}
                  className={cn('flex-1 px-3 py-2 text-xs', FIELD_CLS)} />
                <button type="button" onClick={handleAddCat} className="px-3 py-2 rounded-[10px] bg-[var(--ink)] text-[var(--bg)] text-xs font-semibold">OK</button>
                <button type="button" onClick={() => setAddingCat(false)} className="px-2 py-2 rounded-[10px] text-[var(--text-3)] hover:bg-[var(--surface-1)]"><X className="h-3.5 w-3.5" /></button>
              </div>
            ) : (
              <button type="button" onClick={() => setAddingCat(true)}
                className="flex items-center gap-1.5 text-xs text-[var(--text-3)] hover:text-[var(--brand)] transition-colors pt-0.5">
                <Plus className="h-3 w-3" /> Nouvelle catégorie
              </button>
            )}
          </div>

          {/* Couleur */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className={LABEL_CLS}>Couleur</label>
              {color && (
                <button type="button" onClick={resetColor} className="text-[10px] text-[var(--brand)] font-medium">Réinitialiser</button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              {PALETTE.map(c => (
                <button type="button" key={c} onClick={() => pickColor(c)}
                  className={cn('h-7 w-7 rounded-full transition-transform hover:scale-110 grid place-items-center',
                    dotColor === c && 'ring-2 ring-offset-2 ring-offset-[var(--bg)] ring-[var(--text-1)]')}
                  style={{ background: c }}>
                  {dotColor === c && <Check size={11} strokeWidth={3} className="text-white" />}
                </button>
              ))}
              <label className={cn('h-7 w-7 rounded-full cursor-pointer relative overflow-hidden border border-[var(--line)] grid place-items-center',
                color && !PALETTE.includes(color) && 'ring-2 ring-offset-2 ring-offset-[var(--bg)] ring-[var(--text-1)]')}
                style={{ background: color && !PALETTE.includes(color) ? color : 'conic-gradient(from 0deg, #ef4444,#f59e0b,#84cc16,#06b6d4,#3b82f6,#a855f7,#ef4444)' }}>
                <input type="color" value={color || '#888888'} onChange={e => pickColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
              </label>
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className={cn(LABEL_CLS, 'flex items-center gap-1.5')}><FileText size={12} /> Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} onBlur={() => commit({ note, description: note })} placeholder="Objectifs, contexte…" rows={3}
              className={cn('w-full px-3 py-2 text-[13.5px] leading-[1.6] resize-none placeholder:text-[var(--text-3)]', FIELD_CLS)} />
          </div>

          {/* Récurrence */}
          <div className="space-y-2.5">
            <label className={LABEL_CLS}>Récurrence</label>
            <div className="flex flex-wrap gap-1.5">
              {RECURRENCES.map(r => (
                <button type="button" key={String(r.value)} onClick={() => pickRecurrence(r.value)}
                  className={cn('px-2.5 py-1.5 rounded-full text-[11.5px] border transition-all',
                    recurrenceInterval === r.value ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]' : 'border-[var(--line)] hover:border-[var(--line-strong)] text-[var(--text-2)]')}>
                  {r.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[11px] text-[var(--text-3)]">Toutes les</span>
              <input type="number" inputMode="numeric" min="1" max="52" value={customRec} placeholder="N" aria-label="Intervalle en semaines"
                onChange={e => {
                  const raw = e.target.value; setCustomRec(raw)
                  const v = parseInt(raw)
                  if (!isNaN(v) && v >= 1) { setRecurrenceInterval(v); commit({ recurrenceInterval: v }) }
                }}
                className={cn('w-14 text-center px-2 py-1 text-[13px]', FIELD_CLS)} />
              <span className="text-[11px] text-[var(--text-3)]">semaines</span>
              {recurrenceInterval !== null && recurrenceInterval > 0 && (
                <span className="text-[10px] text-[var(--brand)] font-medium ml-auto">S.+{recurrenceInterval}</span>
              )}
            </div>
          </div>

          {/* Pied : add = submit + série ; edit = terminer */}
          {isEdit ? (
            <button type="button" onClick={onClose}
              className="w-full py-3 rounded-[12px] bg-[var(--ink)] text-[var(--bg)] text-[13px] font-semibold hover:opacity-90 transition-opacity">
              Terminer
            </button>
          ) : (
            <div className="pt-1 flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[13px] text-[var(--text-2)] font-medium cursor-pointer" htmlFor="cont">Créer plusieurs blocs à la suite</label>
                <Switch id="cont" checked={continuousAdd} onCheckedChange={setContinuousAdd} />
              </div>
              <button type="submit" disabled={!label.trim()}
                className="w-full bg-[var(--brand)] active:scale-[0.98] transition-transform text-white font-bold rounded-[12px] py-3.5 disabled:opacity-50 flex justify-center items-center gap-2 text-[15px]">
                <Plus className="h-5 w-5" /> Ajouter à ma semaine
              </button>
            </div>
          )}
        </form>
      </SheetContent>
    </Sheet>
  )
}
