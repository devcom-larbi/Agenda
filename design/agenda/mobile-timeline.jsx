// === Mobile Timeline View — façon Apple Calendar ===
const { useEffect: useEffectMT, useRef: useRefMT } = React;

function MobileTimeline({ schedule, dayKey, onSelect, onToggle, isToday }) {
  const day = schedule[dayKey];
  const blocks = day?.blocks || [];
  const HOUR_H = 56;
  const HOUR_START = 5;
  const HOUR_END = 23;
  const hours = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);

  const now = new Date();
  const liveMin = now.getHours() * 60 + now.getMinutes();
  const showNow = isToday && liveMin >= HOUR_START*60 && liveMin <= HOUR_END*60;

  // Auto-scroll vers maintenant
  const scrollRef = useRefMT(null);
  useEffectMT(() => {
    if (showNow && scrollRef.current) {
      const top = ((liveMin - HOUR_START*60) / 60) * HOUR_H - 200;
      scrollRef.current.scrollTop = Math.max(top, 0);
    }
  }, []);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto pb-32">
      <div className="px-3 pt-2">
        <div className="grid relative" style={{ gridTemplateColumns: '46px 1fr', gap: 0 }}>
          {/* Colonne heures */}
          <div>
            {hours.map((h) => (
              <div key={h} className="text-[10px] tabular-nums text-[var(--text-3)] font-medium -mt-1.5 pr-2 text-right" style={{ height: HOUR_H }}>
                {h.toString().padStart(2,'0')}:00
              </div>
            ))}
          </div>
          {/* Pile */}
          <div className="relative border-l border-[var(--line)]">
            {hours.map((h) => (
              <div key={h} className="border-b border-[var(--line)]/60" style={{ height: HOUR_H }}></div>
            ))}
            {/* Ligne maintenant */}
            {showNow && (
              <div className="absolute left-0 right-0 pointer-events-none z-20" style={{ top: ((liveMin - HOUR_START*60)/60)*HOUR_H }}>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-[var(--accent)] -ml-1 ring-2 ring-[var(--bg)]"></div>
                  <div className="h-[1.5px] flex-1 bg-[var(--accent)]"></div>
                </div>
              </div>
            )}
            {/* Blocs */}
            <div className="absolute inset-0">
              {blocks.map((b) => {
                const { start, end } = window.parseTime(b.time);
                if (start < HOUR_START*60 || start > HOUR_END*60) return null;
                const top = ((start - HOUR_START*60) / 60) * HOUR_H;
                const height = Math.max(32, ((end - start)/60) * HOUR_H - 4);
                const cat = window.CATEGORIES[b.category];
                return (
                  <button key={b.id} onClick={() => onSelect(b)}
                    className={`absolute left-1.5 right-1.5 text-left rounded-[10px] px-2.5 py-1.5 transition-all active:scale-[0.98]
                      ${b.done ? 'opacity-55' : ''}`}
                    style={{
                      top: top + 2, height,
                      background: b.done ? 'var(--surface-1)' : 'var(--surface-0)',
                      border: '1px solid var(--line)',
                      borderLeft: `3px solid ${cat.dot}`,
                    }}>
                    <div className={`text-[12.5px] font-medium tracking-[-0.005em] truncate leading-tight
                      ${b.done ? 'line-through text-[var(--text-2)]' : 'text-[var(--text-1)]'}`}>
                      {b.label}
                    </div>
                    {height > 42 && (
                      <div className="text-[10px] tabular-nums text-[var(--text-3)] mt-0.5 truncate leading-tight">
                        {window.fmtRange(b.time)}
                      </div>
                    )}
                    {height > 64 && b.note && (
                      <div className="text-[10px] text-[var(--text-3)] mt-0.5 truncate opacity-80">{b.note}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Settings Screen — full sheet iOS style ───────────────
function MobileSettings({ open, onClose, settings, onChange }) {
  if (!open) return null;
  const Row = ({ icon, label, right, onClick, danger, last }) => {
    const Ico = icon;
    const Tag = onClick ? 'button' : 'div';
    return (
      <Tag onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 ${onClick ? 'active:bg-[var(--surface-1)]' : ''} ${!last ? 'border-b border-[var(--line)]' : ''}`}>
        {Ico && <div className="h-7 w-7 rounded-[7px] grid place-items-center shrink-0" style={{background: 'var(--surface-2)', color: danger ? 'var(--accent)' : 'var(--text-2)'}}><Ico size={14}/></div>}
        <span className={`flex-1 text-left text-[15px] ${danger ? 'text-[var(--accent)]' : 'text-[var(--text-1)]'}`}>{label}</span>
        {right}
      </Tag>
    );
  };
  const Section = ({ title, children }) => (
    <div className="mb-6">
      <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-2 px-5">{title}</div>
      <div className="bg-[var(--surface-0)] mx-3 rounded-[14px] border border-[var(--line)] overflow-hidden">
        {children}
      </div>
    </div>
  );
  const Switch = ({ on, onClick }) => (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`relative h-[28px] w-[46px] rounded-full transition-colors duration-200 shrink-0 ${on ? 'bg-[var(--ink)]' : 'bg-[var(--surface-2)]'}`}>
      <span className={`absolute top-[2px] left-[2px] h-[24px] w-[24px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-200 ${on ? 'translate-x-[18px]' : ''}`}></span>
    </button>
  );

  const ACCENTS = [
    { id:'amber', color:'#B45309', label:'Ambre' },
    { id:'blue', color:'#1D4ED8', label:'Bleu' },
    { id:'green', color:'#15803D', label:'Vert' },
    { id:'graphite', color:'#0A0A0A', label:'Encre' },
  ];

  return (
    <>
      <div className="absolute inset-0 bg-black/30 z-40 animate-[fadeIn_.18s_ease]" onClick={onClose}></div>
      <div className="absolute inset-x-0 bottom-0 top-8 bg-[var(--surface-1)] z-50 rounded-t-[20px] flex flex-col overflow-hidden animate-[slideUp_.28s_cubic-bezier(.2,.8,.2,1)]">
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="h-1 w-9 rounded-full bg-[var(--line-strong)]/60"></div>
        </div>
        <div className="flex items-center justify-between px-5 py-2.5 shrink-0">
          <div className="w-12"></div>
          <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Paramètres</h2>
          <button onClick={onClose} className="text-[15px] text-[var(--accent)] font-semibold w-12 text-right">OK</button>
        </div>

        <div className="flex-1 overflow-y-auto pb-8">
          {/* Profil */}
          <div className="mb-6 px-3">
            <div className="bg-[var(--surface-0)] rounded-[14px] border border-[var(--line)] p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[var(--ink)] text-[var(--bg)] grid place-items-center text-[16px] font-semibold tracking-tight">YA</div>
              <div className="flex-1 min-w-0">
                <div className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--text-1)]">Yacine</div>
                <div className="text-[12.5px] text-[var(--text-3)] truncate">yacine@altiseo.com</div>
              </div>
              <button className="text-[13px] font-medium text-[var(--accent)]">Modifier</button>
            </div>
          </div>

          <Section title="Apparence">
            <Row icon={IconMoon} label="Mode sombre"
              right={<Switch on={settings.dark} onClick={() => onChange({ dark: !settings.dark })} />} />
            <Row icon={IconSun} label="Suivre le système"
              right={<Switch on={settings.followSystem} onClick={() => onChange({ followSystem: !settings.followSystem })} />} />
            <div className="px-4 py-3.5 last:border-b-0 border-b border-[var(--line)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-7 w-7 rounded-[7px] grid place-items-center shrink-0 bg-[var(--surface-2)] text-[var(--text-2)]"><IconSparkle size={13}/></div>
                <span className="text-[15px] text-[var(--text-1)] flex-1">Couleur d'accent</span>
              </div>
              <div className="flex gap-2 ml-10">
                {ACCENTS.map(a => (
                  <button key={a.id} onClick={() => onChange({ accent: a.id })}
                    className={`h-9 w-9 rounded-full grid place-items-center transition-all active:scale-90 ${settings.accent === a.id ? 'ring-2 ring-offset-2 ring-offset-[var(--surface-0)]' : ''}`}
                    style={{ background: a.color, '--tw-ring-color': a.color }}>
                    {settings.accent === a.id && <IconCheck size={13} stroke={3} />}
                  </button>
                ))}
              </div>
            </div>
            <Row icon={IconCalendar} label="Vue par défaut"
              right={<span className="text-[14px] text-[var(--text-3)] flex items-center gap-1">{settings.defaultView === 'timeline' ? 'Timeline' : 'Liste'} <IconChevronR size={13} className="text-[var(--text-3)]/60"/></span>}
              onClick={() => onChange({ defaultView: settings.defaultView === 'timeline' ? 'list' : 'timeline' })} last />
          </Section>

          <Section title="Notifications">
            <Row icon={IconClock} label="Rappels avant un bloc"
              right={<Switch on={settings.notifyReminders} onClick={() => onChange({ notifyReminders: !settings.notifyReminders })} />} />
            <Row icon={IconFlame} label="Bilan quotidien · 22h"
              right={<Switch on={settings.notifyReview} onClick={() => onChange({ notifyReview: !settings.notifyReview })} />} />
            <Row icon={IconTarget} label="Suggestions Tempo"
              right={<Switch on={settings.notifyTempo} onClick={() => onChange({ notifyTempo: !settings.notifyTempo })} />} last />
          </Section>

          <Section title="Coach Tempo">
            <Row icon={IconSparkle} label="Suggérer automatiquement"
              right={<Switch on={settings.aiAuto} onClick={() => onChange({ aiAuto: !settings.aiAuto })} />} />
            <Row icon={IconRepeat} label="Apprendre de mes habitudes"
              right={<Switch on={settings.aiLearn} onClick={() => onChange({ aiLearn: !settings.aiLearn })} />} last />
          </Section>

          <Section title="Données">
            <Row icon={IconCalendar} label="Synchroniser avec iCloud"
              right={<span className="text-[13px] text-[var(--text-3)]">Activé</span>} />
            <Row icon={IconNote} label="Exporter mon agenda"
              right={<IconChevronR size={14} className="text-[var(--text-3)]/60"/>} />
            <Row icon={IconList} label="Importer depuis Notion"
              right={<IconChevronR size={14} className="text-[var(--text-3)]/60"/>} last />
          </Section>

          <Section title="À propos">
            <Row icon={IconLogo ? () => <IconLogo size={14}/> : IconCalendar} label="Version"
              right={<span className="text-[13px] text-[var(--text-3)]">2.4.0</span>} />
            <Row icon={IconNote} label="Conditions d'utilisation"
              right={<IconChevronR size={14} className="text-[var(--text-3)]/60"/>} />
            <Row icon={IconNote} label="Politique de confidentialité"
              right={<IconChevronR size={14} className="text-[var(--text-3)]/60"/>} last />
          </Section>

          <div className="mx-3 mb-6">
            <div className="bg-[var(--surface-0)] rounded-[14px] border border-[var(--line)] overflow-hidden">
              <Row icon={IconClose} label="Se déconnecter" danger last />
            </div>
          </div>

          <div className="text-center text-[11px] text-[var(--text-3)] pb-4">
            Agenda · 2026
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { MobileTimeline, MobileSettings });
