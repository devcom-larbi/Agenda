import { useState, useEffect } from 'react';
import { X, Check, FileText } from 'lucide-react';
import { useCategories } from '../contexts/CategoriesContext';

export default function BlockDetail({ block, onClose, onToggle, onUpdate }) {
  const { getCategoryDetails, categories } = useCategories();
  const [label, setLabel] = useState(block?.label || '');
  const [note, setNote] = useState(block?.note || '');
  const [category, setCategory] = useState(block?.category || 'rest');
  const [customColor, setCustomColor] = useState(block?.color || '');
  const [timeStart, setTimeStart] = useState(block?.time?.start || '');
  const [timeEnd, setTimeEnd] = useState(block?.time?.end || '');
  const [recurrenceType, setRecurrenceType] = useState(block?.recurrenceType || 'none');

  useEffect(() => {
    setLabel(block?.label || '');
    setNote(block?.note || '');
    setCategory(block?.category || 'rest');
    setCustomColor(block?.color || '');
    setTimeStart(block?.time?.start || '');
    setTimeEnd(block?.time?.end || '');
    setRecurrenceType(block?.recurrenceType || 'none');
  }, [block]);

  if (!block) return null;

  const cat = getCategoryDetails(category) || getCategoryDetails('rest');
  const dotColor = customColor || cat?.color || 'var(--text-1)';

  const PALETTE = ['#A8A29E','#78716C','#0A0A0A','#D97706','#0369A1','#15803D','#1E40AF','#44403C','#9333EA','#DC2626','#0891B2','#CA8A04'];

  function saveTime(start, end) {
    onUpdate(block.id, { time: { start, end } });
  }

  return (
    <div>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-[fadeIn_.15s_ease]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] bg-[var(--bg)] z-50 border-l border-[var(--line)] shadow-2xl flex flex-col animate-[slideInR_.25s_cubic-bezier(.2,.8,.2,1)]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-2 text-[11.5px] text-[var(--text-3)]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor }} />
            <span className="uppercase tracking-[0.1em] font-medium">{cat?.label}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-[6px] hover:bg-[var(--surface-1)] text-[var(--text-2)]">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Titre */}
          <div className="flex items-start gap-3">
            <button
              onClick={() => onToggle(block.id)}
              className={`mt-1 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-all
                ${block.done ? 'bg-[var(--ink)] border-[var(--ink)] text-[var(--bg)]' : 'border-[var(--line-strong)] hover:border-[var(--ink)]'}`}>
              {block.done && <Check size={13} strokeWidth={2.5} />}
            </button>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              onBlur={() => onUpdate(block.id, { label })}
              className={`flex-1 bg-transparent border-0 outline-none text-[26px] font-medium tracking-[-0.02em] leading-[1.15] w-full
                ${block.done ? 'line-through text-[var(--text-2)]' : 'text-[var(--text-1)]'}`}
            />
          </div>

          {/* Horaire */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-3)] mb-2">Horaire</div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={timeStart}
                onChange={e => setTimeStart(e.target.value)}
                onBlur={() => saveTime(timeStart, timeEnd)}
                className="bg-[var(--surface-1)] border border-[var(--line)] rounded-[8px] px-3 py-1.5 text-[13px] text-[var(--text-1)] outline-none tabular-nums"
              />
              <span className="text-[var(--text-3)] text-[13px]">→</span>
              <input
                type="time"
                value={timeEnd}
                onChange={e => setTimeEnd(e.target.value)}
                onBlur={() => saveTime(timeStart, timeEnd)}
                className="bg-[var(--surface-1)] border border-[var(--line)] rounded-[8px] px-3 py-1.5 text-[13px] text-[var(--text-1)] outline-none tabular-nums"
              />
            </div>
          </div>

          {/* Récurrence */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-3)] mb-2">Récurrence</div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'none',      label: 'Aucune' },
                { id: 'daily',     label: 'Quotidienne' },
                { id: 'weekly',    label: 'Hebdo' },
                { id: 'biweekly',  label: '2 semaines' },
                { id: 'monthly',   label: 'Mensuelle' },
              ].map(r => (
                <button key={r.id}
                  onClick={() => { setRecurrenceType(r.id); onUpdate(block.id, { recurrenceType: r.id }); }}
                  className={`px-2.5 py-1.5 rounded-full text-[11.5px] border transition-all
                    ${recurrenceType === r.id ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]' : 'border-[var(--line)] text-[var(--text-2)] hover:border-[var(--line-strong)]'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Catégorie */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-3)] mb-2.5">Catégorie</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(categories || {}).map(([k, v]) => {
                const active = k === category;
                return (
                  <button key={k} onClick={() => { setCategory(k); setCustomColor(''); onUpdate(block.id, { category: k, color: '' }); }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11.5px] border transition-all
                      ${active ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]' : 'border-[var(--line)] hover:border-[var(--line-strong)] text-[var(--text-2)]'}`}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: v.color || v.dot }} />
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Couleur */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-3)] mb-2.5 flex items-center justify-between">
              <span>Couleur</span>
              {customColor && (
                <button onClick={() => { setCustomColor(''); onUpdate(block.id, { color: '' }); }}
                  className="text-[10px] text-[var(--accent)] normal-case font-medium tracking-normal">
                  Réinitialiser
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              {PALETTE.map(c => (
                <button key={c} onClick={() => { setCustomColor(c); onUpdate(block.id, { color: c }); }}
                  className={`h-7 w-7 rounded-full transition-transform hover:scale-110 grid place-items-center
                    ${dotColor === c ? 'ring-2 ring-offset-2 ring-offset-[var(--bg)] ring-[var(--text-1)]' : ''}`}
                  style={{ background: c }}>
                  {dotColor === c && <Check size={11} strokeWidth={3} className="text-white" />}
                </button>
              ))}
              <label
                className={`h-7 w-7 rounded-full cursor-pointer relative overflow-hidden border border-[var(--line)] grid place-items-center
                  ${customColor && !PALETTE.includes(customColor) ? 'ring-2 ring-offset-2 ring-offset-[var(--bg)] ring-[var(--text-1)]' : ''}`}
                style={{ background: customColor && !PALETTE.includes(customColor) ? customColor : 'conic-gradient(from 0deg, #ef4444,#f59e0b,#84cc16,#06b6d4,#3b82f6,#a855f7,#ef4444)' }}>
                <input type="color" value={customColor || '#888888'}
                  onChange={e => { setCustomColor(e.target.value); onUpdate(block.id, { color: e.target.value }); }}
                  className="absolute inset-0 opacity-0 cursor-pointer" />
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-3)] mb-2">
              <FileText size={12} /> Notes
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              onBlur={() => onUpdate(block.id, { note })}
              placeholder="Ajouter une note…"
              className="w-full bg-transparent border-0 outline-none resize-none text-[13.5px] text-[var(--text-1)] placeholder:text-[var(--text-3)] leading-[1.6] min-h-[100px]"
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[var(--line)]">
          <button onClick={onClose}
            className="w-full px-3 py-2 rounded-[8px] bg-[var(--ink)] text-[var(--bg)] text-[12.5px] font-medium hover:opacity-90">
            Terminer
          </button>
        </div>
      </div>
    </div>
  );
}
