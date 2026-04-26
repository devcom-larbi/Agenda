// === Mobile Components — iOS Notion style ===
const { useState: useStateM, useEffect: useEffectM, useRef: useRefM } = React;

// ── Bottom Tab Bar (iOS native) ──────────────────────────────
function MobileTabBar({ active, onChange, onAddBlock }) {
  const tabs = [
    { id: 'today',  label: "Jour",      icon: IconCalendar },
    { id: 'week',   label: 'Semaine',   icon: IconList },
    { id: 'add',    label: '',          icon: IconPlus, primary: true },
    { id: 'goals',  label: 'Objectifs', icon: IconTarget },
    { id: 'review', label: 'Bilan',     icon: IconChart },
  ];
  return (
    <div className="absolute left-0 right-0 bottom-0 z-30">
      <div className="absolute inset-x-0 bottom-0 h-[112px] pointer-events-none"
           style={{ background: 'linear-gradient(to top, var(--bg) 60%, transparent)' }}></div>
      <div className="relative px-3 pb-6 pt-1">
        <div className="flex items-center justify-around bg-[var(--surface-0)]/85 backdrop-blur-2xl border border-[var(--line)] rounded-[24px] px-1 py-1 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.12)]">
          {tabs.map(t => {
            const Ico = t.icon;
            if (t.primary) {
              return (
                <button key={t.id} onClick={onAddBlock}
                  className="flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-[16px] active:scale-90 transition-transform">
                  <div className="h-9 w-9 rounded-full bg-[var(--ink)] text-[var(--bg)] grid place-items-center shadow-[0_4px_12px_-2px_rgba(0,0,0,0.25)]">
                    <Ico size={17} stroke={2.2}/>
                  </div>
                </button>
              );
            }
            const isActive = active === t.id;
            return (
              <button key={t.id} onClick={() => onChange(t.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-[14px] active:scale-95 transition-all flex-1
                  ${isActive ? 'text-[var(--text-1)]' : 'text-[var(--text-3)]'}`}>
                <Ico size={20} stroke={isActive ? 2.2 : 1.7}/>
                <span className="text-[10px] font-medium tracking-tight">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Sticky day picker (iOS calendar style) ────────────────────
function MobileDayStrip({ schedule, currentDayKey, onSelect }) {
  return (
    <div className="px-4 pt-2 pb-3">
      <div className="grid grid-cols-7 gap-1.5">
        {window.DAYS_ORDER.map((dk, i) => {
          const isActive = currentDayKey === dk;
          const isToday = i === window.TODAY_INDEX;
          const blocks = schedule[dk].blocks;
          const done = blocks.filter(b=>b.done).length;
          return (
            <button key={dk} onClick={() => onSelect(dk)}
              className={`flex flex-col items-center gap-1 py-2 rounded-[12px] active:scale-95 transition-all
                ${isActive ? 'bg-[var(--ink)] text-[var(--bg)]' : 'hover:bg-[var(--surface-1)]'}`}>
              <span className={`text-[9.5px] font-medium uppercase tracking-[0.08em]
                ${isActive ? 'text-[var(--bg)]/70' : isToday ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'}`}>
                {schedule[dk].label.slice(0,3)}
              </span>
              <span className={`text-[17px] font-medium tabular-nums tracking-tight
                ${isActive ? 'text-[var(--bg)]' : 'text-[var(--text-1)]'}`}>
                {window.WEEK_DATES[i]}
              </span>
              <span className={`h-[3px] w-[3px] rounded-full
                ${done === blocks.length && blocks.length > 0
                  ? (isActive ? 'bg-[var(--bg)]' : 'bg-[var(--ink)]')
                  : isToday && !isActive ? 'bg-[var(--accent)]'
                  : 'bg-transparent'}`}></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Mobile Block Row ────────────────────────────────
function MobileBlock({ block, onToggle, onSelect }) {
  const cat = window.CATEGORIES[block.category];
  const [pressed, setPressed] = useStateM(false);
  return (
    <button
      onClick={() => onSelect(block)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      className={`group w-full text-left flex items-start gap-3 px-4 py-3 transition-all duration-150 active:bg-[var(--surface-1)]
        ${pressed ? 'bg-[var(--surface-1)]' : ''}`}>
      <span
        onClick={(e) => { e.stopPropagation(); onToggle(block.id); }}
        className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all active:scale-90
          ${block.done ? 'bg-[var(--ink)] border-[var(--ink)] text-[var(--bg)]' : 'border-[var(--line-strong)]'}`}>
        {block.done && <IconCheck size={13} stroke={2.5}/>}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: cat.dot }}></span>
          <span className={`font-medium text-[15px] tracking-[-0.01em] truncate
            ${block.done ? 'line-through text-[var(--text-3)]' : 'text-[var(--text-1)]'}`}>
            {block.label}
          </span>
        </div>
        <div className="text-[12.5px] text-[var(--text-3)] tabular-nums truncate ml-3.5">
          {fmtRange(block.time)}{block.note && <span> · {block.note}</span>}
        </div>
      </div>
      <IconChevronR size={14} className="text-[var(--text-3)]/50 mt-1 shrink-0"/>
    </button>
  );
}

// ── Mobile Phase Section ─────────────────────────────
function MobilePhaseList({ schedule, dayKey, onToggle, onSelect }) {
  const blocks = schedule[dayKey].blocks;
  const phases = [
    { key:'morning',   label:'Matin',       range:[0, 12*60] },
    { key:'afternoon', label:'Après-midi',  range:[12*60, 18*60] },
    { key:'evening',   label:'Soir',        range:[18*60, 30*60] },
  ];
  return (
    <div className="space-y-6 pb-32">
      {phases.map(p => {
        const items = blocks.filter(b => {
          const { start } = parseTime(b.time);
          return start >= p.range[0] && start < p.range[1];
        });
        if (items.length === 0) return null;
        return (
          <section key={p.key}>
            <div className="flex items-baseline justify-between px-4 mb-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-3)]">{p.label}</h3>
              <span className="text-[11px] tabular-nums text-[var(--text-3)]">{items.filter(b=>b.done).length}/{items.length}</span>
            </div>
            <div className="bg-[var(--surface-0)] mx-3 rounded-[14px] border border-[var(--line)] overflow-hidden divide-y divide-[var(--line)]">
              {items.map(b => <MobileBlock key={b.id} block={b} onToggle={onToggle} onSelect={onSelect}/>)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ── Mobile Block Detail (full sheet) ─────────────────
function MobileBlockDetail({ block, onClose, onToggle, onUpdate }) {
  const [note, setNote] = useStateM(block?.note || '');
  useEffectM(() => { setNote(block?.note || ''); }, [block]);
  if (!block) return null;
  const cat = window.CATEGORIES[block.category];
  return (
    <>
      <div className="absolute inset-0 bg-black/30 z-40 animate-[fadeIn_.18s_ease]" onClick={onClose}></div>
      <div className="absolute inset-x-0 bottom-0 top-12 bg-[var(--bg)] z-50 rounded-t-[20px] flex flex-col overflow-hidden animate-[slideUp_.28s_cubic-bezier(.2,.8,.2,1)]">
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-9 rounded-full bg-[var(--line-strong)]/60"></div>
        </div>
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-[var(--line)]">
          <button onClick={onClose} className="text-[15px] text-[var(--text-2)] font-medium">Fermer</button>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-3)]">
            <span className="h-1.5 w-1.5 rounded-full" style={{background: cat.dot}}></span>
            <span className="uppercase tracking-[0.1em] font-semibold">{cat.label}</span>
          </div>
          <button className="text-[15px] text-[var(--accent)] font-semibold">OK</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="flex items-start gap-3 mb-6">
            <button onClick={() => onToggle(block.id)}
              className={`mt-1 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all active:scale-90
                ${block.done ? 'bg-[var(--ink)] border-[var(--ink)] text-[var(--bg)]' : 'border-[var(--line-strong)]'}`}>
              {block.done && <IconCheck size={15} stroke={2.5}/>}
            </button>
            <h2 className={`text-[26px] font-semibold tracking-[-0.02em] leading-[1.15] flex-1
              ${block.done ? 'line-through text-[var(--text-2)]' : 'text-[var(--text-1)]'}`}>
              {block.label}
            </h2>
          </div>

          <div className="bg-[var(--surface-0)] rounded-[14px] border border-[var(--line)] divide-y divide-[var(--line)] mb-6">
            {[
              { icon: IconClock, label:'Horaire', value: fmtRange(block.time) },
              { icon: IconRepeat, label:'Récurrence', value:'Hebdomadaire' },
              { icon: IconTarget, label:'Statut', value: block.done ? 'Terminé' : 'En cours' },
            ].map((r, i) => {
              const Ico = r.icon;
              return (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 text-[14px] text-[var(--text-2)]">
                    <Ico size={15} className="text-[var(--text-3)]"/>
                    <span>{r.label}</span>
                  </div>
                  <span className="text-[14px] text-[var(--text-1)] tabular-nums">{r.value}</span>
                </div>
              );
            })}
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-3)] mb-2 px-1">
              <IconNote size={12}/> Notes
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)} onBlur={() => onUpdate(block.id, { note })}
              placeholder="Ajouter une note…"
              className="w-full bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px] px-4 py-3 outline-none resize-none text-[15px] text-[var(--text-1)] placeholder:text-[var(--text-3)] leading-[1.5] min-h-[120px]" />
          </div>

          <div className="space-y-2">
            <button className="w-full bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px] px-4 py-3.5 flex items-center justify-between active:bg-[var(--surface-1)]">
              <span className="text-[15px] text-[var(--text-1)]">Dupliquer</span>
              <IconChevronR size={15} className="text-[var(--text-3)]"/>
            </button>
            <button className="w-full bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px] px-4 py-3.5 flex items-center justify-between active:bg-[var(--surface-1)] text-[var(--accent)]">
              <span className="text-[15px] font-medium">Supprimer</span>
              <IconChevronR size={15} className="opacity-60"/>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Mobile AI sheet ─────────────────────────
function MobileAIChat({ open, onClose }) {
  const [messages, setMessages] = useStateM([
    { role:'ai', text:"Que veux-tu ajuster ?", suggestions:['Reprogrammer le sport','Ajouter de la lecture','Décaler le client'] },
  ]);
  const [val, setVal] = useStateM('');
  const send = () => {
    if (!val.trim()) return;
    setMessages(m => [...m, { role:'user', text: val }, { role:'ai', text:'Compris. Voici ma proposition :', diff:[{ kind:'add', text:'Lecture 30 min', time:'21h00 · Lundi' }] }]);
    setVal('');
  };
  if (!open) return null;
  return (
    <>
      <div className="absolute inset-0 bg-black/30 z-40 animate-[fadeIn_.18s]" onClick={onClose}></div>
      <div className="absolute inset-x-0 bottom-0 top-20 bg-[var(--bg)] z-50 rounded-t-[20px] flex flex-col overflow-hidden animate-[slideUp_.28s_cubic-bezier(.2,.8,.2,1)]">
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-9 rounded-full bg-[var(--line-strong)]/60"></div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--line)]">
          <div className="w-12"></div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-[8px] bg-[var(--ink)] text-[var(--bg)] grid place-items-center"><IconSparkle size={13} stroke={2}/></div>
            <div>
              <div className="text-[14px] font-semibold tracking-[-0.01em]">Tempo</div>
              <div className="text-[10px] text-[var(--text-3)]">Coach IA</div>
            </div>
          </div>
          <button onClick={onClose} className="text-[15px] text-[var(--accent)] font-semibold">Fermer</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {messages.map((m, i) => m.role === 'ai' ? (
            <div key={i} className="flex gap-2">
              <div className="h-7 w-7 shrink-0 rounded-[8px] bg-[var(--surface-2)] grid place-items-center text-[var(--text-2)]"><IconSparkle size={12} stroke={2}/></div>
              <div className="flex-1 min-w-0">
                <div className="bg-[var(--surface-1)] rounded-[16px] rounded-tl-[4px] px-3.5 py-2.5 text-[14.5px] text-[var(--text-1)] leading-[1.4]">{m.text}</div>
                {m.suggestions && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.suggestions.map((s, k) => (
                      <button key={k} onClick={() => { setVal(s); }}
                        className="px-3 py-1.5 rounded-full text-[12.5px] bg-[var(--surface-0)] border border-[var(--line)] text-[var(--text-2)] active:bg-[var(--surface-1)]">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                {m.diff && (
                  <div className="mt-2 rounded-[14px] border border-[var(--line)] bg-[var(--surface-0)] overflow-hidden">
                    {m.diff.map((d, k) => (
                      <div key={k} className="px-4 py-3 flex items-center gap-2 text-[13px]">
                        <span className="text-[var(--text-3)] tabular-nums">+</span>
                        <span className="text-[var(--text-1)] flex-1">{d.text}</span>
                        <span className="text-[11px] text-[var(--text-3)] tabular-nums">{d.time}</span>
                      </div>
                    ))}
                    <div className="border-t border-[var(--line)] flex">
                      <button className="flex-1 px-3 py-3 text-[13.5px] font-semibold text-[var(--text-1)] active:bg-[var(--surface-1)]">Appliquer</button>
                      <div className="w-px bg-[var(--line)]"></div>
                      <button className="flex-1 px-3 py-3 text-[13.5px] text-[var(--text-3)] active:bg-[var(--surface-1)]">Ignorer</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-end">
              <div className="max-w-[80%] px-3.5 py-2.5 rounded-[16px] rounded-br-[4px] bg-[var(--ink)] text-[var(--bg)] text-[14.5px] leading-[1.4]">{m.text}</div>
            </div>
          ))}
        </div>

        <div className="px-3 pb-4 pt-2 border-t border-[var(--line)]">
          <div className="flex items-end gap-2 bg-[var(--surface-1)] border border-[var(--line)] rounded-[18px] px-3.5 py-2 focus-within:border-[var(--line-strong)]">
            <textarea value={val} onChange={e => setVal(e.target.value)} placeholder="Demande à Tempo…" rows={1}
              className="flex-1 bg-transparent border-0 outline-none resize-none text-[14.5px] text-[var(--text-1)] placeholder:text-[var(--text-3)] max-h-32 py-1.5" />
            <button onClick={send} className={`h-8 w-8 rounded-full grid place-items-center transition-all ${val.trim() ? 'bg-[var(--ink)] text-[var(--bg)] scale-100' : 'bg-[var(--surface-2)] text-[var(--text-3)] scale-90'}`}>
              <IconArrowR size={14} stroke={2}/>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { MobileTabBar, MobileDayStrip, MobilePhaseList, MobileBlockDetail, MobileAIChat });
