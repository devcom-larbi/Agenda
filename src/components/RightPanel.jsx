import React from 'react';
import { Flame } from 'lucide-react';
import { useCategories } from '../contexts/CategoriesContext';
import { DAYS_ORDER } from '../data/schedule';

export default function RightPanel({ schedule, currentDayKey }) {
  const { getCategoryDetails } = useCategories();
  
  const day = schedule[currentDayKey] || { blocks: [], label: currentDayKey };
  const blocks = day.blocks || [];
  const done = blocks.filter(b=>b.done).length;
  const total = blocks.length;
  const pct = total ? Math.round((done/total)*100) : 0;

  // breakdown by category
  const byCat = {};
  DAYS_ORDER.forEach(d => {
    const dBlocks = schedule[d]?.blocks || [];
    dBlocks.forEach(b => {
      if (!byCat[b.category]) byCat[b.category] = { total: 0, done: 0 };
      byCat[b.category].total++;
      if (b.done) byCat[b.category].done++;
    });
  });
  const cats = Object.entries(byCat)
    .sort((a,b) => b[1].total - a[1].total)
    .slice(0, 5);

  return (
    <aside className="w-[300px] shrink-0 hidden xl:flex flex-col border-l border-[var(--line)] bg-[var(--bg)] transition-all animate-in slide-in-from-right-8 duration-300">
      {/* Today summary */}
      <div className="p-6 border-b border-[var(--line)]">
        <div className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--text-3)] mb-3">Aujourd'hui</div>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-[40px] font-medium tabular-nums tracking-[-0.04em] text-[var(--text-1)] leading-none">{pct}<span className="text-[20px] text-[var(--text-3)]">%</span></span>
        </div>
        <div className="h-[3px] rounded-full bg-[var(--surface-2)] overflow-hidden mb-2">
          <div className="h-full bg-[var(--ink)] transition-all duration-700" style={{width: `${pct}%`}}></div>
        </div>
        <div className="text-[11.5px] text-[var(--text-3)] tabular-nums">{done} sur {total} blocs {day.type ? `· ${day.type}` : ''}</div>
      </div>

      {/* Streak */}
      <div className="p-6 border-b border-[var(--line)]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--text-3)]">Série</span>
          <Flame size={14} className="text-[var(--accent)]" />
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
            const cat = getCategoryDetails(key);
            if (!cat) return null;
            const pc = v.total ? Math.round((v.done/v.total)*100) : 0;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{background: cat.color || cat.dot || 'var(--text-1)'}}></span>
                    <span className="text-[12.5px] text-[var(--text-2)] truncate">{cat.label}</span>
                  </div>
                  <span className="text-[11px] tabular-nums text-[var(--text-3)]">{v.done}/{v.total}</span>
                </div>
                <div className="h-[2px] rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className="h-full transition-all duration-700" style={{width: `${pc}%`, background: cat.color || cat.dot || 'var(--text-1)'}}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
