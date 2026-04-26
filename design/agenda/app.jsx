// === App.jsx — Main orchestrator ===
const { useState, useEffect, useMemo } = React;

const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "viewMode": "list",
  "accent": "amber",
  "density": "comfortable",
  "showRightPanel": true
}/*EDITMODE-END*/;

const ACCENTS = {
  amber:   { color: '#B45309', label: 'Ambre' },
  blue:    { color: '#1D4ED8', label: 'Bleu' },
  green:   { color: '#15803D', label: 'Vert' },
  graphite:{ color: '#0A0A0A', label: 'Graphite' },
};

function App() {
  const [tweaks, setTweak] = (window.useTweaks ? window.useTweaks(TWEAKS_DEFAULTS) : [TWEAKS_DEFAULTS, ()=>{}]);
  const [schedule, setSchedule] = useState(() => JSON.parse(JSON.stringify(window.SCHEDULE)));
  const [activeView, setActiveView] = useState('today');
  const [currentDayKey, setCurrentDayKey] = useState(window.DAYS_ORDER[window.TODAY_INDEX]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [viewMode, setViewMode] = useState(tweaks.viewMode || 'list');

  useEffect(() => { setViewMode(tweaks.viewMode || 'list'); }, [tweaks.viewMode]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  useEffect(() => {
    const accent = ACCENTS[tweaks.accent || 'amber'].color;
    document.documentElement.style.setProperty('--accent', accent);
  }, [tweaks.accent]);

  const toggleBlock = (blockId) => {
    setSchedule(s => {
      const next = JSON.parse(JSON.stringify(s));
      for (const dk of window.DAYS_ORDER) {
        const b = next[dk].blocks.find(b => b.id === blockId);
        if (b) { b.done = !b.done; break; }
      }
      return next;
    });
    setSelectedBlock(prev => prev && prev.id === blockId ? { ...prev, done: !prev.done } : prev);
  };

  const updateBlock = (blockId, updates) => {
    setSchedule(s => {
      const next = JSON.parse(JSON.stringify(s));
      for (const dk of window.DAYS_ORDER) {
        const b = next[dk].blocks.find(b => b.id === blockId);
        if (b) { Object.assign(b, updates); break; }
      }
      return next;
    });
  };

  const dayIdx = window.DAYS_ORDER.indexOf(currentDayKey);
  const goPrev = () => setCurrentDayKey(window.DAYS_ORDER[Math.max(0, dayIdx-1)]);
  const goNext = () => setCurrentDayKey(window.DAYS_ORDER[Math.min(6, dayIdx+1)]);

  const todayBlocks = schedule[currentDayKey].blocks;
  const todayDone = todayBlocks.filter(b=>b.done).length;
  const todayPct = todayBlocks.length ? Math.round((todayDone/todayBlocks.length)*100) : 0;

  const monthLabels = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
  const monthName = 'Avril';

  return (
    <div className="h-[100dvh] flex bg-[var(--bg)] text-[var(--text-1)] overflow-hidden">
      <Sidebar activeView={activeView} onChange={setActiveView} schedule={schedule}
        onAdd={() => {}} dark={dark} onToggleDark={() => setDark(d => !d)} />

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="shrink-0 h-[52px] border-b border-[var(--line)] flex items-center justify-between px-7">
          <div className="flex items-center gap-3 text-[12.5px]">
            <span className="text-[var(--text-3)]">Mon Agenda</span>
            <span className="text-[var(--text-3)] opacity-50">/</span>
            <span className="text-[var(--text-1)] font-medium">
              {activeView === 'today' && schedule[currentDayKey].label}
              {activeView === 'week' && `Semaine du 28 ${monthName}`}
              {activeView === 'goals' && 'Objectifs'}
              {activeView === 'review' && 'Bilan hebdomadaire'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {activeView === 'today' && (
              <div className="flex items-center bg-[var(--surface-1)] rounded-[7px] p-0.5 mr-2">
                {[
                  { id:'list',     label:'Liste' },
                  { id:'timeline', label:'Timeline' },
                ].map(v => (
                  <button key={v.id} onClick={() => setViewMode(v.id)}
                    className={`px-2.5 py-1 text-[11.5px] rounded-[5px] transition-all
                      ${viewMode === v.id ? 'bg-[var(--bg)] text-[var(--text-1)] shadow-sm' : 'text-[var(--text-3)] hover:text-[var(--text-1)]'}`}>
                    {v.label}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setAiOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[7px] hover:bg-[var(--surface-1)] text-[12px] text-[var(--text-2)] transition-colors">
              <IconSparkle size={13} stroke={1.8}/> <span>Demander à Tempo</span>
            </button>
            <button className="p-1.5 rounded-[7px] hover:bg-[var(--surface-1)] text-[var(--text-3)]"><IconDots size={14}/></button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[820px] mx-auto px-10 py-10">
            {activeView === 'today' && (
              <>
                {/* Page title */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <button onClick={goPrev} disabled={dayIdx === 0} className="p-1 rounded-[6px] hover:bg-[var(--surface-1)] text-[var(--text-3)] disabled:opacity-30">
                      <IconChevronL size={16}/>
                    </button>
                    <span className="text-[10.5px] uppercase tracking-[0.14em] font-medium text-[var(--text-3)] tabular-nums">
                      {window.WEEK_DATES[dayIdx]} {monthName} 2026 · {schedule[currentDayKey].type}
                    </span>
                    <button onClick={goNext} disabled={dayIdx === 6} className="p-1 rounded-[6px] hover:bg-[var(--surface-1)] text-[var(--text-3)] disabled:opacity-30">
                      <IconChevronR size={16}/>
                    </button>
                    {dayIdx !== window.TODAY_INDEX && (
                      <button onClick={() => setCurrentDayKey(window.DAYS_ORDER[window.TODAY_INDEX])}
                        className="ml-1 px-2 py-0.5 rounded-full text-[10.5px] uppercase tracking-wider font-medium text-[var(--accent)] hover:bg-[var(--surface-1)]">
                        Aujourd'hui
                      </button>
                    )}
                  </div>
                  <h1 className="text-[40px] font-medium tracking-[-0.025em] leading-[1.1] text-[var(--text-1)]">
                    {schedule[currentDayKey].label}.
                    <span className="text-[var(--text-3)]"> {todayPct}% accompli.</span>
                  </h1>
                  <p className="mt-2 text-[14px] text-[var(--text-2)] leading-[1.55]">
                    {todayDone} blocs terminés sur {todayBlocks.length}. Concentre-toi sur ce qui compte aujourd'hui.
                  </p>
                </div>

                {/* Day picker — minimaliste */}
                <div className="grid grid-cols-7 gap-1 mb-9">
                  {window.DAYS_ORDER.map((dk, i) => {
                    const isActive = currentDayKey === dk;
                    const isToday = i === window.TODAY_INDEX;
                    const blocks = schedule[dk].blocks;
                    const done = blocks.filter(b=>b.done).length;
                    const pct = blocks.length ? done/blocks.length : 0;
                    return (
                      <button key={dk} onClick={() => setCurrentDayKey(dk)}
                        className={`group relative px-2 py-2.5 rounded-[8px] text-left transition-all
                          ${isActive ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-1)]'}`}>
                        <div className={`text-[10px] font-medium uppercase tracking-[0.1em] mb-1
                          ${isActive ? 'text-[var(--text-1)]' : isToday ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'}`}>
                          {schedule[dk].label.slice(0,3)}
                        </div>
                        <div className={`text-[18px] font-medium tabular-nums tracking-[-0.01em]
                          ${isActive ? 'text-[var(--text-1)]' : 'text-[var(--text-2)]'}`}>
                          {window.WEEK_DATES[i]}
                        </div>
                        <div className="mt-1.5 h-[2px] rounded-full bg-[var(--line)] overflow-hidden">
                          <div className="h-full transition-all duration-500" style={{ width: `${pct*100}%`, background: isActive ? 'var(--ink)' : 'var(--text-3)' }}></div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <DayView schedule={schedule} dayKey={currentDayKey} viewMode={viewMode}
                  onToggle={toggleBlock} onSelect={setSelectedBlock} onAddClick={() => {}} />
              </>
            )}

            {activeView === 'week' && (
              <>
                <div className="mb-8">
                  <div className="text-[10.5px] uppercase tracking-[0.14em] font-medium text-[var(--text-3)] mb-3">
                    28 Avril – 4 Mai 2026
                  </div>
                  <h1 className="text-[40px] font-medium tracking-[-0.025em] leading-[1.1] text-[var(--text-1)]">
                    Vue semaine.
                  </h1>
                </div>
                <WeekView schedule={schedule} onToggle={toggleBlock} onSelect={setSelectedBlock}
                  currentDayKey={currentDayKey} onSelectDay={(dk) => { setCurrentDayKey(dk); setActiveView('today'); }} />
              </>
            )}

            {activeView === 'goals' && (
              <div>
                <h1 className="text-[40px] font-medium tracking-[-0.025em] leading-[1.1] text-[var(--text-1)] mb-8">Objectifs.</h1>
                <div className="space-y-3">
                  {[
                    { name:'5 sessions sport', cur:3, tot:5 },
                    { name:'21 prières Fajr', cur:18, tot:21 },
                    { name:'10h apprentissage', cur:7.5, tot:10 },
                    { name:'3 livraisons clients', cur:2, tot:3 },
                  ].map((g,i) => (
                    <div key={i} className="border border-[var(--line)] rounded-[10px] px-5 py-4 hover:border-[var(--line-strong)] transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[14px] font-medium text-[var(--text-1)] tracking-[-0.005em]">{g.name}</div>
                        <div className="text-[12px] tabular-nums text-[var(--text-3)]">{g.cur} / {g.tot}</div>
                      </div>
                      <div className="h-[3px] rounded-full bg-[var(--surface-2)] overflow-hidden">
                        <div className="h-full bg-[var(--ink)]" style={{ width: `${(g.cur/g.tot)*100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeView === 'review' && (
              <div>
                <h1 className="text-[40px] font-medium tracking-[-0.025em] leading-[1.1] text-[var(--text-1)] mb-8">Bilan.</h1>
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[
                    { label:'Complétion', val:'68%', delta:'+12%' },
                    { label:'Série', val:'12 jours', delta:'record' },
                    { label:'Heures focus', val:'24h', delta:'+3h' },
                  ].map((s,i) => (
                    <div key={i} className="border border-[var(--line)] rounded-[10px] p-5">
                      <div className="text-[10.5px] uppercase tracking-[0.12em] text-[var(--text-3)] font-medium mb-2">{s.label}</div>
                      <div className="text-[28px] font-medium tabular-nums tracking-[-0.02em] text-[var(--text-1)] mb-1">{s.val}</div>
                      <div className="text-[11.5px] text-[var(--accent)]">{s.delta} vs sem. dernière</div>
                    </div>
                  ))}
                </div>
                <div className="border border-[var(--line)] rounded-[10px] p-6">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-3)] font-medium mb-4">Activité par jour</div>
                  <div className="flex items-end gap-2 h-[140px]">
                    {window.DAYS_ORDER.map((dk, i) => {
                      const b = schedule[dk].blocks;
                      const pct = b.length ? b.filter(x=>x.done).length / b.length : 0;
                      return (
                        <div key={dk} className="flex-1 flex flex-col items-center gap-2">
                          <div className="flex-1 w-full flex items-end">
                            <div className="w-full rounded-t-[3px] transition-all" style={{ height: `${Math.max(pct*100, 4)}%`, background: i === window.TODAY_INDEX ? 'var(--accent)' : 'var(--ink)', opacity: i === window.TODAY_INDEX ? 1 : 0.85 }}></div>
                          </div>
                          <div className="text-[10px] text-[var(--text-3)] uppercase tracking-wider">{schedule[dk].label.slice(0,3)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {tweaks.showRightPanel !== false && <RightPanel schedule={schedule} currentDayKey={currentDayKey} />}

      <BlockDetail block={selectedBlock} onClose={() => setSelectedBlock(null)} onToggle={toggleBlock} onUpdate={updateBlock} />
      <AIChat open={aiOpen} onClose={() => setAiOpen(false)} />

      {/* FAB AI */}
      {!aiOpen && (
        <button onClick={() => setAiOpen(true)}
          className="fixed bottom-6 right-6 xl:right-[324px] h-12 w-12 rounded-full bg-[var(--ink)] text-[var(--bg)] shadow-[0_8px_24px_-6px_rgba(0,0,0,0.25)] hover:scale-105 active:scale-95 transition-transform grid place-items-center z-30">
          <IconSparkle size={18} stroke={1.8}/>
        </button>
      )}

      {/* Tweaks Panel */}
      {window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks">
          <window.TweakSection title="Apparence">
            <window.TweakRadio label="Vue jour" value={tweaks.viewMode} onChange={(v) => setTweak('viewMode', v)}
              options={[{value:'list', label:'Liste'},{value:'timeline', label:'Timeline'}]} />
            <window.TweakSelect label="Accent" value={tweaks.accent} onChange={(v) => setTweak('accent', v)}
              options={Object.entries(ACCENTS).map(([k,v]) => ({value:k, label:v.label}))} />
            <window.TweakToggle label="Panneau latéral" value={tweaks.showRightPanel} onChange={(v) => setTweak('showRightPanel', v)} />
          </window.TweakSection>
        </window.TweaksPanel>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
