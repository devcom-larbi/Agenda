import React, { useState } from 'react';
import { Plus as IconPlus, Flame as IconFlame, Clock as IconClock, Check as IconCheck } from 'lucide-react';
import { useGoals } from '../hooks/useGoals';

// === Unified GoalsView (Mobile + Desktop) ===

const GOAL_EMOJIS = ['💧','📚','🏃','🧘','🥗','💪','💤','🎯','🌱','✍️','🎨','🎵','☕','🚶','🧠','❤️','🔥','⭐','📿','🤲'];
const GOAL_COLORS = ['#0369A1','#15803D','#D97706','#9333EA','#DC2626','#0891B2','#CA8A04','#1E40AF','#44403C','#0A0A0A','#A8A29E','#78716C'];
const GOAL_PERIODS = [
  { id:'day',   label:'/ jour' },
  { id:'week',  label:'/ semaine' },
  { id:'month', label:'/ mois' },
];

const TYPES = [
  { id:'counter', label:'Compteur',     desc:'Cumuler une valeur' },
  { id:'check',   label:'Oui / Non',    desc:'Une simple coche' },
  { id:'streak',  label:'Série',         desc:'Jours consécutifs' },
  { id:'monthly', label:'Mensuelle', desc:'Atteindre un total dans le mois' },
];

export default function GoalsView({ userId }) {
  const {
    goals: dbGoals,
    addGoal, updateGoal, deleteGoal,
    toggleGoal, setExactValue,
    getTodayProgress, getStreak,
  } = useGoals(userId);

  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);

  // View-model : objectif persisté (Supabase) + progression du jour + série
  const todayProg = getTodayProgress();
  const goals = dbGoals.map(g => {
    const prog = todayProg[g.id] || { value: 0, done: false };
    const isBinary = g.type === 'check' || g.type === 'streak';
    return {
      id: g.id,
      emoji: g.emoji || '🎯',
      name: g.label,
      color: g.color || '#0A0A0A',
      type: g.type || 'counter',
      unit: g.unit || '',
      target: g.target || 1,
      period: g.type === 'monthly' ? 'month' : 'day',
      current: isBinary ? (prog.done ? 1 : 0) : (prog.value || 0),
      streak: getStreak(g.id),
      reminder: null,
    };
  });

  const filtered = goals.filter(g => filter === 'all' || g.period === filter);

  // Édition complète (depuis l'éditeur) vs action de progression (depuis une carte)
  const upd = (id, patch) => {
    const isEdit = ['name', 'label', 'emoji', 'color', 'type', 'unit', 'target'].some(k => k in patch);
    if (isEdit) {
      updateGoal(id, {
        label: patch.name ?? patch.label,
        emoji: patch.emoji,
        type: patch.type,
        target: patch.target,
        unit: patch.unit,
        color: patch.color,
      });
      return;
    }
    const goal = dbGoals.find(g => g.id === id);
    if (!goal) return;
    if (goal.type === 'counter' || goal.type === 'monthly') setExactValue(id, patch.current ?? 0);
    else toggleGoal(id); // check / streak → bascule la complétion du jour
  };

  const add = (g) => addGoal({
    label: g.name, emoji: g.emoji, type: g.type,
    target: g.target || 1, unit: g.unit || '', color: g.color,
  });

  const rm = (id) => deleteGoal(id);

  const todayGoals = goals.filter(g => g.period === 'day');
  const todayDone = todayGoals.filter(g => g.current >= g.target).length;
  const todayPct = todayGoals.length ? todayDone / todayGoals.length : 0;

  const sharedProps = {
    goals, filter, setFilter, editing, setEditing,
    filtered, upd, add, rm, todayGoals, todayDone, todayPct
  };

  return (
    <>
      <div className="hidden lg:block">
        <DesktopGoals {...sharedProps} />
      </div>
      <div className="block lg:hidden h-full flex flex-col">
        <MobileGoals {...sharedProps} />
      </div>
    </>
  );
}

// ════════════════════════════════════════════════
// DESKTOP VIEWS
// ════════════════════════════════════════════════

function DesktopGoals({ filter, setFilter, editing, setEditing, filtered, upd, add, rm, todayGoals, todayDone, todayPct, goals }) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.14em] font-medium text-[var(--text-3)] mb-3">Habitudes & cibles</div>
          <h1 className="text-[40px] font-medium tracking-[-0.025em] leading-[1.1] text-[var(--text-1)]">Objectifs.</h1>
        </div>
        <button onClick={() => setEditing('new')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--ink)] text-[var(--bg)] text-[12.5px] font-semibold tracking-[-0.005em] hover:scale-[1.02] active:scale-95 transition-transform">
          <IconPlus size={13} strokeWidth={2.4}/>
          <span>Nouvel objectif</span>
        </button>
      </div>

      {/* KPI today */}
      {todayGoals.length > 0 && (
        <div className="border border-[var(--line)] rounded-[12px] p-5 mb-6 flex items-center gap-6">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-[var(--text-3)] font-semibold mb-1">Aujourd'hui</div>
            <div className="flex items-baseline gap-1">
              <span className="text-[32px] font-semibold tabular-nums tracking-[-0.025em] text-[var(--text-1)] leading-none">{todayDone}</span>
              <span className="text-[14px] text-[var(--text-3)]">/ {todayGoals.length} habitudes</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="h-[5px] rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div className="h-full bg-[var(--ink)] transition-all duration-500" style={{width:`${todayPct*100}%`}}></div>
            </div>
            <div className="text-[11px] text-[var(--text-3)] mt-2 tabular-nums">{Math.round(todayPct*100)}% complété</div>
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 mb-4">
        {[
          { id:'all',   label:'Tous',     count: goals.length },
          { id:'day',   label:'Jour',     count: goals.filter(g=>g.period==='day').length },
          { id:'week',  label:'Semaine',  count: goals.filter(g=>g.period==='week').length },
          { id:'month', label:'Mois',     count: goals.filter(g=>g.period==='month').length },
        ].map(t => {
          const active = filter === t.id;
          return (
            <button key={t.id} onClick={() => setFilter(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all
                ${active ? 'bg-[var(--ink)] text-[var(--bg)]' : 'bg-[var(--surface-1)] text-[var(--text-2)] hover:bg-[var(--surface-2)]'}`}>
              {t.label}
              <span className={`tabular-nums text-[10.5px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-[var(--surface-2)]'}`}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* Goals grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 border border-dashed border-[var(--line)] rounded-[12px]">
            <div className="text-[14px] text-[var(--text-3)] mb-3">Aucun objectif dans cette catégorie</div>
            <button onClick={() => setEditing('new')}
              className="px-4 py-2 rounded-full bg-[var(--ink)] text-[var(--bg)] text-[12.5px] font-semibold">
              Créer un objectif
            </button>
          </div>
        )}
        {filtered.map(g => (
          <GoalCardDt key={g.id} goal={g} onUpdate={upd} onEdit={() => setEditing(g)}/>
        ))}
      </div>

      {/* Editor modal */}
      {editing && (
        <GoalEditorDt goal={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(g) => { editing === 'new' ? add(g) : upd(g.id, g); setEditing(null); }}
          onDelete={(id) => { rm(id); setEditing(null); }}/>
      )}
    </div>
  );
}

function GoalCardDt({ goal, onUpdate, onEdit }) {
  const pct = Math.min(goal.current / goal.target, 1);
  const periodLabel = GOAL_PERIODS.find(p => p.id === goal.period)?.label.toLowerCase().replace('par ', '/ ') || '';
  const inc = (delta) => onUpdate(goal.id, { current: Math.max(0, goal.current + delta) });

  return (
    <div className="border border-[var(--line)] rounded-[12px] p-5 hover:border-[var(--line-strong)] bg-[var(--surface-0)] transition-colors group">
      <div className="flex items-start gap-3 mb-3">
        <button onClick={onEdit} className="h-11 w-11 rounded-[12px] grid place-items-center text-[22px] shrink-0 transition-transform hover:scale-105"
          style={{ background: `${goal.color}18`, border: `1px solid ${goal.color}33` }}>
          {goal.emoji}
        </button>
        <button onClick={onEdit} className="flex-1 min-w-0 text-left">
          <div className="flex items-baseline gap-2 mb-0.5">
            <div className="text-[15px] font-semibold tracking-[-0.005em] text-[var(--text-1)] truncate">{goal.name}</div>
            {goal.streak > 0 && (
              <div className="flex items-center gap-1 text-[11px] font-semibold tabular-nums shrink-0" style={{color: goal.color}}>
                <IconFlame size={11}/> {goal.streak}j
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11.5px] text-[var(--text-3)]">
            {goal.type === 'counter' && <span className="tabular-nums"><span className="font-semibold text-[var(--text-1)]">{goal.current}</span>/{goal.target} {goal.unit} {periodLabel}</span>}
            {goal.type === 'check'   && <span>{goal.current >= 1 ? "Fait aujourd'hui" : 'À faire'} {periodLabel}</span>}
            {goal.type === 'streak'  && <span className="tabular-nums">Série : <span className="font-semibold text-[var(--text-1)]">{goal.streak}</span>/{goal.target} {goal.unit}</span>}
            {goal.type === 'monthly' && <span className="tabular-nums"><span className="font-semibold text-[var(--text-1)]">{goal.current.toLocaleString('fr-FR')}</span>/{goal.target.toLocaleString('fr-FR')} {goal.unit} {periodLabel}</span>}
            {goal.reminder && <span className="ml-auto inline-flex items-center gap-1"><IconClock size={9.5}/> {goal.reminder}</span>}
          </div>
        </button>
      </div>

      <div className="h-[6px] rounded-full bg-[var(--surface-2)] overflow-hidden mb-3">
        <div className="h-full transition-all duration-300" style={{ width: `${pct*100}%`, background: goal.color }}></div>
      </div>

      <div className="flex items-center gap-2">
        {goal.type === 'counter' && (
          <>
            <button onClick={() => inc(-1)} className="h-8 w-8 rounded-[8px] bg-[var(--surface-1)] grid place-items-center hover:bg-[var(--surface-2)] active:scale-90 transition-all"><span className="text-[16px] text-[var(--text-2)] leading-none">−</span></button>
            <button onClick={() => inc(1)} className="flex-1 h-8 rounded-[8px] grid place-items-center text-[12px] font-semibold text-white hover:scale-[1.01] active:scale-[.98] transition-transform" style={{ background: goal.color }}>+ 1 {goal.unit}</button>
          </>
        )}
        {goal.type === 'check' && (
          <button onClick={() => onUpdate(goal.id, { current: goal.current >= 1 ? 0 : 1 })} className="flex-1 h-8 rounded-[8px] grid place-items-center text-[12px] font-semibold transition-transform hover:scale-[1.01] active:scale-[.98]" style={{ background: goal.current >= 1 ? goal.color : 'var(--surface-1)', color: goal.current >= 1 ? 'white' : 'var(--text-2)' }}>{goal.current >= 1 ? '✓ Fait' : 'Marquer fait'}</button>
        )}
        {goal.type === 'streak' && (
          <button onClick={() => onUpdate(goal.id, { streak: goal.streak + 1, current: 1 })} className="flex-1 h-8 rounded-[8px] grid place-items-center text-[12px] font-semibold text-white inline-flex items-center gap-1.5 hover:scale-[1.01] active:scale-[.98] transition-transform" style={{ background: goal.color }}><IconFlame size={12}/> Valider la journée</button>
        )}
        {goal.type === 'monthly' && (
          <>
            <button onClick={() => inc(-10)} className="h-8 px-3 rounded-[8px] bg-[var(--surface-1)] text-[11.5px] font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)]">−10</button>
            <button onClick={() => inc(10)} className="h-8 px-3 rounded-[8px] text-[11.5px] font-medium text-white hover:scale-[1.02]" style={{ background: goal.color }}>+10</button>
            <button onClick={() => inc(50)} className="flex-1 h-8 rounded-[8px] text-[11.5px] font-medium text-white hover:scale-[1.01]" style={{ background: goal.color, opacity: 0.85 }}>+ 50 {goal.unit}</button>
          </>
        )}
      </div>
    </div>
  );
}

function GoalEditorDt({ goal, onClose, onSave, onDelete }) {
  const isNew = !goal;
  const [draft, setDraft] = useState(goal || { emoji: '🎯', name: '', color: GOAL_COLORS[0], type: 'counter', unit: '', target: 1, period: 'day', current: 0, reminder: null, streak: 0 });
  const [emojiOpen, setEmojiOpen] = useState(false);
  const set = (patch) => setDraft(d => ({ ...d, ...patch }));

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="fixed inset-0 z-50 grid place-items-center p-8 pointer-events-none">
        <div className="bg-[var(--bg)] border border-[var(--line)] rounded-[16px] w-full max-w-[560px] max-h-[88vh] overflow-hidden flex flex-col shadow-2xl pointer-events-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)]">
            <button onClick={onClose} className="text-[13px] text-[var(--text-2)] hover:text-[var(--text-1)]">Annuler</button>
            <div className="text-[14px] font-semibold tracking-[-0.005em]">{isNew ? 'Nouvel objectif' : 'Modifier'}</div>
            <button onClick={() => onSave(draft)} disabled={!draft.name.trim()} className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold transition-all ${draft.name.trim() ? 'bg-[var(--ink)] text-[var(--bg)] hover:scale-[1.02] active:scale-95' : 'bg-[var(--surface-1)] text-[var(--text-3)]'}`}>{isNew ? 'Créer' : 'Enregistrer'}</button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button onClick={() => setEmojiOpen(!emojiOpen)} className="h-14 w-14 rounded-[14px] grid place-items-center text-[28px] hover:scale-105 active:scale-95 transition-transform" style={{ background: `${draft.color}18`, border: `1px solid ${draft.color}33` }}>{draft.emoji}</button>
                {emojiOpen && (
                  <>
                    <div className="fixed inset-0 z-[51]" onClick={() => setEmojiOpen(false)}></div>
                    <div className="absolute z-[52] mt-1.5 w-[280px] bg-[var(--surface-0)] border border-[var(--line)] rounded-[12px] p-2 shadow-xl grid grid-cols-7 gap-1">
                      {GOAL_EMOJIS.map(e => <button key={e} onClick={() => { set({emoji: e}); setEmojiOpen(false); }} className={`h-8 w-8 rounded-[8px] text-[18px] grid place-items-center ${draft.emoji === e ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-1)]'}`}>{e}</button>)}
                    </div>
                  </>
                )}
              </div>
              <input type="text" value={draft.name} onChange={(e) => set({name: e.target.value})} placeholder="Nom de l'objectif" className="flex-1 bg-transparent text-[18px] font-semibold tracking-[-0.01em] text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none border-b border-[var(--line)] py-2"/>
            </div>

            <div>
              <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-2.5">Type d'objectif</div>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map(t => {
                  const active = draft.type === t.id;
                  return (
                    <button key={t.id} onClick={() => set({type: t.id})}
                      className={`text-left p-3 rounded-[10px] border transition-all
                        ${active ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]' : 'border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-1)]/50'}`}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-[13px] font-semibold ${active ? '' : 'text-[var(--text-1)]'}`}>{t.label}</span>
                        {active && <IconCheck size={12} strokeWidth={2.5}/>}
                      </div>
                      <div className={`text-[10.5px] leading-tight ${active ? 'opacity-70' : 'text-[var(--text-3)]'}`}>{t.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-2.5">Couleur</div>
              <div className="flex flex-wrap gap-2 items-center">
                {GOAL_COLORS.map(c => <button key={c} onClick={() => set({color: c})} className={`h-8 w-8 rounded-full grid place-items-center transition-all ${draft.color === c ? 'ring-2 ring-offset-2 ring-offset-[var(--bg)] ring-[var(--text-1)] scale-110' : 'hover:scale-110'}`} style={{background: c}}>{draft.color === c && <IconCheck size={11} strokeWidth={3} className="text-white"/>}</button>)}
                <label className="h-8 w-8 rounded-full cursor-pointer relative overflow-hidden border border-[var(--line)]" style={{background: 'conic-gradient(from 0deg, #ef4444,#f59e0b,#84cc16,#06b6d4,#3b82f6,#a855f7,#ef4444)'}}>
                  <input type="color" value={draft.color} onChange={(e) => set({color: e.target.value})} className="absolute inset-0 opacity-0 cursor-pointer"/>
                </label>
              </div>
            </div>

            {(draft.type === 'counter' || draft.type === 'monthly' || draft.type === 'streak') && (
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-2.5">Cible & unité</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="border border-[var(--line)] rounded-[10px] px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] font-bold mb-1">Cible</div>
                    <input type="number" value={draft.target} onChange={(e) => set({target: Number(e.target.value) || 1})} className="w-full bg-transparent outline-none text-[14px] text-[var(--text-1)] tabular-nums font-semibold"/>
                  </div>
                  <div className="border border-[var(--line)] rounded-[10px] px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] font-bold mb-1">Unité</div>
                    <input type="text" value={draft.unit} onChange={(e) => set({unit: e.target.value})} placeholder="verres, pages…" className="w-full bg-transparent outline-none text-[13px] text-[var(--text-1)] placeholder:text-[var(--text-3)]"/>
                  </div>
                  <div className="border border-[var(--line)] rounded-[10px] px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] font-bold mb-1">Période</div>
                    <select value={draft.period} onChange={(e) => set({period: e.target.value})} className="w-full bg-transparent outline-none text-[13px] text-[var(--text-1)]">
                      {GOAL_PERIODS.map(p => <option key={p.id} value={p.id}>{p.label.replace('/ ', 'Par ')}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-2.5">Rappel quotidien</div>
              <div className="flex items-center gap-3 border border-[var(--line)] rounded-[10px] px-4 py-3">
                <IconClock size={13} className="text-[var(--text-3)]"/>
                <input type="time" value={draft.reminder || ''} onChange={(e) => set({reminder: e.target.value || null})} className="flex-1 bg-transparent outline-none text-[13.5px] text-[var(--text-1)] tabular-nums"/>
                {draft.reminder && <button onClick={() => set({reminder: null})} className="text-[11.5px] text-[var(--brand)] font-medium hover:underline">Effacer</button>}
              </div>
            </div>

            {!isNew && <button onClick={() => onDelete(draft.id)} className="w-full border border-[var(--line)] rounded-[10px] py-3 text-[13px] font-medium text-[var(--brand)] hover:bg-[var(--brand)]/10 transition-colors">Supprimer cet objectif</button>}
          </div>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════
// MOBILE VIEWS
// ════════════════════════════════════════════════

function MobileGoals({ filter, setFilter, editing, setEditing, filtered, upd, add, rm, todayGoals, todayDone, todayPct }) {
  return (
    <>
      <div className="px-4 pt-1 pb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-1">Habitudes & cibles</div>
          <h1 className="text-[32px] font-semibold tracking-[-0.025em] leading-[1.1] text-[var(--text-1)]">Objectifs</h1>
        </div>
        <button onClick={() => setEditing('new')}
          className="h-9 w-9 rounded-full bg-[var(--ink)] text-[var(--bg)] grid place-items-center active:scale-90 transition-transform shrink-0 mt-1">
          <IconPlus size={15} strokeWidth={2.4}/>
        </button>
      </div>

      {/* Today summary card */}
      {todayGoals.length > 0 && (
        <div className="px-3 pb-3">
          <div className="bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px] p-4">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)]">Aujourd'hui</div>
              <div className="text-[14px] tabular-nums font-semibold text-[var(--text-1)]">
                {todayDone}<span className="text-[var(--text-3)] font-normal">/{todayGoals.length}</span>
              </div>
            </div>
            <div className="h-[3px] rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div className="h-full bg-[var(--ink)] transition-all duration-500" style={{width:`${todayPct*100}%`}}></div>
            </div>
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div className="px-3 pb-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
          {[
            { id:'all',   label:'Tous' },
            { id:'day',   label:'Jour' },
            { id:'week',  label:'Semaine' },
            { id:'month', label:'Mois' },
          ].map(t => {
            const active = filter === t.id;
            return (
              <button key={t.id} onClick={() => setFilter(t.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all
                  ${active ? 'bg-[var(--ink)] text-[var(--bg)]' : 'bg-[var(--surface-1)] text-[var(--text-2)]'}`}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Goals list */}
      <div className="flex-1 overflow-y-auto px-3 pb-32 space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 border border-dashed border-[var(--line)] rounded-[16px] m-1">
            <div className="text-[14px] text-[var(--text-3)] mb-3">Aucun objectif dans cette catégorie</div>
            <button onClick={() => setEditing('new')}
              className="px-4 py-2 rounded-full bg-[var(--ink)] text-[var(--bg)] text-[12.5px] font-semibold">
              Créer un objectif
            </button>
          </div>
        )}
        {filtered.map(g => (
          <GoalRow key={g.id} goal={g} onUpdate={upd} onEdit={() => setEditing(g)}/>
        ))}
      </div>

      {editing && (
        <GoalEditor goal={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(g) => { editing === 'new' ? add(g) : upd(g.id, g); setEditing(null); }}
          onDelete={(id) => { rm(id); setEditing(null); }} />
      )}
    </>
  );
}

function GoalRow({ goal, onUpdate, onEdit }) {
  const pct = Math.min(goal.current / goal.target, 1);
  const periodLabel = GOAL_PERIODS.find(p => p.id === goal.period)?.label || '';
  const inc = (delta) => onUpdate(goal.id, { current: Math.max(0, goal.current + delta) });

  return (
    <div className="bg-[var(--surface-0)] border border-[var(--line)] rounded-[16px] p-4 active:bg-[var(--surface-1)] transition-colors">
      <div className="flex items-start gap-3">
        <button onClick={onEdit} className="h-10 w-10 rounded-[12px] grid place-items-center text-[20px] shrink-0"
          style={{ background: `${goal.color}18`, border: `1px solid ${goal.color}33` }}>
          {goal.emoji}
        </button>
        <div className="flex-1 min-w-0" onClick={onEdit}>
          <div className="flex items-baseline justify-between mb-0.5">
            <div className="text-[14.5px] font-semibold text-[var(--text-1)] tracking-[-0.005em] truncate">{goal.name}</div>
            {goal.streak > 0 && (
              <div className="flex items-center gap-1 text-[10.5px] font-semibold tabular-nums shrink-0 ml-2" style={{color: goal.color}}>
                <IconFlame size={11}/> {goal.streak}j
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-3)] mb-2">
            {goal.type === 'counter' && <span className="tabular-nums"><span className="font-semibold text-[var(--text-1)]">{goal.current}</span>/{goal.target} {goal.unit}{periodLabel}</span>}
            {goal.type === 'check'   && <span>{goal.current >= 1 ? 'Fait aujourd\u2019hui' : 'À faire'}{periodLabel}</span>}
            {goal.type === 'streak'  && <span className="tabular-nums">Cible série : <span className="font-semibold text-[var(--text-1)]">{goal.streak}</span>/{goal.target} {goal.unit}</span>}
            {goal.type === 'monthly' && <span className="tabular-nums"><span className="font-semibold text-[var(--text-1)]">{goal.current.toLocaleString('fr-FR')}</span>/{goal.target.toLocaleString('fr-FR')} {goal.unit}{periodLabel}</span>}
            {goal.reminder && <span className="ml-auto flex items-center gap-1"><IconClock size={9.5}/> {goal.reminder}</span>}
          </div>

          <div className="h-[5px] rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div className="h-full transition-all duration-300" style={{ width: `${pct*100}%`, background: goal.color }}></div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {goal.type === 'counter' && (
          <>
            <button onClick={() => inc(-1)} className="h-9 w-9 rounded-[10px] bg-[var(--surface-1)] grid place-items-center active:scale-90 transition-transform"><span className="text-[18px] text-[var(--text-2)] leading-none">−</span></button>
            <button onClick={() => inc(1)} className="flex-1 h-9 rounded-[10px] grid place-items-center active:scale-[.98] transition-transform text-[13px] font-semibold text-white" style={{ background: goal.color }}>+ 1 {goal.unit}</button>
          </>
        )}
        {goal.type === 'check' && (
          <button onClick={() => onUpdate(goal.id, { current: goal.current >= 1 ? 0 : 1 })} className="flex-1 h-9 rounded-[10px] grid place-items-center active:scale-[.98] transition-transform text-[13px] font-semibold" style={{ background: goal.current >= 1 ? goal.color : 'var(--surface-1)', color: goal.current >= 1 ? 'white' : 'var(--text-2)' }}>{goal.current >= 1 ? '✓ Fait' : 'Marquer fait'}</button>
        )}
        {goal.type === 'streak' && (
          <button onClick={() => onUpdate(goal.id, { streak: goal.streak + 1, current: 1 })} className="flex-1 h-9 rounded-[10px] grid place-items-center active:scale-[.98] transition-transform text-[13px] font-semibold text-white" style={{ background: goal.color }}><IconFlame size={12}/> &nbsp;Valider la journée</button>
        )}
        {goal.type === 'monthly' && (
          <>
            <button onClick={() => inc(-10)} className="h-9 px-3 rounded-[10px] bg-[var(--surface-1)] text-[12px] font-medium text-[var(--text-2)] active:scale-95">−10</button>
            <button onClick={() => inc(10)} className="h-9 px-3 rounded-[10px] text-[12px] font-medium text-white active:scale-95" style={{ background: goal.color }}>+10</button>
            <button onClick={() => inc(50)} className="flex-1 h-9 rounded-[10px] text-[12px] font-medium text-white active:scale-[.98]" style={{ background: goal.color, opacity: 0.85 }}>+ 50 {goal.unit}</button>
          </>
        )}
      </div>
    </div>
  );
}

function GoalEditor({ goal, onClose, onSave, onDelete }) {
  const isNew = !goal;
  const [draft, setDraft] = useState(goal || { emoji: '🎯', name: '', color: GOAL_COLORS[0], type: 'counter', unit: '', target: 1, period: 'day', current: 0, reminder: null, streak: 0 });
  const set = (patch) => setDraft(d => ({ ...d, ...patch }));

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 animate-[fadeIn_.18s_ease]" onClick={onClose}></div>
      <div className="fixed inset-x-0 bottom-0 top-12 bg-[var(--bg)] z-50 rounded-t-[20px] flex flex-col overflow-hidden animate-[slideUp_.28s_cubic-bezier(.2,.8,.2,1)] shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        <div className="flex justify-center pt-2.5 pb-1"><div className="h-1 w-9 rounded-full bg-[var(--line-strong)] opacity-60"></div></div>
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-[var(--line)]">
          <button onClick={onClose} className="text-[15px] text-[var(--text-2)]">Annuler</button>
          <div className="text-[14px] font-semibold tracking-[-0.005em]">{isNew ? 'Nouvel objectif' : 'Modifier'}</div>
          <button onClick={() => onSave(draft)} disabled={!draft.name.trim()} className={`text-[15px] font-semibold ${draft.name.trim() ? 'text-[var(--brand)]' : 'text-[var(--text-3)]'}`}>{isNew ? 'Créer' : 'OK'}</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div className="flex items-center gap-3">
            <details className="relative">
              <summary className="h-14 w-14 rounded-[16px] grid place-items-center text-[28px] cursor-pointer list-none active:scale-95 transition-transform" style={{ background: `${draft.color}18`, border: `1px solid ${draft.color}33` }}>{draft.emoji}</summary>
              <div className="absolute z-10 mt-1.5 w-[280px] bg-[var(--surface-0)] border border-[var(--line)] rounded-[12px] p-2 shadow-xl grid grid-cols-7 gap-1">
                {GOAL_EMOJIS.map(e => <button key={e} onClick={(ev) => { set({emoji: e}); ev.target.closest('details').open = false; }} className={`h-8 w-8 rounded-[8px] text-[18px] grid place-items-center active:scale-90 transition-transform ${draft.emoji === e ? 'bg-[var(--surface-1)]' : 'hover:bg-[var(--surface-1)]'}`}>{e}</button>)}
              </div>
            </details>
            <input type="text" value={draft.name} onChange={(e) => set({name: e.target.value})} placeholder="Nom de l'objectif" className="flex-1 bg-transparent text-[18px] font-semibold tracking-[-0.01em] text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none border-b border-[var(--line)] py-2"/>
          </div>

          <div>
            <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-2">Type</div>
            <div className="space-y-1.5">
              {TYPES.map(t => {
                const active = draft.type === t.id;
                return (
                  <button key={t.id} onClick={() => set({type: t.id})}
                    className={`w-full text-left p-3 rounded-[12px] border transition-all
                      ${active ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]' : 'bg-[var(--surface-0)] border-[var(--line)]'}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[14px] font-semibold ${active ? '' : 'text-[var(--text-1)]'}`}>{t.label}</span>
                      {active && <IconCheck size={14} strokeWidth={2.5}/>}
                    </div>
                    <div className={`text-[11.5px] ${active ? 'opacity-70' : 'text-[var(--text-3)]'}`}>{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-2">Couleur</div>
            <div className="flex flex-wrap gap-2 items-center">
              {GOAL_COLORS.map(c => <button key={c} onClick={() => set({color: c})} className={`h-9 w-9 rounded-full grid place-items-center transition-all active:scale-90 ${draft.color === c ? 'ring-2 ring-offset-2 ring-offset-[var(--bg)] ring-[var(--text-1)]' : ''}`} style={{background: c}}>{draft.color === c && <IconCheck size={13} strokeWidth={3} className="text-white"/>}</button>)}
              <label className="h-9 w-9 rounded-full cursor-pointer relative overflow-hidden border border-[var(--line)] grid place-items-center" style={{background: 'conic-gradient(from 0deg, #ef4444,#f59e0b,#84cc16,#06b6d4,#3b82f6,#a855f7,#ef4444)'}}>
                <input type="color" value={draft.color} onChange={(e) => set({color: e.target.value})} className="absolute inset-0 opacity-0 cursor-pointer"/>
              </label>
            </div>
          </div>

          {(draft.type === 'counter' || draft.type === 'monthly' || draft.type === 'streak') && (
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-2">Cible & unité</div>
              <div className="bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px] divide-y divide-[var(--line)]">
                <div className="flex items-center px-4 py-3 gap-3">
                  <span className="text-[14px] text-[var(--text-2)] w-16">Cible</span>
                  <input type="number" value={draft.target} onChange={(e) => set({target: Number(e.target.value) || 1})} className="flex-1 bg-transparent outline-none text-[14px] text-[var(--text-1)] tabular-nums text-right"/>
                </div>
                <div className="flex items-center px-4 py-3 gap-3">
                  <span className="text-[14px] text-[var(--text-2)] w-16">Unité</span>
                  <input type="text" value={draft.unit} onChange={(e) => set({unit: e.target.value})} placeholder="verres, min, km…" className="flex-1 bg-transparent outline-none text-[14px] text-[var(--text-1)] text-right placeholder:text-[var(--text-3)]"/>
                </div>
                <div className="flex items-center px-4 py-3 gap-3">
                  <span className="text-[14px] text-[var(--text-2)] w-16">Période</span>
                  <select value={draft.period} onChange={(e) => set({period: e.target.value})} className="flex-1 bg-transparent outline-none text-[14px] text-[var(--text-1)] text-right tabular-nums">
                    {GOAL_PERIODS.map(p => <option key={p.id} value={p.id}>{p.label.replace('/ ', 'Par ')}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-2">Rappel</div>
            <div className="bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px]">
              <div className="flex items-center px-4 py-3 gap-3">
                <span className="text-[14px] text-[var(--text-2)] flex-1">Heure quotidienne</span>
                <input type="time" value={draft.reminder || ''} onChange={(e) => set({reminder: e.target.value || null})} className="bg-transparent outline-none text-[14px] text-[var(--text-1)] tabular-nums"/>
                {draft.reminder && <button onClick={() => set({reminder: null})} className="text-[12px] text-[var(--brand)] font-medium">Effacer</button>}
              </div>
            </div>
          </div>

          {!isNew && <button onClick={() => onDelete(draft.id)} className="w-full bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px] py-3.5 text-[14px] font-medium text-[var(--brand)] active:bg-[var(--surface-1)]">Supprimer cet objectif</button>}
        </div>
      </div>
    </>
  );
}
