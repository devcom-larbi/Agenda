import { getISOWeek, getISOWeekYear, format, startOfISOWeek, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'

export function getWeekNumber(date) {
  return getISOWeek(date)
}

export function getWeekKey() {
  return getWeekKeyForOffset(0)
}

/**
 * Génère la clé de semaine pour un offset en semaines depuis aujourd'hui.
 * offset=0 → semaine courante, offset=-1 → semaine passée, offset=1 → semaine prochaine
 */
export function getWeekKeyForOffset(offset = 0) {
  const now = addDays(new Date(), offset * 7)
  const year = getISOWeekYear(now)
  const week = getISOWeek(now)
  return `week-${year}-W${String(week).padStart(2, '0')}`
}

export function getCurrentDayName() {
  return format(new Date(), 'EEEE', { locale: fr }).toLowerCase()
}

export function isCurrentDay(dayName, weekKey) {
  const isMatch = getCurrentDayName() === dayName;
  if (!weekKey) return isMatch;
  return isMatch && weekKey === getWeekKeyForOffset(0);
}

export function getTodayFormatted() {
  return format(new Date(), "EEEE d MMMM yyyy", { locale: fr })
}

/**
 * Retourne les dates réelles de la semaine courante.
 */
export function getWeekDates() {
  return getWeekDatesForKey(getWeekKey())
}

/**
 * Retourne les dates réelles de la semaine correspondant à la weekKey donnée.
 * Ex: "week-2026-W14" → { lundi: Date, mardi: Date, ... }
 */
export function getWeekDatesForKey(weekKey) {
  const match = weekKey.match(/week-(\d+)-W(\d+)/)
  if (!match) return getWeekDates()
  const year = parseInt(match[1])
  const week = parseInt(match[2])
  // Le 4 janvier est toujours dans la semaine 1 de l'année ISO
  const jan4 = new Date(year, 0, 4)
  const mondayOfWeek1 = startOfISOWeek(jan4)
  const monday = addDays(mondayOfWeek1, (week - 1) * 7)
  return {
    lundi:    monday,
    mardi:    addDays(monday, 1),
    mercredi: addDays(monday, 2),
    jeudi:    addDays(monday, 3),
    vendredi: addDays(monday, 4),
    samedi:   addDays(monday, 5),
    dimanche: addDays(monday, 6),
  }
}

export function formatShortDate(date) {
  return format(date, 'd MMM', { locale: fr })
}

/**
 * Calcule l'offset en semaines entre aujourd'hui et une weekKey donnée.
 * Ex: la semaine prochaine → +1, semaine passée → -1
 */
export function getWeekKeyForDate(date) {
  const year = getISOWeekYear(date)
  const week = getISOWeek(date)
  return `week-${year}-W${String(week).padStart(2, '0')}`
}

const DAY_NAMES_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

export function getDayNameForDate(date) {
  return DAY_NAMES_FR[date.getDay()]
}

export function getOffsetForWeekKey(weekKey) {
  const currentKey = getWeekKeyForOffset(0)
  if (weekKey === currentKey) return 0
  const match = weekKey.match(/week-(\d+)-W(\d+)/)
  if (!match) return 0
  const year = parseInt(match[1])
  const week = parseInt(match[2])
  const jan4 = new Date(year, 0, 4)
  const mondayOfWeek1 = startOfISOWeek(jan4)
  const targetMonday = addDays(mondayOfWeek1, (week - 1) * 7)
  const todayMonday = startOfISOWeek(new Date())
  return Math.round((targetMonday - todayMonday) / (7 * 24 * 60 * 60 * 1000))
}
