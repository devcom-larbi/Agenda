// === Sidebar (Notion-like) + Right panel + AI chat + Block detail ===

function Sidebar({ activeView, onChange, schedule, onAdd, dark, onToggleDark }) {
  const total = window.DAYS_ORDER.reduce((acc, d) => acc + schedule[d].blocks.length, 0);
  const done = window.DAYS_ORDER.reduce((acc, d) => acc + schedule[d].blocks.filter(b=>b.done).length, 0);
  const items = [
    { id: 'today',    label: "Aujourd'hui", icon: IconCalendar },
    { id: 'week',     label: 'Semaine',     icon: IconList },
    { id: 'goals',    label: 'Objectifs',   icon: IconTarget },
    { id: 'review',   label: 'Bilan',       icon: IconChart },
  ];
  return (
    <aside className="w-[244px] shrink-0 h-full flex flex-col border-r border-[var(--line)] bg-[var(--surface-1)]">
      {/* Logo + workspace */}
      <div className="px-3 pt-4 pb-3">
        <button className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[8px] hover:bg-[var(--surface-2)] transition-colors group">
          <IconLogo size={20} />
          <div className="flex-1 text-left">
            <div className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--text-1)]">Mon Agenda</div>
            <div className="text-[10.5px] text-[var(--text-3)]">Espace personnel</div>
          </div>
          <IconChevronD size={13} className="text-[var(--text-3)] opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[7px] bg-transparent hover:bg-[var(--surface-2)] text-[12.5px] text-[var(--text-3)] transition-colors">
          <IconSearch size={14} />
          <span className="flex-1 text-left">Rechercher</span>
          <span className="text-[10.5px] tabular-nums tracking-tight px-1.5 py-0.5 rounded border border-[var(--line)] bg-[var(--bg)]">⌘K</span>
        </button>
      </div>

      {/* Nav */}
      <nav className="px-2 pb-3">
        {items.map(it => {
          const Ico = it.icon;
          const active = activeView === it.id;
          return (
            <button key={it.id} onClick={() => onChange(it.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[7px] text-[13px] transition-all duration-150 mb-0.5
                ${active ? 'bg-[var(--surface-2)] text-[var(--text-1)] font-medium' : 'text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]'}`}>
              <Ico size={15} stroke={1.6} />
              <span className="flex-1 text-left tracking-[-0.005em]">{it.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Section pages */}
      <div className="px-3 pt-3 pb-2 mt-1 border-t border-[var(--line)]">
        <div className="flex items-center justify-between px-1 mb-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text-3)]">Mes vues</span>
          <button onClick={onAdd} className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5 rounded hover:bg-[var(--surface-2)]"><IconPlus size={13} /></button>
        </div>
        <div className="space-y-0.5">
          {[
            'Routines matinales',
            'Sport · Push/Pull/Legs',
            'Sessions client',
            'Apprentissage',
          ].map((p, i) => (
            <button key={i} className="w-full flex items-center gap-2 px-2 py-1 rounded-[6px] text-[12.5px] text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] transition-colors group">
              <span className="text-[var(--text-3)] text-[11px]">▸</span>
              <span className="truncate text-left flex-1">{p}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer — progress + dark toggle */}
      <div className="mt-auto p-3 border-t border-[var(--line)]">
        <div className="px-2 py-2 mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[var(--text-2)] font-medium">Cette semaine</span>
            <span className="text-[11px] tabular-nums text-[var(--text-3)]">{done}/{total}</span>
          </div>
          <div className="h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div className="h-full bg-[var(--ink)] transition-all duration-500" style={{ width: `${total ? (done/total)*100 : 0}%` }}></div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-2 px-2 py-1 rounded-[6px] hover:bg-[var(--surface-2)] transition-colors group">
            <div className="h-6 w-6 rounded-full bg-[var(--ink)] text-[var(--bg)] grid place-items-center text-[10px] font-semibold">YL</div>
            <span className="text-[12px] text-[var(--text-2)] group-hover:text-[var(--text-1)]">Younes</span>
          </button>
          <div className="flex items-center gap-0.5">
            <button onClick={onToggleDark} className="p-1.5 rounded-[6px] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)]" aria-label="Thème">
              {dark ? <IconSun size={14}/> : <IconMoon size={14}/>}
            </button>
            <button className="p-1.5 rounded-[6px] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)]" aria-label="Réglages">
              <IconSettings size={14}/>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function RightPanel({ schedule, currentDayKey }) {
  const day = schedule[currentDayKey];
  const blocks = day.blocks;
  const done = blocks.filter(b=>b.done).length;
  const total = blocks.length;
  const pct = total ? Math.round((done/total)*100) : 0;

  // breakdown by category
  const byCat = {};
  window.DAYS_ORDER.forEach(d => {
    schedule[d].blocks.forEach(b => {
      if (!byCat[b.category]) byCat[b.category] = { total: 0, done: 0 };
      byCat[b.category].total++;
      if (b.done) byCat[b.category].done++;
    });
  });
  const cats = Object.entries(byCat)
    .sort((a,b) => b[1].total - a[1].total)
    .slice(0, 5);

  return (
    <aside className="w-[300px] shrink-0 hidden xl:flex flex-col border-l border-[var(--line)] bg-[var(--bg)]">
      {/* Today summary */}
      <div className="p-6 border-b border-[var(--line)]">
        <div className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--text-3)] mb-3">Aujourd'hui</div>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-[40px] font-medium tabular-nums tracking-[-0.04em] text-[var(--text-1)] leading-none">{pct}<span className="text-[20px] text-[var(--text-3)]">%</span></span>
        </div>
        <div className="h-[3px] rounded-full bg-[var(--surface-2)] overflow-hidden mb-2">
          <div className="h-full bg-[var(--ink)] transition-all duration-700" style={{width: `${pct}%`}}></div>
        </div>
        <div className="text-[11.5px] text-[var(--text-3)] tabular-nums">{done} sur {total} blocs · {day.type}</div>
      </div>

      {/* Streak */}
      <div className="p-6 border-b border-[var(--line)]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--text-3)]">Série</span>
          <IconFlame size={14} className="text-[var(--accent)]" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[28px] font-medium tabular-nums tracking-[-0.03em] text-[var(--text-1)]">12</span>
          <span className="text-[12px] text-[var(--text-3)]">jours consécutifs</span>
        </div>
        <div className="flex gap-1 mt-3">
          {[1,1,1,1,1,1,1,1,1,1,1,1,0.4].map((v, i) => (
            <div key={i} className="flex-1 h-6 rounded-[3px]" style={{
              background: v === 1 ? 'var(--ink)' : 'var(--surface-2)',
              opacity: v === 0.4 ? 0.6 : 1
            }}></div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--text-3)] mb-4">Répartition</div>
        <div className="space-y-3.5">
          {cats.map(([key, v]) => {
            const cat = window.CATEGORIES[key];
            const pc = v.total ? Math.round((v.done/v.total)*100) : 0;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{background: cat.dot}}></span>
                    <span className="text-[12.5px] text-[var(--text-2)] truncate">{cat.label}</span>
                  </div>
                  <span className="text-[11px] tabular-nums text-[var(--text-3)]">{v.done}/{v.total}</span>
                </div>
                <div className="h-[2px] rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className="h-full transition-all duration-700" style={{width: `${pc}%`, background: cat.dot}}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function BlockDetail({ block, onClose, onToggle, onUpdate }) {
  const [note, setNote] = React.useState(block?.note || '');
  React.useEffect(() => { setNote(block?.note || ''); }, [block]);
  if (!block) return null;
  const cat = window.CATEGORIES[block.category];
  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-[fadeIn_.15s_ease]" onClick={onClose}></div>
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] bg-[var(--bg)] z-50 border-l border-[var(--line)] shadow-2xl flex flex-col animate-[slideInR_.25s_cubic-bezier(.2,.8,.2,1)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-2 text-[11.5px] text-[var(--text-3)]">
            <span className="h-1.5 w-1.5 rounded-full" style={{background: cat.dot}}></span>
            <span className="uppercase tracking-[0.1em] font-medium">{cat.label}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-[6px] hover:bg-[var(--surface-1)] text-[var(--text-2)]">
            <IconClose size={16}/>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-7">
          <div className="flex items-start gap-3 mb-5">
            <button onClick={() => onToggle(block.id)}
              className={`mt-1 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-all
                ${block.done ? 'bg-[var(--ink)] border-[var(--ink)] text-[var(--bg)]' : 'border-[var(--line-strong)] hover:border-[var(--ink)]'}`}>
              {block.done && <IconCheck size={13} stroke={2.5}/>}
            </button>
            <h2 className={`text-[26px] font-medium tracking-[-0.02em] leading-[1.15] flex-1 ${block.done ? 'line-through text-[var(--text-2)]' : 'text-[var(--text-1)]'}`}>
              {block.label}
            </h2>
          </div>

          <div className="grid grid-cols-[100px_1fr] gap-y-3 gap-x-3 mb-7 text-[13px]">
            <div className="text-[var(--text-3)] flex items-center gap-1.5"><IconClock size={13}/> Horaire</div>
            <div className="text-[var(--text-1)] tabular-nums">{fmtRange(block.time)}</div>
            <div className="text-[var(--text-3)] flex items-center gap-1.5"><IconRepeat size={13}/> Récurrence</div>
            <div className="text-[var(--text-1)]">Hebdomadaire</div>
            <div className="text-[var(--text-3)] flex items-center gap-1.5"><IconTarget size={13}/> Statut</div>
            <div className="text-[var(--text-1)]">{block.done ? 'Terminé' : 'En cours'}</div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-3)] mb-2">
              <IconNote size={12}/> Notes
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)} onBlur={() => onUpdate(block.id, { note })}
              placeholder="Ajouter une note…"
              className="w-full bg-transparent border-0 outline-none resize-none text-[13.5px] text-[var(--text-1)] placeholder:text-[var(--text-3)] leading-[1.6] min-h-[120px]" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--line)] flex items-center gap-2">
          <button className="flex-1 px-3 py-2 rounded-[8px] bg-[var(--ink)] text-[var(--bg)] text-[12.5px] font-medium hover:opacity-90">Enregistrer</button>
          <button className="px-3 py-2 rounded-[8px] hover:bg-[var(--surface-1)] text-[12.5px] text-[var(--text-2)]">Dupliquer</button>
          <button className="px-3 py-2 rounded-[8px] hover:bg-[var(--surface-1)] text-[12.5px] text-[var(--accent)]">Supprimer</button>
        </div>
      </div>
    </>
  );
}

function AIChat({ open, onClose, onSchedule }) {
  const [messages, setMessages] = React.useState([
    { role:'ai', text:"Que veux-tu ajuster sur ta semaine ?", suggestions:['Reprogrammer le sport mardi soir','Ajouter 30 min de lecture','Décaler la session client'] },
  ]);
  const [val, setVal] = React.useState('');
  const send = () => {
    if (!val.trim()) return;
    const userMsg = { role:'user', text: val };
    setMessages(m => [...m, userMsg, { role:'ai', text:'Compris. Je propose le changement suivant…', diff:[
      { kind:'add', text:'Lecture 30 min', time:'21:00 – 21:30 · Lundi' }
    ]}]);
    setVal('');
  };
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/15 z-40 animate-[fadeIn_.15s]" onClick={onClose}></div>
      <div className="fixed bottom-5 right-5 w-[400px] max-w-[92vw] h-[560px] max-h-[80vh] bg-[var(--bg)] z-50 border border-[var(--line)] rounded-[14px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden animate-[slideUp_.22s_cubic-bezier(.2,.8,.2,1)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-[6px] bg-[var(--ink)] text-[var(--bg)] grid place-items-center"><IconSparkle size={12} stroke={2}/></div>
            <div>
              <div className="text-[13px] font-semibold tracking-[-0.01em]">Tempo</div>
              <div className="text-[10.5px] text-[var(--text-3)]">Coach IA · en ligne</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-[6px] hover:bg-[var(--surface-1)] text-[var(--text-2)]"><IconClose size={15}/></button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((m, i) => m.role === 'ai' ? (
            <div key={i} className="flex gap-2.5">
              <div className="h-6 w-6 shrink-0 rounded-[6px] bg-[var(--surface-2)] grid place-items-center text-[var(--text-2)]"><IconSparkle size={11} stroke={2}/></div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-[var(--text-1)] leading-[1.5]">{m.text}</div>
                {m.suggestions && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {m.suggestions.map((s, k) => (
                      <button key={k} onClick={() => { setVal(s); setTimeout(send, 50); }}
                        className="px-2.5 py-1 rounded-full text-[11.5px] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-2)] border border-[var(--line)] transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                {m.diff && (
                  <div className="mt-2.5 rounded-[10px] border border-[var(--line)] overflow-hidden">
                    {m.diff.map((d, k) => (
                      <div key={k} className="px-3 py-2 flex items-center gap-2 text-[12px]">
                        <span className="text-[var(--text-3)] tabular-nums">+</span>
                        <span className="text-[var(--text-1)] flex-1">{d.text}</span>
                        <span className="text-[10.5px] text-[var(--text-3)] tabular-nums">{d.time}</span>
                      </div>
                    ))}
                    <div className="border-t border-[var(--line)] flex">
                      <button className="flex-1 px-3 py-2 text-[12px] font-medium text-[var(--text-1)] hover:bg-[var(--surface-1)]">Appliquer</button>
                      <div className="w-px bg-[var(--line)]"></div>
                      <button className="flex-1 px-3 py-2 text-[12px] text-[var(--text-3)] hover:bg-[var(--surface-1)]">Ignorer</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-end">
              <div className="max-w-[80%] px-3 py-2 rounded-[14px] rounded-br-[4px] bg-[var(--ink)] text-[var(--bg)] text-[13px] leading-[1.4]">{m.text}</div>
            </div>
          ))}
        </div>

        <div className="px-3 pb-3 pt-2 border-t border-[var(--line)]">
          <div className="flex items-end gap-2 bg-[var(--surface-1)] border border-[var(--line)] rounded-[10px] px-3 py-2 focus-within:border-[var(--line-strong)] transition-colors">
            <textarea value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey){e.preventDefault(); send();}}}
              placeholder="Demande à Tempo…" rows={1}
              className="flex-1 bg-transparent border-0 outline-none resize-none text-[13px] text-[var(--text-1)] placeholder:text-[var(--text-3)] max-h-32" />
            <button onClick={send} className={`p-1.5 rounded-[6px] ${val.trim() ? 'bg-[var(--ink)] text-[var(--bg)]' : 'text-[var(--text-3)]'}`}>
              <IconArrowR size={14}/>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { Sidebar, RightPanel, BlockDetail, AIChat });
