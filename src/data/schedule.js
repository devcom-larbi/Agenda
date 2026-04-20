/**
 * schedule.js — Données fixes de l'agenda hebdomadaire
 */

export const CATEGORY_COLORS = {
  sommeil:  "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  coran:    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800",
  learning: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
  clients:  "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800",
  salam:    "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-800",
  sport:    "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800",
  school:   "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800",
  work:     "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/60 dark:text-gray-300 dark:border-gray-600",
  rest:     "bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700",
}

export const DEFAULT_CATEGORY_COLORS = {
  sommeil:  '#3b82f6',
  coran:    '#8b5cf6',
  learning: '#f59e0b',
  clients:  '#f97316',
  salam:    '#ec4899',
  sport:    '#6366f1',
  school:   '#0ea5e9',
  work:     '#64748b',
  rest:     '#94a3b8',
}

export const COLOR_SWATCHES = [
  { id: 'none',   hex: null,      label: 'Défaut' },
  { id: 'red',    hex: '#ef4444', label: 'Rouge' },
  { id: 'orange', hex: '#f97316', label: 'Orange' },
  { id: 'amber',  hex: '#f59e0b', label: 'Jaune' },
  { id: 'green',  hex: '#22c55e', label: 'Vert' },
  { id: 'teal',   hex: '#14b8a6', label: 'Teal' },
  { id: 'blue',   hex: '#3b82f6', label: 'Bleu' },
  { id: 'indigo', hex: '#6366f1', label: 'Indigo' },
  { id: 'violet', hex: '#8b5cf6', label: 'Violet' },
  { id: 'pink',   hex: '#ec4899', label: 'Rose' },
  { id: 'slate',  hex: '#64748b', label: 'Ardoise' },
]

export const CATEGORY_LABELS = {
  sommeil:  "Sommeil",
  coran:    "Coran & Dhikr",
  learning: "Apprentissage",
  clients:  "Clients Altiseo",
  salam:    "Dev App",
  sport:    "Sport",
  school:   "École",
  work:     "Travail",
  rest:     "Repos & Repas",
}

export const WEEKLY_SCHEDULE = {
  lundi: {
    label: "Lundi",
    type: "École + Push",
    blocks: [
      { id: "lun-0", time: "22h → 5h30", label: "Sommeil (7h30)", category: "sommeil", done: false },
      { id: "lun-1", time: "5h30 – 6h15", label: "Fajr + Coran", category: "coran", done: false },
      { id: "lun-2", time: "6h15 – 8h20", label: "Apprentissage (2h05)", category: "learning", done: false },
      { id: "lun-3", time: "8h20 – 9h00", label: "Trajet Aller (Dhikr)", category: "coran", done: false },
      { id: "lun-4", time: "9h – 17h", label: "École", category: "school", done: false },
      { id: "lun-x", time: "17h00 – 17h20", label: "Trajet Salle (Dhikr)", category: "coran", done: false },
      { id: "lun-5", time: "17h20 – 18h40", label: "Sport: PUSH (1h20)", category: "sport", done: false },
      { id: "lun-y", time: "18h40 – 19h00", label: "Trajet Maison (Dhikr)", category: "coran", done: false },
      { id: "lun-6", time: "19h00 – 20h00", label: "Clients Altiseo (1h)", category: "clients", done: false },
      { id: "lun-7", time: "20h00 – 21h30", label: "Apprentissage (1h30)", category: "learning", done: false },
      { id: "lun-8", time: "21h30", label: "Repas OMAD", category: "rest", done: false },
    ],
  },
  mardi: {
    label: "Mardi",
    type: "École + Pull",
    blocks: [
      { id: "mar-0", time: "22h → 5h30", label: "Sommeil (7h30)", category: "sommeil", done: false },
      { id: "mar-1", time: "5h30 – 6h15", label: "Fajr + Coran", category: "coran", done: false },
      { id: "mar-2", time: "6h15 – 8h20", label: "Dev App (2h05)", category: "salam", done: false },
      { id: "mar-3", time: "8h20 – 9h00", label: "Trajet Aller (Dhikr)", category: "coran", done: false },
      { id: "mar-4", time: "9h – 17h", label: "École", category: "school", done: false },
      { id: "mar-x", time: "17h00 – 17h20", label: "Trajet Salle (Dhikr)", category: "coran", done: false },
      { id: "mar-5", time: "17h20 – 18h40", label: "Sport: PULL (1h20)", category: "sport", done: false },
      { id: "mar-y", time: "18h40 – 19h00", label: "Trajet Maison (Dhikr)", category: "coran", done: false },
      { id: "mar-7", time: "19h00 – 21h30", label: "Apprentissage (2h30)", category: "learning", done: false },
      { id: "mar-8", time: "21h30", label: "Repas OMAD", category: "rest", done: false },
    ],
  },
  mercredi: {
    label: "Mercredi",
    type: "Travail",
    blocks: [
      { id: "mer-0", time: "22h → 5h30", label: "Sommeil (7h30)", category: "sommeil", done: false },
      { id: "mer-1", time: "5h30 – 6h15", label: "Fajr + Coran", category: "coran", done: false },
      { id: "mer-2", time: "6h15 – 9h20", label: "Clients Altiseo (3h05)", category: "clients", done: false },
      { id: "mer-3", time: "9h20 – 10h00", label: "Trajet Aller (Dhikr)", category: "coran", done: false },
      { id: "mer-4", time: "10h – 19h30", label: "Travail (Pause 2h30)", category: "work", done: false },
      { id: "mer-6", time: "19h30 – 20h30", label: "Trajet Retour (Dhikr)", category: "coran", done: false },
      { id: "mer-7", time: "20h30 – 21h30", label: "Temps Libre (1h)", category: "rest", done: false },
      { id: "mer-8", time: "21h30", label: "Repas OMAD", category: "rest", done: false },
    ],
  },
  jeudi: {
    label: "Jeudi",
    type: "Travail + Legs",
    blocks: [
      { id: "jeu-0", time: "22h → 5h30", label: "Sommeil (7h30)", category: "sommeil", done: false },
      { id: "jeu-1", time: "5h30 – 6h15", label: "Fajr + Coran", category: "coran", done: false },
      { id: "jeu-2", time: "6h15 – 9h20", label: "Apprentissage (3h05)", category: "learning", done: false },
      { id: "jeu-3", time: "9h20 – 10h00", label: "Trajet Aller (Dhikr)", category: "coran", done: false },
      { id: "jeu-4", time: "10h – 19h30", label: "Travail (Pause 2h30)", category: "work", done: false },
      { id: "jeu-x", time: "19h30 – 19h50", label: "Trajet Salle (Dhikr)", category: "coran", done: false },
      { id: "jeu-6", time: "19h50 – 20h35", label: "Sport: LEGS (45m)", category: "sport", done: false },
      { id: "jeu-y", time: "20h35 – 20h55", label: "Trajet Maison (Dhikr)", category: "coran", done: false },
      { id: "jeu-7", time: "20h55 – 21h30", label: "Temps Libre (35m)", category: "rest", done: false },
      { id: "jeu-8", time: "21h30", label: "Repas OMAD", category: "rest", done: false },
    ],
  },
  vendredi: {
    label: "Vendredi",
    type: "Travail",
    blocks: [
      { id: "ven-0", time: "22h → 5h30", label: "Sommeil (7h30)", category: "sommeil", done: false },
      { id: "ven-1", time: "5h30 – 6h15", label: "Fajr + Coran", category: "coran", done: false },
      { id: "ven-2", time: "6h15 – 9h20", label: "Clients Altiseo (3h05)", category: "clients", done: false },
      { id: "ven-3", time: "9h20 – 10h00", label: "Trajet Aller (Dhikr)", category: "coran", done: false },
      { id: "ven-4", time: "10h – 19h30", label: "Travail (Pause 2h30)", category: "work", done: false },
      { id: "ven-6", time: "19h30 – 20h30", label: "Trajet Retour (Dhikr)", category: "coran", done: false },
      { id: "ven-7", time: "20h30 – 21h30", label: "Libre / Famille (1h)", category: "rest", done: false },
      { id: "ven-8", time: "21h30", label: "Repas OMAD", category: "rest", done: false },
    ],
  },
  samedi: {
    label: "Samedi",
    type: "Travail",
    blocks: [
      { id: "sam-0", time: "22h → 5h30", label: "Sommeil (7h30)", category: "sommeil", done: false },
      { id: "sam-1", time: "5h30 – 6h15", label: "Fajr + Coran", category: "coran", done: false },
      { id: "sam-2", time: "6h15 – 9h20", label: "Apprentissage (3h05)", category: "learning", done: false },
      { id: "sam-3", time: "9h20 – 10h00", label: "Trajet Aller (Dhikr)", category: "coran", done: false },
      { id: "sam-4", time: "10h – 19h30", label: "Travail (Pause 2h30)", category: "work", done: false },
      { id: "sam-6", time: "19h30 – 20h30", label: "Trajet Retour (Dhikr)", category: "coran", done: false },
      { id: "sam-7", time: "20h30 – 21h30", label: "Temps Libre (1h)", category: "rest", done: false },
      { id: "sam-8", time: "21h30", label: "Repas OMAD", category: "rest", done: false },
    ],
  },
  dimanche: {
    label: "Dimanche",
    type: "Travail 15h30",
    blocks: [
      { id: "dim-0", time: "22h → 5h30", label: "Sommeil (7h30)", category: "sommeil", done: false },
      { id: "dim-1", time: "5h30 – 6h15", label: "Fajr + Coran", category: "coran", done: false },
      { id: "dim-2", time: "6h15 – 7h10", label: "Dev App (55m)", category: "salam", done: false },
      { id: "dim-3", time: "7h10 – 8h05", label: "Clients Altiseo (55m)", category: "clients", done: false },
      { id: "dim-4", time: "8h05 – 14h50", label: "Temps Libre (6h45)", category: "rest", done: false },
      { id: "dim-5", time: "14h50 – 15h30", label: "Trajet Aller (Dhikr)", category: "coran", done: false },
      { id: "dim-6", time: "15h30 – 19h", label: "Travail", category: "work", done: false },
      { id: "dim-y", time: "19h00 – 20h00", label: "Trajet Retour (Dhikr)", category: "coran", done: false },
      { id: "dim-7", time: "20h00 – 21h30", label: "Temps Libre (1h30)", category: "rest", done: false },
      { id: "dim-8", time: "21h30", label: "Repas OMAD", category: "rest", done: false },
    ],
  },
}

export const DAYS_ORDER = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
