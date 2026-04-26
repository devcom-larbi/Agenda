// === WeekView — Style "Focus" : scroll horizontal de cartes-jour façon kanban ===

function WeekView({ schedule, onToggle, onSelect, currentDayKey, onSelectDay }) {
  const monthName = 'Avril';
  return (
    <div className="relative">
      {/* Scroller horizontal */}
      <div className="overflow-x-auto -mx-1 px-1 pb-3" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
          {window.DAYS_ORDER.map((dk, i) => {
            const day = schedule[dk];
            const blocks = day.blocks;
            const done = blocks.filter(b=>b.done).length;
            const pct = blocks.length ? done/blocks.length : 0;
            const isToday = i === window.TODAY_INDEX;
            const isSelected = currentDayKey === dk;
            return (
              <div key={dk}
                className={`shrink-0 w-[260px] rounded-[16px] border transition-all flex flex-col
                  ${isSelected ? 'border-[var(--line-strong)] bg-[var(--surface-0)] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)]' : 'border-[var(--line)] bg-[var(--surface-0)]/60 hover:bg-[var(--surface-0)]'}`}
                style={{ minHeight: 540 }}>
                {/* Card header */}
                <button onClick={() => onSelectDay(dk)}
                  className="text-left px-4 pt-4 pb-3 group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10.5px] font-semibold uppercase tracking-[0.14em]
                      ${isToday ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'}`}>
                      {day.label}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); }}
                      className="h-6 w-6 rounded-full grid place-items-center text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] transition-colors opacity-0 group-hover:opacity-100">
                      <IconPlus size={13} stroke={2}/>
                    </button>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[26px] font-semibold tabular-nums tracking-[-0.025em] leading-none text-[var(--text-1)]">
                      {window.WEEK_DATES[i]}
                    </span>
                    <span className="text-[12px] text-[var(--text-3)] lowercase">{monthName.slice(0,4).toLowerCase()}.</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-[2px] rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div className="h-full bg-[var(--ink)] transition-all" style={{width:`${pct*100}%`}}></div>
                    </div>
                    <span className="text-[10.5px] tabular-nums text-[var(--text-3)] font-medium">{done}/{blocks.length}</span>
                  </div>
                </button>

                {/* Body — colored blocks */}
                <div className="flex-1 px-3 pb-3 space-y-1.5 overflow-y-auto" style={{ maxHeight: 460 }}>
                  {blocks.length === 0 ? (
                    <div className="grid place-items-center h-32 text-[12px] text-[var(--text-3)]">
                      Aucun événement
                    </div>
                  ) : blocks.map(b => {
                    const cat = window.CATEGORIES[b.category];
                    const time = b.time.split(/[–→-]/)[0].trim();
                    const timeEnd = b.time.split(/[–→-]/)[1]?.trim();
                    return (
                      <button key={b.id} onClick={() => onSelect(b)}
                        onDoubleClick={(e) => { e.stopPropagation(); onToggle(b.id); }}
                        className={`w-full text-left rounded-[10px] px-3 py-2 transition-all group/block relative overflow-hidden
                          ${b.done ? 'opacity-45' : ''}`}
                        style={{
                          background: hexToTint(cat.dot, 0.10),
                          border: `1px solid ${hexToTint(cat.dot, 0.18)}`,
                        }}>
                        {/* Left accent bar */}
                        <span className="absolute inset-y-0 left-0 w-[3px]" style={{background: cat.dot}}></span>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{background: cat.dot}}></span>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{color: cat.dot, opacity: 0.85}}>
                            {cat.label}
                          </span>
                          {b.done && (
                            <span className="ml-auto text-[var(--text-3)] opacity-70">
                              <IconCheck size={11} stroke={2.5}/>
                            </span>
                          )}
                        </div>
                        <div className={`text-[12.5px] font-medium tracking-[-0.005em] leading-snug
                          ${b.done ? 'line-through text-[var(--text-2)]' : 'text-[var(--text-1)]'}`}>
                          {b.label}
                        </div>
                        <div className="text-[10.5px] tabular-nums text-[var(--text-3)] mt-0.5">
                          {time} {timeEnd && <span>→ {timeEnd}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Helper — light tint from a hex color
function hexToTint(hex, alpha) {
  if (!hex || !hex.startsWith('#')) return `rgba(120,120,120,${alpha})`;
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

Object.assign(window, { WeekView, hexToTint });
