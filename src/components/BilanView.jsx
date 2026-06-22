import React, { useState, useEffect } from 'react';
import { Flame as IconFlame, Sparkles as IconSparkle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { DAYS_ORDER } from '../data/schedule';
import { getCurrentDayName } from '../utils/dateUtils';
import { getWeekDateRange } from '../utils/monthUtils';
import { useCategories } from '../contexts/CategoriesContext';
import { generateDayRecap, generateWeekRecap, getDayRecapCached, getWeekRecapCached } from '../lib/ai';

export default function BilanView({ schedule, weekKey, userId, onNextWeek, onPrevWeek, isCurrentWeek, onGoToToday }) {
  const { getCategoryDetails } = useCategories();
  const currentDayKey = getCurrentDayName();
  const TODAY_INDEX = DAYS_ORDER.indexOf(currentDayKey);

  const [tab, setTab] = useState('journal'); // journal | stats
  const [scope, setScope] = useState('week'); // day | week | month
  const [reviewedDay, setReviewedDay] = useState(currentDayKey);
  const [aiByScope, setAiByScope] = useState({}); // { day:{ [dk]:text }, week:text, month:text }
  const [generating, setGenerating] = useState(false);
  
  const day = schedule[reviewedDay] || { blocks: [], label: reviewedDay };
  const dayBlocks = day?.blocks || [];
  const dayDone = dayBlocks.filter(b=>b.done).length;
  const dayPct = dayBlocks.length ? Math.round(dayDone/dayBlocks.length*100) : 0;

  // weekly stats
  const totalAll = DAYS_ORDER.reduce((a,d)=>a+(schedule[d]?.blocks?.length||0),0);
  const doneAll = DAYS_ORDER.reduce((a,d)=>a+(schedule[d]?.blocks?.filter(b=>b.done)?.length||0),0);
  const weekPct = totalAll ? Math.round(doneAll/totalAll*100) : 0;

  // category breakdown
  const catStats = {};
  for (const dk of DAYS_ORDER) {
    const blocks = schedule[dk]?.blocks || [];
    for (const b of blocks) {
      catStats[b.category] = catStats[b.category] || { total:0, done:0 };
      catStats[b.category].total++;
      if (b.done) catStats[b.category].done++;
    }
  }

  // notes count (mocked from done blocks with notes)
  const notesCount = DAYS_ORDER.reduce((acc, dk) => acc + (schedule[dk]?.blocks?.filter(b => b.note)?.length||0), 0);
  const quality = Math.min(100, Math.round((doneAll/Math.max(totalAll,1))*70 + (notesCount/15)*30));

  // Affiche le bilan déjà en cache (généré récemment, données inchangées) sans rappeler l'IA
  useEffect(() => {
    if (!userId || !weekKey || tab !== 'journal') return;
    let cancelled = false;
    (async () => {
      const cached = scope === 'day'
        ? await getDayRecapCached(day.label, dayBlocks, [], weekKey)
        : scope === 'week'
          ? await getWeekRecapCached(schedule, weekKey)
          : null;
      if (cancelled || !cached) return;
      setAiByScope(s => scope === 'day'
        ? { ...s, day: { ...(s.day || {}), [reviewedDay]: cached } }
        : { ...s, [scope]: cached });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, reviewedDay, weekKey, userId, tab]);

  return (
    <div className="pt-2 lg:pt-0">
      {/* Tabs */}
      <div className="flex items-center justify-center mb-8">
        <div className="inline-flex bg-[var(--surface-1)] rounded-[10px] p-[3px]">
          {[
            { id:'journal', label:'Journal IA' },
            { id:'stats',   label:'Statistiques' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-1.5 rounded-[8px] text-[12px] font-semibold uppercase tracking-[0.1em] transition-all
                ${tab === t.id ? 'bg-[var(--surface-0)] text-[var(--text-1)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]' : 'text-[var(--text-3)]'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'journal' && (
        <>
          {/* Scope picker */}
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex bg-[var(--surface-1)] rounded-[10px] p-[3px]">
              {[{id:'day',label:'Jour'},{id:'week',label:'Semaine'}].map(s => (
                <button key={s.id} onClick={() => setScope(s.id)}
                  className={`px-4 py-1.5 rounded-[8px] text-[12px] font-semibold uppercase tracking-[0.08em] transition-all
                    ${scope === s.id ? 'bg-[var(--surface-0)] text-[var(--text-1)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]' : 'text-[var(--text-3)] hover:text-[var(--text-2)]'}`}>{s.label}</button>
              ))}
            </div>
            <div className="text-[11px] text-[var(--text-3)] tabular-nums">{notesCount} notes rédigées</div>
          </div>

          {/* Title row */}
          <div className="flex items-start justify-between mb-7">
            <div>
              <h1 className="text-[32px] lg:text-[40px] font-medium tracking-[-0.025em] leading-[1.05] text-[var(--text-1)]">Journal IA</h1>
              <div className="text-[12.5px] text-[var(--text-3)] mt-2 tabular-nums flex items-center gap-1.5 -ml-1">
                <button onClick={onPrevWeek} className="p-1 rounded-[6px] hover:bg-[var(--surface-1)] transition-colors"><ChevronLeft size={14}/></button>
                <span className="font-medium text-[var(--text-2)]">
                  {isCurrentWeek ? (scope === 'day' ? `${day.label} ${day.type ? `· ${day.type}` : ''}` : scope === 'week' ? 'Cette semaine' : 'Ce mois-ci') : getWeekDateRange(weekKey)}
                </span>
                <button onClick={onNextWeek} className="p-1 rounded-[6px] hover:bg-[var(--surface-1)] transition-colors"><ChevronRight size={14}/></button>
                {!isCurrentWeek && (
                  <button onClick={onGoToToday} className="text-[11px] px-1.5 font-semibold text-[var(--brand,#B45309)]">
                    Auj.
                  </button>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className="h-7 w-7 rounded-full bg-[var(--surface-1)] grid place-items-center"><IconFlame size={13} className="text-[var(--brand)]"/></span>
                <span className="text-[26px] font-medium tabular-nums tracking-[-0.02em] text-[var(--text-1)]">
                  {scope === 'day' ? dayPct : quality}<span className="text-[14px] text-[var(--text-3)] font-normal">/100</span>
                </span>
              </div>
              <div className="text-[10.5px] uppercase tracking-[0.12em] text-[var(--text-3)] font-semibold mt-1">
                {scope === 'day' ? 'Qualité jour' : 'Qualité semaine'}
              </div>
            </div>
          </div>

          {/* Day picker — only in day scope */}
          {scope === 'day' && (
            <>
              <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--text-3)] mb-3">Choisir un jour</div>
              <div className="grid grid-cols-7 gap-1.5 mb-5">
                {DAYS_ORDER.map((dk) => {
                  const d = schedule[dk] || { blocks: [], label: dk };
                  const done = d.blocks.filter(b=>b.done).length;
                  const pct = d.blocks.length ? done/d.blocks.length : 0;
                  const isActive = reviewedDay === dk;
                  const hasReview = aiByScope.day && aiByScope.day[dk];
                  return (
                    <button key={dk} onClick={() => setReviewedDay(dk)}
                      className={`relative flex flex-col items-center justify-center gap-1.5 py-3 rounded-[10px] border transition-all
                        ${isActive ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]' : 'border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-1)]/50'}`}>
                      <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${isActive ? 'text-[var(--bg)]/70' : 'text-[var(--text-3)]'}`}>{d.label.slice(0,3)}</span>
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" fill="none" stroke={isActive ? 'rgba(255,255,255,0.15)' : 'var(--surface-2)'} strokeWidth="2.5"/>
                        <circle cx="12" cy="12" r="9" fill="none"
                          stroke={isActive ? 'var(--bg)' : (pct === 1 ? 'var(--brand)' : 'var(--ink)')}
                          strokeWidth="2.5" strokeDasharray={`${pct*56.5} 56.5`}
                          strokeLinecap="round" transform="rotate(-90 12 12)"/>
                      </svg>
                      {hasReview && !isActive && <div className="absolute top-1.5 right-1.5 h-1 w-1 rounded-full bg-[var(--brand)]"></div>}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* AI Card — adapts to scope */}
          <div className="border border-[var(--line)] rounded-[14px] overflow-hidden mb-12">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line)]" style={{background:'linear-gradient(180deg, var(--surface-1) 0%, transparent 100%)'}}>
              <div className="flex items-center gap-2">
                <h3 className="text-[18px] font-medium tracking-[-0.015em] text-[var(--text-1)]">
                  {scope === 'day' ? day.label : scope === 'week' ? 'Bilan de la semaine' : 'Bilan du mois'}
                </h3>
                {scope === 'day' && DAYS_ORDER.indexOf(reviewedDay) === TODAY_INDEX && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--brand)] text-white text-[9.5px] uppercase tracking-[0.1em] font-bold">Auj.</span>
                )}
              </div>
              <div className="text-[20px] font-medium tabular-nums text-[var(--text-1)] tracking-[-0.015em]">
                {scope === 'day' ? `${dayPct}%` : `${weekPct}%`}
              </div>
            </div>

            {/* Summary line */}
            <div className="px-5 py-3 border-b border-[var(--line)] flex items-center justify-between gap-4">
              <div className="text-[12px] text-[var(--text-3)]">
                {scope === 'day' && <><span className="text-[var(--text-1)] font-medium">{dayDone}</span> sur {dayBlocks.length} blocs accomplis</>}
                {scope === 'week' && <><span className="text-[var(--text-1)] font-medium">{doneAll}</span> sur {totalAll} blocs cette semaine</>}
                {scope === 'month' && <><span className="text-[var(--text-1)] font-medium">312</span> blocs sur 4 semaines · 78% en moyenne</>}
              </div>
            </div>

            {/* Category chips */}
            <div className="px-5 py-3 border-b border-[var(--line)] flex flex-wrap gap-1.5">
              {(() => {
                let cats;
                if (scope === 'day') {
                  cats = {};
                  for (const b of dayBlocks) {
                    cats[b.category] = cats[b.category] || { total:0, done:0 };
                    cats[b.category].total++;
                    if (b.done) cats[b.category].done++;
                  }
                } else {
                  cats = catStats;
                }
                return Object.entries(cats).map(([k, v]) => {
                  const cat = getCategoryDetails(k);
                  if (!cat) return null;
                  return (
                    <span key={k} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface-1)] text-[11px] tabular-nums">
                      <span className="h-1.5 w-1.5 rounded-full" style={{background: cat.color || cat.dot || 'var(--text-1)'}}></span>
                      <span className="text-[var(--text-2)]">{cat.label}</span>
                      <span className="text-[var(--text-3)]">{v.done}/{v.total}</span>
                    </span>
                  );
                });
              })()}
            </div>

            {/* AI generation zone */}
            {(() => {
              const aiText = scope === 'day' ? (aiByScope.day && aiByScope.day[reviewedDay]) : aiByScope[scope];
              const generate = async (force = false) => {
                if (generating) return;
                setGenerating(true);
                try {
                  const txt = scope === 'day'
                    ? await generateDayRecap(day.label, dayBlocks, [], { weekKey, force })
                    : await generateWeekRecap(schedule, { weekKey, force });
                  setAiByScope(s => {
                    if (scope === 'day') return { ...s, day: { ...(s.day || {}), [reviewedDay]: txt } };
                    return { ...s, [scope]: txt };
                  });
                } catch (err) {
                  toast.error(err.message || 'Impossible de générer le bilan pour le moment.');
                } finally {
                  setGenerating(false);
                }
              };

              if (aiText) {
                return (
                  <div className="px-5 py-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="h-6 w-6 rounded-full bg-[var(--brand)]/15 grid place-items-center text-[var(--brand)]"><IconSparkle size={11} strokeWidth={2}/></span>
                      <span className="text-[10.5px] uppercase tracking-[0.12em] text-[var(--text-3)] font-semibold">Synthèse IA</span>
                      <button onClick={() => generate(true)} className="ml-auto text-[11px] text-[var(--text-3)] hover:text-[var(--text-1)]">Régénérer</button>
                    </div>
                    <div className="text-[13.5px] text-[var(--text-1)] leading-[1.65] whitespace-pre-line tracking-[-0.005em]">{aiText}</div>
                  </div>
                );
              }
              return (
                <div className="px-5 py-7 flex flex-col items-center gap-3">
                  <div className="text-[12.5px] text-[var(--text-3)]">
                    {scope === 'day' && "L'IA est prête à analyser cette journée."}
                    {scope === 'week' && "L'IA est prête à synthétiser ta semaine."}
                    {scope === 'month' && "L'IA est prête à dresser le bilan d'avril."}
                  </div>
                  <button onClick={() => generate(false)} disabled={generating}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--ink)] text-[var(--bg)] text-[12.5px] font-semibold tracking-[-0.005em] hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-60">
                    <IconSparkle size={13} strokeWidth={2} className={generating ? 'animate-spin' : ''}/>
                    <span>{generating ? 'Génération…' : 'Générer le bilan'}</span>
                  </button>
                </div>
              );
            })()}
          </div>
        </>
      )}

      {tab === 'stats' && (
        <>
          <div className="flex items-end justify-between mb-8">
            <div>
              <h1 className="text-[32px] lg:text-[40px] font-medium tracking-[-0.025em] leading-[1.05] text-[var(--text-1)]">Statistiques.</h1>
              <div className="text-[12.5px] text-[var(--text-3)] mt-2 tabular-nums flex items-center gap-1.5 -ml-1">
                <button onClick={onPrevWeek} className="p-1 rounded-[6px] hover:bg-[var(--surface-1)] transition-colors"><ChevronLeft size={14}/></button>
                <span className="font-medium text-[var(--text-2)]">
                  {isCurrentWeek ? 'Cette semaine' : getWeekDateRange(weekKey)}
                </span>
                <button onClick={onNextWeek} className="p-1 rounded-[6px] hover:bg-[var(--surface-1)] transition-colors"><ChevronRight size={14}/></button>
                {!isCurrentWeek && (
                  <button onClick={onGoToToday} className="text-[11px] px-1.5 font-semibold text-[var(--brand,#B45309)]">
                    Auj.
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-7">
            {[
              { label:'Complétion', val: weekPct + '%', delta:`${doneAll}/${totalAll} blocs`, accent: true },
              { label:'Jours complets', val: String(DAYS_ORDER.filter(d => { const b = schedule[d]?.blocks || []; return b.length > 0 && b.every(x => x.done); }).length), unit:'/7', delta:'cette semaine' },
              { label:'Blocs faits', val: String(doneAll), unit:'', delta:`sur ${totalAll} planifiés` },
            ].map((s,i) => (
              <div key={i} className="border border-[var(--line)] rounded-[12px] p-5">
                <div className="text-[10.5px] uppercase tracking-[0.12em] text-[var(--text-3)] font-semibold mb-2.5">{s.label}</div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-[36px] font-semibold tabular-nums tracking-[-0.03em] leading-none ${s.accent ? 'text-[var(--brand)]' : 'text-[var(--text-1)]'}`}>{s.val}</span>
                  {s.unit && <span className="text-[14px] text-[var(--text-3)] font-medium">{s.unit}</span>}
                </div>
                <div className="text-[11px] text-[var(--text-3)] mt-2">{s.delta}</div>
              </div>
            ))}
          </div>

          {/* Activité par jour */}
          <div className="border border-[var(--line)] rounded-[12px] p-6 mb-3">
            <div className="flex items-center justify-between mb-5">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-3)] font-semibold">Activité par jour</div>
              <div className="text-[11px] text-[var(--text-3)] tabular-nums">{doneAll}/{totalAll} blocs</div>
            </div>
            <div className="flex items-end gap-2 h-[160px]">
              {DAYS_ORDER.map((dk, i) => {
                const b = schedule[dk]?.blocks || [];
                const pct = b.length ? b.filter(x=>x.done).length / b.length : 0;
                const dn = b.filter(x=>x.done).length;
                return (
                  <div key={dk} className="flex-1 h-full flex flex-col items-center gap-2 group">
                    <div className="flex-1 w-full flex items-end relative">
                      <div className="w-full rounded-t-[3px] transition-all relative"
                        style={{ height: `${Math.max(pct*100, 4)}%`, background: i === TODAY_INDEX ? 'var(--brand)' : 'var(--ink)', opacity: i === TODAY_INDEX ? 1 : 0.85 }}>
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] tabular-nums text-[var(--text-3)] opacity-0 lg:group-hover:opacity-100 transition-opacity whitespace-nowrap">{dn}/{b.length}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-[var(--text-3)] uppercase tracking-wider font-semibold">{(schedule[dk]?.label || dk).slice(0,3)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Répartition catégorie */}
          <div className="border border-[var(--line)] rounded-[12px] p-6 mb-12">
            <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-3)] font-semibold mb-5">Par catégorie</div>
            <div className="space-y-3">
              {Object.entries(catStats).map(([k, v]) => {
                const cat = getCategoryDetails(k);
                const pct = v.total ? v.done/v.total : 0;
                if (!cat) return null;
                return (
                  <div key={k} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-[140px] shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full" style={{background: cat.color || cat.dot || 'var(--text-1)'}}></span>
                      <span className="text-[12.5px] text-[var(--text-1)] truncate">{cat.label}</span>
                    </div>
                    <div className="flex-1 h-[5px] rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct*100}%`, background: cat.color || cat.dot || 'var(--text-1)' }}></div>
                    </div>
                    <div className="text-[11.5px] tabular-nums text-[var(--text-3)] w-16 text-right">{Math.round(pct*100)}%</div>
                    <div className="text-[11.5px] tabular-nums text-[var(--text-2)] w-12 text-right">{v.done}/{v.total}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
