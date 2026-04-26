// === DayView — Vue Jour timeline style Apple Calendar / Notion calendar ===

const HOUR_H = 56;

function parseTime(timeStr) {
  if (!timeStr) return { start: 0, end: 60 };
  const parts = timeStr.split(/–|→|-/).map(s => s.trim());
  const parseOne = (s) => {
    const m = s.match(/(\d{1,2})[h:](\d{0,2})/);
    if (!m) return 0;
    return parseInt(m[1]) * 60 + (parseInt(m[2]) || 0);
  };
  const start = parseOne(parts[0]);
  let end = parts[1] ? parseOne(parts[1]) : start + 60;
  if (end <= start) end += 24 * 60;
  return { start, end };
}

function fmtRange(t) {
  return t.replace(/\s*[–→-]\s*/, ' – ');
}

function Block({ block, onToggle, onSelect, currentMin }) {
  const cat = window.CATEGORIES[block.category];
  const { start, end } = parseTime(block.time);
  const isPast = currentMin > end;
  const isNow = currentMin >= start && currentMin < end;
  return (
    <button
      onClick={() => onSelect(block)}
      onDoubleClick={(e) => { e.stopPropagation(); onToggle(block.id); }}
      className={`group w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-[10px] border transition-all duration-200
        ${block.done ? 'bg-[var(--surface-1)] border-[var(--line)] opacity-60' : 'bg-[var(--surface-0)] border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-1)]'}
        ${isNow && !block.done ? 'ring-1 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]' : ''}`}
      style={{ borderColor: block.done ? undefined : undefined }}
    >
      <span
        onClick={(e) => { e.stopPropagation(); onToggle(block.id); }}
        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-all
          ${block.done ? 'bg-[var(--ink)] border-[var(--ink)] text-[var(--bg)]' : 'border-[var(--line-strong)] hover:border-[var(--ink)] hover:bg-[var(--surface-2)]'}`}
      >
        {block.done && <IconCheck size={11} stroke={2.5} />}
      </span>

      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2 mb-0.5">
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: cat.dot }}></span>
          <span className={`font-medium text-[13.5px] tracking-[-0.005em] truncate ${block.done ? 'line-through text-[var(--text-2)]' : 'text-[var(--text-1)]'}`}>
            {block.label}
          </span>
        </span>
        <span className="flex items-center gap-2 text-[11.5px] text-[var(--text-3)] tabular-nums">
          <span>{fmtRange(block.time)}</span>
          {block.note && <><span className="text-[var(--line-strong)]">·</span><span className="truncate">{block.note}</span></>}
        </span>
      </span>

      {isPast && !block.done && (
        <span className="text-[10px] uppercase tracking-wider text-[var(--accent)] font-medium mt-1 shrink-0">manqué</span>
      )}
    </button>
  );
}

function TimelineView({ schedule, dayKey, onToggle, onSelect, onAddClick }) {
  const day = schedule[dayKey];
  const blocks = day?.blocks || [];

  // Heure courante (simulée)
  const currentMin = window.useTweaks ? null : null;
  const now = new Date();
  const liveMin = now.getHours() * 60 + now.getMinutes();

  // Scope timeline 5h → 23h
  const HOUR_START = 5;
  const HOUR_END = 23;
  const hours = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);

  return (
    <div className="relative">
      <div className="grid" style={{ gridTemplateColumns: '56px 1fr', gap: 0 }}>
        {/* Colonne heures */}
        <div className="relative">
          {hours.map((h) => (
            <div key={h} className="text-[10px] tabular-nums text-[var(--text-3)] font-medium tracking-wide -mt-1.5 pr-2 text-right" style={{ height: HOUR_H }}>
              {h.toString().padStart(2,'0')}:00
            </div>
          ))}
        </div>
        {/* Pile blocs */}
        <div className="relative border-l border-[var(--line)]">
          {hours.map((h) => (
            <div key={h} className="border-b border-[var(--line)]/60" style={{ height: HOUR_H }}></div>
          ))}
          {/* Ligne maintenant */}
          {liveMin >= HOUR_START * 60 && liveMin <= HOUR_END * 60 && (
            <div className="absolute left-0 right-0 pointer-events-none z-10" style={{ top: ((liveMin - HOUR_START*60)/60)*HOUR_H }}>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] -ml-1"></div>
                <div className="h-px flex-1 bg-[var(--accent)]"></div>
              </div>
            </div>
          )}
          {/* Blocs */}
          <div className="absolute inset-0 px-2 py-0">
            {blocks.map((b) => {
              const { start, end } = parseTime(b.time);
              const top = ((start - HOUR_START*60) / 60) * HOUR_H;
              const height = Math.max(28, ((end - start)/60) * HOUR_H - 4);
              if (start < HOUR_START*60 || start > HOUR_END*60) return null;
              const cat = window.CATEGORIES[b.category];
              const isNow = liveMin >= start && liveMin < end;
              return (
                <button key={b.id} onClick={() => onSelect(b)}
                  onDoubleClick={(e) => { e.stopPropagation(); onToggle(b.id); }}
                  className={`absolute left-2 right-2 text-left rounded-[8px] border px-2.5 py-1.5 transition-all duration-200
                    ${b.done ? 'bg-[var(--surface-1)] opacity-55' : 'bg-[var(--surface-0)] hover:shadow-sm hover:border-[var(--line-strong)]'}`}
                  style={{
                    top: top + 2, height,
                    borderColor: 'var(--line)',
                    borderLeft: `2px solid ${cat.dot}`,
                  }}>
                  <div className={`text-[11.5px] font-medium tracking-[-0.005em] truncate ${b.done ? 'line-through text-[var(--text-2)]' : 'text-[var(--text-1)]'}`}>
                    {b.label}
                  </div>
                  {height > 38 && (
                    <div className="text-[10px] tabular-nums text-[var(--text-3)] mt-0.5 truncate">{fmtRange(b.time)}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ListView({ schedule, dayKey, onToggle, onSelect, onAddClick }) {
  const day = schedule[dayKey];
  const blocks = day?.blocks || [];
  const now = new Date();
  const liveMin = now.getHours() * 60 + now.getMinutes();

  // Group by phase
  const phases = [
    { key: 'morning', label: 'Matin',     range: [0, 12*60] },
    { key: 'afternoon', label: 'Après-midi', range: [12*60, 18*60] },
    { key: 'evening', label: 'Soir',      range: [18*60, 30*60] },
  ];

  return (
    <div className="space-y-7">
      {phases.map(p => {
        const items = blocks.filter(b => {
          const { start } = parseTime(b.time);
          return start >= p.range[0] && start < p.range[1];
        });
        if (items.length === 0) return null;
        return (
          <section key={p.key}>
            <div className="flex items-baseline justify-between mb-2.5 px-0.5">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-3)]">{p.label}</h3>
              <span className="text-[11px] tabular-nums text-[var(--text-3)]">{items.filter(b=>b.done).length}/{items.length}</span>
            </div>
            <div className="space-y-1">
              {items.map(b => <Block key={b.id} block={b} onToggle={onToggle} onSelect={onSelect} currentMin={liveMin} />)}
            </div>
          </section>
        );
      })}

      <button onClick={onAddClick}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-[12.5px] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-1)] rounded-[10px] transition-all duration-150 border border-dashed border-[var(--line)] hover:border-[var(--line-strong)]">
        <IconPlus size={14} /> <span>Ajouter un bloc</span>
      </button>
    </div>
  );
}

function DayView({ schedule, dayKey, viewMode, onToggle, onSelect, onAddClick }) {
  if (viewMode === 'timeline') {
    return <TimelineView schedule={schedule} dayKey={dayKey} onToggle={onToggle} onSelect={onSelect} onAddClick={onAddClick} />;
  }
  return <ListView schedule={schedule} dayKey={dayKey} onToggle={onToggle} onSelect={onSelect} onAddClick={onAddClick} />;
}

Object.assign(window, { DayView, parseTime, fmtRange });
