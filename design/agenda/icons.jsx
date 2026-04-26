// === ICONS — minimaliste, trait fin façon Lucide/SF Symbols ===
const Icon = ({ d, size = 18, stroke = 1.5, fill = 'none', children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {children || <path d={d} />}
  </svg>
);
const IconCheck     = (p) => <Icon {...p} d="M4 12l5 5L20 6" />;
const IconChevronL  = (p) => <Icon {...p} d="M15 6l-6 6 6 6" />;
const IconChevronR  = (p) => <Icon {...p} d="M9 6l6 6-6 6" />;
const IconChevronD  = (p) => <Icon {...p} d="M6 9l6 6 6-6" />;
const IconPlus      = (p) => <Icon {...p} d="M12 5v14M5 12h14" />;
const IconSearch    = (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Icon>;
const IconSettings  = (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Icon>;
const IconSparkle   = (p) => <Icon {...p}><path d="M12 3v18M3 12h18"/><path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/></Icon>;
const IconCalendar  = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></Icon>;
const IconList      = (p) => <Icon {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></Icon>;
const IconTarget    = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></Icon>;
const IconChart     = (p) => <Icon {...p}><path d="M3 3v18h18"/><path d="M7 14l3-3 4 4 5-6"/></Icon>;
const IconMoon      = (p) => <Icon {...p} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />;
const IconSun       = (p) => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></Icon>;
const IconDots      = (p) => <Icon {...p}><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></Icon>;
const IconArrowR    = (p) => <Icon {...p} d="M5 12h14M13 6l6 6-6 6" />;
const IconClock     = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>;
const IconFlame     = (p) => <Icon {...p} d="M12 2s4 4 4 9a4 4 0 0 1-8 0c0-2 1-3 1-3s-1 4 1 5c0-3 2-4 2-7zM12 14a3 3 0 0 1 0 6 3 3 0 0 1 0-6z" />;
const IconClose     = (p) => <Icon {...p} d="M18 6L6 18M6 6l12 12" />;
const IconNote      = (p) => <Icon {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 13h6M9 17h4"/></Icon>;
const IconRepeat    = (p) => <Icon {...p} d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" />;
const IconLogo      = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" opacity="0.08"/>
    <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M8 8.5h8M8 12h5M8 15.5h6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

Object.assign(window, {
  IconCheck, IconChevronL, IconChevronR, IconChevronD, IconPlus, IconSearch, IconSettings,
  IconSparkle, IconCalendar, IconList, IconTarget, IconChart, IconMoon, IconSun, IconDots,
  IconArrowR, IconClock, IconFlame, IconClose, IconNote, IconRepeat, IconLogo,
});
