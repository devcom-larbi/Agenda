import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Check, Pencil, Archive, Layers } from 'lucide-react'
import { usePlanning } from '../contexts/PlanningContext'

/**
 * Sélecteur de planning. Deux modes :
 * - Bascule : un planning actif affiché (clic = changer).
 * - Superposition (overlay) : cocher les plannings à afficher ensemble (lecture seule).
 * `compact` pour le header mobile.
 */
export default function PlanningSwitcher({ compact = false }) {
  const {
    plannings, activePlanning, activePlanningId, setActivePlanning,
    createPlanning, renamePlanning, archivePlanning,
    overlayMode, visiblePlanningIds, setOverlayMode, toggleOverlayPlanning,
  } = usePlanning()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  if (!activePlanning) return null

  async function handleCreate() {
    const name = window.prompt('Nom du nouveau planning ?')
    if (name && name.trim()) { await createPlanning({ name: name.trim() }); setOpen(false) }
  }
  function handleRename(p) {
    const name = window.prompt('Renommer le planning', p.name)
    if (name && name.trim()) renamePlanning(p.id, { name: name.trim() })
  }
  function handleArchive(p) {
    if (window.confirm(`Archiver « ${p.name} » ? Tu pourras le retrouver plus tard.`)) archivePlanning(p.id)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Changer de planning"
        className={`flex items-center gap-2 rounded-[10px] transition-colors hover:bg-[var(--surface-1)] ${compact ? 'px-2 py-1.5 max-w-[160px]' : 'px-2.5 py-2 w-full'}`}
        style={{ color: 'var(--text-1)' }}>
        {overlayMode
          ? <Layers size={14} className="shrink-0" style={{ color: 'var(--brand)' }} />
          : <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: activePlanning.color }} />}
        <span className="truncate text-[13px] font-semibold">
          {overlayMode
            ? `Superposition · ${visiblePlanningIds.length}`
            : `${activePlanning.emoji ? `${activePlanning.emoji} ` : ''}${activePlanning.name}`}
        </span>
        <ChevronDown size={14} className="shrink-0 ml-auto" style={{ color: 'var(--text-3)' }} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[240px] rounded-[12px] border p-1.5 shadow-xl"
          style={{ background: 'var(--surface-0)', borderColor: 'var(--line)' }}>

          {/* Bascule mode Bascule / Superposition */}
          <button onClick={() => setOverlayMode(!overlayMode)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[8px] hover:bg-[var(--surface-1)]">
            <Layers size={14} style={{ color: overlayMode ? 'var(--brand)' : 'var(--text-3)' }} />
            <span className="text-[13px]" style={{ color: 'var(--text-1)' }}>Superposer les plannings</span>
            <span className={`ml-auto h-4 w-7 rounded-full p-0.5 transition-colors ${overlayMode ? 'bg-[var(--brand)]' : 'bg-[var(--surface-2)]'}`}>
              <span className={`block h-3 w-3 rounded-full bg-white transition-transform ${overlayMode ? 'translate-x-3' : ''}`} />
            </span>
          </button>
          <div className="h-px my-1 bg-[var(--line)]" />

          {plannings.map(p => {
            const checked = visiblePlanningIds.includes(p.id)
            return (
              <div key={p.id} className="group flex items-center gap-1 rounded-[8px] hover:bg-[var(--surface-1)]">
                <button
                  onClick={() => { overlayMode ? toggleOverlayPlanning(p.id) : (setActivePlanning(p.id), setOpen(false)) }}
                  className="flex-1 flex items-center gap-2 px-2.5 py-2 text-left min-w-0">
                  {overlayMode && (
                    <span className={`h-3.5 w-3.5 rounded-[4px] border grid place-items-center shrink-0 ${checked ? 'bg-[var(--brand)] border-[var(--brand)]' : 'border-[var(--line-strong)]'}`}>
                      {checked && <Check size={10} strokeWidth={3} className="text-white" />}
                    </span>
                  )}
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
                  <span className="truncate text-[13px]" style={{ color: 'var(--text-1)' }}>
                    {p.emoji ? `${p.emoji} ` : ''}{p.name}
                  </span>
                  {!overlayMode && p.id === activePlanningId && <Check size={14} className="ml-auto shrink-0" style={{ color: 'var(--brand)' }} />}
                </button>
                <button onClick={() => handleRename(p)} aria-label="Renommer le planning"
                  className="p-1.5 rounded-[6px] opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-2)]" style={{ color: 'var(--text-3)' }}>
                  <Pencil size={13} />
                </button>
                {plannings.length > 1 && (
                  <button onClick={() => handleArchive(p)} aria-label="Archiver le planning"
                    className="p-1.5 rounded-[6px] opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-2)]" style={{ color: 'var(--text-3)' }}>
                    <Archive size={13} />
                  </button>
                )}
              </div>
            )
          })}

          <button onClick={handleCreate}
            className="w-full flex items-center gap-2 px-2.5 py-2 mt-1 rounded-[8px] text-[13px] font-medium border-t hover:bg-[var(--surface-1)]"
            style={{ color: 'var(--brand)', borderColor: 'var(--line)' }}>
            <Plus size={14} /> Nouveau planning
          </button>
        </div>
      )}
    </div>
  )
}
