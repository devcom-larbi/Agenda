import React from 'react';
import { Calendar, List, Target, BarChart2, Search, Sun, Moon, Settings, Hexagon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PlanningSwitcher from './PlanningSwitcher';

export default function DesktopSidebar({ activeView, onChange, schedule, dark, onToggleDark, onSearch, user }) {
  const navigate = useNavigate();
  const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const total = DAYS_ORDER.reduce((acc, d) => acc + (schedule[d]?.blocks?.length || 0), 0);
  const done = DAYS_ORDER.reduce((acc, d) => acc + (schedule[d]?.blocks?.filter(b=>b.done)?.length || 0), 0);
  const displayName = (user?.email ? user.email.split('@')[0] : 'Mon compte');
  const initials = displayName.slice(0, 2).toUpperCase();
  
  const items = [
    { id: 'day',       label: "Aujourd'hui", icon: Calendar },
    { id: 'panorama',  label: 'Semaine',     icon: List },
    { id: 'objectifs', label: 'Objectifs',   icon: Target },
    { id: 'bilan',     label: 'Bilan',       icon: BarChart2 },
  ];

  return (
    <aside className="hidden lg:flex w-[244px] shrink-0 h-full flex-col border-r border-[var(--line)] bg-[var(--surface-1)]">
      {/* Logo + sélecteur de planning */}
      <div className="px-3 pt-4 pb-3 flex items-center gap-1.5">
        <Hexagon size={20} className="text-[var(--text-1)] shrink-0" />
        <div className="flex-1 min-w-0">
          <PlanningSwitcher />
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <button onClick={onSearch} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[7px] bg-transparent hover:bg-[var(--surface-2)] text-[12.5px] text-[var(--text-3)] transition-colors">
          <Search size={14} />
          <span className="flex-1 text-left">Rechercher</span>
          <span className="text-[10.5px] tabular-nums tracking-tight px-1.5 py-0.5 rounded border border-[var(--line)] bg-[var(--bg)] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">⌘K</span>
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
              <Ico size={15} strokeWidth={active ? 2 : 1.6} />
              <span className="flex-1 text-left tracking-[-0.005em]">{it.label}</span>
            </button>
          );
        })}
      </nav>

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
          <button onClick={() => navigate('/settings')} className="flex items-center gap-2 px-2 py-1 rounded-[6px] hover:bg-[var(--surface-2)] transition-colors group min-w-0" aria-label="Mon compte">
            <div className="h-6 w-6 rounded-full bg-[var(--ink)] text-[var(--bg)] grid place-items-center text-[10px] font-semibold shrink-0">{initials}</div>
            <span className="text-[12px] text-[var(--text-2)] group-hover:text-[var(--text-1)] truncate capitalize">{displayName}</span>
          </button>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={onToggleDark} className="p-1.5 rounded-[6px] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)]" aria-label="Thème">
              {dark ? <Sun size={14}/> : <Moon size={14}/>}
            </button>
            <button onClick={() => navigate('/settings')} className="p-1.5 rounded-[6px] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)]" aria-label="Réglages">
              <Settings size={14}/>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
