// === Mobile App ===
const { useState: useStateApp, useEffect: useEffectApp } = React;

const MOBILE_TWEAKS = /*EDITMODE-BEGIN*/{
  "showFrame": true,
  "dark": false,
  "accent": "amber",
  "defaultView": "list"
}/*EDITMODE-END*/;

const MOBILE_ACCENTS = {
  amber:    '#B45309',
  blue:     '#1D4ED8',
  green:    '#15803D',
  graphite: '#0A0A0A',
};

function MobileScreenContent({ settings, onSettings, onSettingsChange }) {
  const [schedule, setSchedule] = useStateApp(() => JSON.parse(JSON.stringify(window.SCHEDULE)));
  const [activeTab, setActiveTab] = useStateApp('today');
  const [currentDayKey, setCurrentDayKey] = useStateApp(window.DAYS_ORDER[window.TODAY_INDEX]);
  const [selectedBlock, setSelectedBlock] = useStateApp(null);
  const [aiOpen, setAiOpen] = useStateApp(false);
  const [viewMode, setViewMode] = useStateApp(settings.defaultView || 'list');
  useEffectApp(() => { setViewMode(settings.defaultView || 'list'); }, [settings.defaultView]);

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
  const day = schedule[currentDayKey];
  const todayDone = day.blocks.filter(b=>b.done).length;
  const todayPct = day.blocks.length ? Math.round((todayDone/day.blocks.length)*100) : 0;
  const monthName = 'Avril';

  // Aggregate stats
  const totalAll = window.DAYS_ORDER.reduce((a,d)=>a+schedule[d].blocks.length,0);
  const doneAll = window.DAYS_ORDER.reduce((a,d)=>a+schedule[d].blocks.filter(b=>b.done).length,0);

  return (
    <div className="w-full h-full flex flex-col bg-[var(--bg)] overflow-hidden">
      {/* iOS-style nav row — left of dynamic island and right of it */}
      <header className="shrink-0 px-4 pt-3 pb-2 flex items-center justify-between">
        <button onClick={onSettings} className="flex items-center justify-center h-8 w-8 -ml-1 rounded-full active:bg-[var(--surface-1)] transition-colors text-[var(--text-2)]">
          <IconSettings size={18} stroke={1.7}/>
        </button>
        <button onClick={() => setAiOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-1)] border border-[var(--line)] active:scale-95 transition-transform">
          <IconSparkle size={13} stroke={2}/>
          <span className="text-[12.5px] font-medium">Tempo</span>
        </button>
      </header>

      {activeTab === 'today' && (
        <>
          <div className="px-4 pt-1 pb-1">
            <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-1 tabular-nums">
              {window.WEEK_DATES[dayIdx]} {monthName} · {day.type}
            </div>
            <div className="flex items-end justify-between gap-3">
              <h1 className="text-[32px] font-semibold tracking-[-0.025em] leading-[1.1] text-[var(--text-1)]">
                {day.label}
              </h1>
              {/* Segmented control Liste/Timeline */}
              <div className="flex bg-[var(--surface-2)] rounded-[10px] p-[3px] shrink-0">
                <button onClick={() => setViewMode('list')}
                  className={`px-2.5 py-1 rounded-[7px] text-[11.5px] font-medium tracking-tight transition-all flex items-center gap-1
                    ${viewMode === 'list' ? 'bg-[var(--surface-0)] text-[var(--text-1)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]' : 'text-[var(--text-3)]'}`}>
                  <IconList size={11} stroke={2}/> Liste
                </button>
                <button onClick={() => setViewMode('timeline')}
                  className={`px-2.5 py-1 rounded-[7px] text-[11.5px] font-medium tracking-tight transition-all flex items-center gap-1
                    ${viewMode === 'timeline' ? 'bg-[var(--surface-0)] text-[var(--text-1)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]' : 'text-[var(--text-3)]'}`}>
                  <IconClock size={11} stroke={2}/> Timeline
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-[3px] rounded-full bg-[var(--surface-2)] overflow-hidden">
                <div className="h-full bg-[var(--ink)] transition-all duration-500" style={{width:`${todayPct}%`}}></div>
              </div>
              <span className="text-[12px] tabular-nums text-[var(--text-3)] font-medium">{todayDone}/{day.blocks.length}</span>
            </div>
          </div>

          <MobileDayStrip schedule={schedule} currentDayKey={currentDayKey} onSelect={setCurrentDayKey}/>

          {viewMode === 'list' ? (
            <div className="flex-1 overflow-y-auto pt-1">
              <MobilePhaseList schedule={schedule} dayKey={currentDayKey} onToggle={toggleBlock} onSelect={setSelectedBlock}/>
            </div>
          ) : (
            <MobileTimeline schedule={schedule} dayKey={currentDayKey} onSelect={setSelectedBlock} onToggle={toggleBlock} isToday={dayIdx === window.TODAY_INDEX}/>
          )}
        </>
      )}

      {activeTab === 'week' && (
        <>
          <div className="px-4 pt-1 pb-3">
            <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-1 tabular-nums">
              28 Avr — 4 Mai 2026
            </div>
            <h1 className="text-[32px] font-semibold tracking-[-0.025em] leading-[1.1] text-[var(--text-1)]">Semaine</h1>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-32 space-y-2">
            {window.DAYS_ORDER.map((dk, i) => {
              const d = schedule[dk];
              const done = d.blocks.filter(b=>b.done).length;
              const pct = d.blocks.length ? done/d.blocks.length : 0;
              const isToday = i === window.TODAY_INDEX;
              return (
                <button key={dk} onClick={() => { setCurrentDayKey(dk); setActiveTab('today'); }}
                  className="w-full text-left bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px] p-4 active:bg-[var(--surface-1)] transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-[15.5px] font-semibold tracking-[-0.01em] ${isToday ? 'text-[var(--accent)]' : 'text-[var(--text-1)]'}`}>{d.label}</span>
                      <span className="text-[12px] tabular-nums text-[var(--text-3)]">{window.WEEK_DATES[i]} {monthName}</span>
                    </div>
                    <span className="text-[12px] tabular-nums text-[var(--text-3)]">{done}/{d.blocks.length}</span>
                  </div>
                  <div className="text-[12.5px] text-[var(--text-2)] mb-2.5">{d.type}</div>
                  <div className="flex items-center gap-1">
                    {d.blocks.slice(0,12).map(b => {
                      const cat = window.CATEGORIES[b.category];
                      return <span key={b.id} className="h-1.5 flex-1 rounded-full" style={{background: b.done ? cat.dot : 'var(--surface-2)', opacity: b.done ? 1 : 1}}></span>;
                    })}
                  </div>
                  <div className="mt-2 h-[2px] rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <div className="h-full bg-[var(--ink)]" style={{width:`${pct*100}%`}}></div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'goals' && (
        <>
          <div className="px-4 pt-1 pb-3">
            <h1 className="text-[32px] font-semibold tracking-[-0.025em] leading-[1.1] text-[var(--text-1)]">Objectifs</h1>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-32 space-y-2">
            {[
              { name:'5 sessions sport', cur:3, tot:5, sub:'Push · Pull · Legs' },
              { name:'21 prières Fajr', cur:18, tot:21, sub:'7 jours · 3 semaines' },
              { name:'10h apprentissage', cur:7.5, tot:10, sub:'React · System Design' },
              { name:'3 livraisons clients', cur:2, tot:3, sub:'Altiseo Q2' },
            ].map((g,i) => (
              <div key={i} className="bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px] p-4">
                <div className="flex items-baseline justify-between mb-1">
                  <div className="text-[15.5px] font-semibold text-[var(--text-1)] tracking-[-0.005em]">{g.name}</div>
                  <div className="text-[15px] tabular-nums text-[var(--text-1)] font-semibold">{g.cur}<span className="text-[var(--text-3)] font-normal text-[12.5px]"> / {g.tot}</span></div>
                </div>
                <div className="text-[12.5px] text-[var(--text-3)] mb-3">{g.sub}</div>
                <div className="h-[3px] rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className="h-full bg-[var(--ink)] transition-all" style={{width:`${(g.cur/g.tot)*100}%`}}></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'review' && (
        <>
          <div className="px-4 pt-1 pb-3">
            <h1 className="text-[32px] font-semibold tracking-[-0.025em] leading-[1.1] text-[var(--text-1)]">Bilan</h1>
            <div className="text-[12.5px] text-[var(--text-3)] mt-1">Cette semaine</div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-32 space-y-3">
            <div className="bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px] p-5">
              <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-2">Complétion</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[44px] font-semibold tabular-nums tracking-[-0.04em] text-[var(--text-1)] leading-none">{totalAll ? Math.round((doneAll/totalAll)*100) : 0}</span>
                <span className="text-[18px] text-[var(--text-3)]">%</span>
                <span className="ml-auto text-[12px] text-[var(--accent)] font-medium">+12%</span>
              </div>
              <div className="mt-4 h-[3px] rounded-full bg-[var(--surface-2)] overflow-hidden">
                <div className="h-full bg-[var(--ink)]" style={{width:`${totalAll?(doneAll/totalAll)*100:0}%`}}></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px] p-4">
                <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-2">
                  <IconFlame size={11}/> Série
                </div>
                <div className="text-[26px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--text-1)]">12<span className="text-[12px] text-[var(--text-3)] font-normal ml-1">jours</span></div>
              </div>
              <div className="bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px] p-4">
                <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-2">
                  <IconClock size={11}/> Focus
                </div>
                <div className="text-[26px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--text-1)]">24<span className="text-[12px] text-[var(--text-3)] font-normal ml-1">h</span></div>
              </div>
            </div>

            <div className="bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px] p-5">
              <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-4">Activité</div>
              <div className="flex items-end gap-1.5 h-[100px]">
                {window.DAYS_ORDER.map((dk, i) => {
                  const b = schedule[dk].blocks;
                  const pct = b.length ? b.filter(x=>x.done).length / b.length : 0;
                  return (
                    <div key={dk} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="flex-1 w-full flex items-end">
                        <div className="w-full rounded-t-[3px]" style={{height:`${Math.max(pct*100,4)}%`, background: i === window.TODAY_INDEX ? 'var(--accent)' : 'var(--ink)', opacity: i === window.TODAY_INDEX ? 1 : 0.85}}></div>
                      </div>
                      <div className="text-[9.5px] text-[var(--text-3)] uppercase font-semibold tracking-wider">{schedule[dk].label.slice(0,1)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      <MobileTabBar active={activeTab} onChange={setActiveTab} onAddBlock={() => setAiOpen(true)}/>
      {selectedBlock && <MobileBlockDetail block={selectedBlock} onClose={() => setSelectedBlock(null)} onToggle={toggleBlock} onUpdate={updateBlock}/>}
      <MobileAIChat open={aiOpen} onClose={() => setAiOpen(false)}/>
    </div>
  );
}

function MobileApp() {
  const [tweaks, setTweak] = (window.useTweaks ? window.useTweaks(MOBILE_TWEAKS) : [MOBILE_TWEAKS, ()=>{}]);
  const [settingsOpen, setSettingsOpen] = useStateApp(false);
  const [extraSettings, setExtraSettings] = useStateApp({
    followSystem: false,
    notifyReminders: true,
    notifyReview: true,
    notifyTempo: false,
    aiAuto: true,
    aiLearn: true,
  });

  // Settings agrège tweaks + extra
  const settings = {
    dark: !!tweaks.dark,
    accent: tweaks.accent || 'amber',
    defaultView: tweaks.defaultView || 'list',
    ...extraSettings,
  };
  const onSettingsChange = (patch) => {
    const known = ['dark','accent','defaultView'];
    const tweakPatch = {};
    const extraPatch = {};
    for (const k of Object.keys(patch)) {
      if (known.includes(k)) tweakPatch[k] = patch[k];
      else extraPatch[k] = patch[k];
    }
    if (Object.keys(tweakPatch).length) setTweak(tweakPatch);
    if (Object.keys(extraPatch).length) setExtraSettings(s => ({ ...s, ...extraPatch }));
  };

  useEffectApp(() => {
    document.documentElement.classList.toggle('dark', !!tweaks.dark);
  }, [tweaks.dark]);
  useEffectApp(() => {
    document.documentElement.style.setProperty('--accent', MOBILE_ACCENTS[tweaks.accent || 'amber']);
  }, [tweaks.accent]);

  const showFrame = tweaks.showFrame !== false;

  const inner = (
    <div className="relative w-full h-full overflow-hidden bg-[var(--bg)]">
      {/* Status bar (always shown when in frame) */}
      {showFrame && (
        <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-7 pt-3 pb-1">
          <span className="text-[15px] font-semibold tabular-nums" style={{color: tweaks.dark ? '#fff' : '#000'}}>9:41</span>
          <div className="flex items-center gap-1.5" style={{color: tweaks.dark ? '#fff' : '#000'}}>
            <svg width="16" height="10" viewBox="0 0 16 10"><rect x="0" y="6" width="2.5" height="4" rx="0.5" fill="currentColor"/><rect x="3.8" y="4" width="2.5" height="6" rx="0.5" fill="currentColor"/><rect x="7.6" y="2" width="2.5" height="8" rx="0.5" fill="currentColor"/><rect x="11.4" y="0" width="2.5" height="10" rx="0.5" fill="currentColor"/></svg>
            <svg width="22" height="11" viewBox="0 0 24 12"><rect x="0.5" y="0.5" width="20" height="11" rx="3" stroke="currentColor" fill="none" opacity="0.4"/><rect x="2" y="2" width="17" height="8" rx="1.5" fill="currentColor"/><rect x="21" y="4" width="1.5" height="4" rx="0.5" fill="currentColor" opacity="0.4"/></svg>
          </div>
        </div>
      )}
      <div className={`absolute inset-0 ${showFrame ? 'pt-[54px]' : ''}`}>
        <MobileScreenContent settings={settings} onSettings={() => setSettingsOpen(true)} onSettingsChange={onSettingsChange} />
      </div>
      {/* Settings sheet inside frame */}
      <MobileSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onChange={onSettingsChange} />
      {/* Home indicator */}
      {showFrame && (
        <div className="absolute bottom-1 inset-x-0 flex justify-center pointer-events-none z-40">
          <div className="h-[5px] w-[134px] rounded-full bg-[var(--text-1)] opacity-90"></div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#E8E6E1] dark:bg-[#06060A] p-4 sm:p-8">
      {showFrame ? (
        <div className="relative" style={{
          width: 393, height: 852,
          borderRadius: 56,
          padding: 12,
          background: tweaks.dark ? 'linear-gradient(155deg,#1a1a1d,#08080a)' : 'linear-gradient(155deg,#1d1d1f,#0a0a0c)',
          boxShadow: '0 50px 100px -20px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(255,255,255,0.05)',
        }}>
          <div className="absolute inset-0 m-3 rounded-[44px] overflow-hidden" style={{background:'var(--bg)'}}>
            {/* Dynamic island */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-50 h-[33px] w-[120px] rounded-full bg-black"></div>
            {inner}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-[440px] h-[100dvh] rounded-[24px] overflow-hidden border border-[var(--line)] bg-[var(--bg)] relative">
          {inner}
        </div>
      )}

      {window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks">
          <window.TweakSection title="Affichage">
            <window.TweakToggle label="Cadre iPhone" value={tweaks.showFrame} onChange={(v) => setTweak('showFrame', v)} />
            <window.TweakToggle label="Mode sombre" value={tweaks.dark} onChange={(v) => setTweak('dark', v)} />
            <window.TweakSelect label="Accent" value={tweaks.accent} onChange={(v) => setTweak('accent', v)}
              options={Object.keys(MOBILE_ACCENTS).map(k => ({value:k, label:k}))} />
          </window.TweakSection>
        </window.TweaksPanel>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<MobileApp />);
