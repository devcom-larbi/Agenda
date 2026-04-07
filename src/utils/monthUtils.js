/**
 * monthUtils.js — Fonctions pour la vue mensuelle
 *
 * Permet de retrouver toutes les semaines d'un mois donné,
 * de charger leurs données depuis localStorage, et de calculer
 * le récap mensuel.
 */

import { startOfMonth, endOfMonth, addDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getISOWeek, getISOWeekYear, startOfISOWeek, endOfISOWeek } from 'date-fns'
import { WEEKLY_SCHEDULE, DAYS_ORDER } from '../data/schedule'

/**
 * Retourne toutes les clés de semaine (ex: "week-2026-W14") qui ont
 * au moins un jour dans le mois de la date donnée.
 *
 * @param {Date} date — n'importe quelle date dans le mois ciblé
 * @returns {string[]} tableau de clés triées chronologiquement
 */
export function getWeekKeysForMonth(date) {
  const start = startOfMonth(date)
  const end = endOfMonth(date)

  const weekKeys = new Set()
  let current = start

  // On avance jour par jour et on collecte les clés de semaine uniques
  while (current <= end) {
    const year = getISOWeekYear(current)
    const week = getISOWeek(current)
    weekKeys.add(`week-${year}-W${String(week).padStart(2, '0')}`)
    current = addDays(current, 1)
  }

  return [...weekKeys].sort()
}

/**
 * Pour une clé de semaine donnée, retourne la plage de dates affichable.
 * Exemple : "week-2026-W14" → "30 mars – 5 avr. 2026"
 *
 * @param {string} weekKey — ex: "week-2026-W14"
 * @returns {string} plage de dates formatée
 */
export function getWeekDateRange(weekKey) {
  // On reconstruit la date du lundi de cette semaine ISO
  const match = weekKey.match(/week-(\d+)-W(\d+)/)
  if (!match) return weekKey

  const year = parseInt(match[1])
  const week = parseInt(match[2])

  // Le 4 janvier est toujours dans la semaine 1 de l'année ISO
  // On part de là pour calculer le lundi de la semaine voulue
  const jan4 = new Date(year, 0, 4)
  const startOfWeek1 = startOfISOWeek(jan4)
  const monday = addDays(startOfWeek1, (week - 1) * 7)
  const sunday = endOfISOWeek(monday)

  const formatDay = (d) => format(d, 'd MMM', { locale: fr })
  const formatDayYear = (d) => format(d, 'd MMM yyyy', { locale: fr })

  return `${formatDay(monday)} – ${formatDayYear(sunday)}`
}

/**
 * Extrait le numéro de semaine depuis une clé.
 * "week-2026-W14" → 14
 *
 * @param {string} weekKey
 * @returns {number}
 */
export function getWeekNumberFromKey(weekKey) {
  const match = weekKey.match(/W(\d+)/)
  return match ? parseInt(match[1]) : 0
}

/**
 * Charge les données d'une semaine depuis localStorage.
 * Si la semaine n'a pas de données, retourne null.
 *
 * @param {string} weekKey
 * @returns {Object|null} le planning de la semaine, ou null
 */
export function loadWeekFromStorage(weekKey) {
  const saved = localStorage.getItem(weekKey)
  if (!saved) return null
  try {
    return JSON.parse(saved)
  } catch {
    return null
  }
}

/**
 * Calcule les statistiques de complétion d'un planning de semaine.
 * Même logique que dans useWeekStorage mais utilisable hors du hook.
 *
 * @param {Object} schedule — le planning de la semaine
 * @returns {{ total: number, done: number, percentage: number }}
 */
export function computeWeekStats(schedule) {
  let total = 0
  let done = 0

  for (const dayName of DAYS_ORDER) {
    const day = schedule[dayName]
    if (!day) continue
    for (const block of day.blocks) {
      total++
      if (block.done) done++
    }
  }

  const percentage = total === 0 ? 0 : Math.round((done / total) * 100)
  return { total, done, percentage }
}

/**
 * Retourne le nom du mois formaté pour l'affichage.
 * Exemple : new Date() → "Avril 2026"
 *
 * @param {Date} date
 * @returns {string}
 */
export function getMonthLabel(date) {
  return format(date, 'MMMM yyyy', { locale: fr })
}

/**
 * Calcule le récap mensuel complet pour une date donnée.
 * Parcourt toutes les semaines du mois et charge leurs données.
 *
 * @param {Date} date — n'importe quelle date dans le mois
 * @returns {{
 *   monthLabel: string,
 *   weeks: Array<{ key, weekNumber, dateRange, stats, hasData }>,
 *   monthlyPercentage: number,
 *   totalDone: number,
 *   totalBlocks: number
 * }}
 */
export function computeMonthRecap(date) {
  const weekKeys = getWeekKeysForMonth(date)

  let totalDone = 0
  let totalBlocks = 0
  let weeksWithData = 0

  const weeks = weekKeys.map((key) => {
    const savedSchedule = loadWeekFromStorage(key)

    if (savedSchedule) {
      const stats = computeWeekStats(savedSchedule)
      totalDone += stats.done
      totalBlocks += stats.total
      weeksWithData++
      return {
        key,
        weekNumber: getWeekNumberFromKey(key),
        dateRange: getWeekDateRange(key),
        stats,
        hasData: true,
      }
    }

    // Semaine sans données → on calcule le total théorique depuis WEEKLY_SCHEDULE
    const theoreticalStats = computeWeekStats(WEEKLY_SCHEDULE)
    return {
      key,
      weekNumber: getWeekNumberFromKey(key),
      dateRange: getWeekDateRange(key),
      stats: { total: theoreticalStats.total, done: 0, percentage: 0 },
      hasData: false,
    }
  })

  const monthlyPercentage =
    totalBlocks === 0 ? 0 : Math.round((totalDone / totalBlocks) * 100)

  return {
    monthLabel: getMonthLabel(date),
    weeks,
    monthlyPercentage,
    totalDone,
    totalBlocks,
    weeksWithData,
  }
}
