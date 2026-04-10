import { startOfMonth, endOfMonth, addDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getISOWeek, getISOWeekYear, startOfISOWeek, endOfISOWeek } from 'date-fns'
import { WEEKLY_SCHEDULE, DAYS_ORDER } from '../data/schedule'

export function getWeekKeysForMonth(date) {
  const start = startOfMonth(date)
  const end = endOfMonth(date)
  const weekKeys = new Set()
  let current = start
  while (current <= end) {
    const year = getISOWeekYear(current)
    const week = getISOWeek(current)
    weekKeys.add(`week-${year}-W${String(week).padStart(2, '0')}`)
    current = addDays(current, 1)
  }
  return [...weekKeys].sort()
}

export function getWeekDateRange(weekKey) {
  const match = weekKey.match(/week-(\d+)-W(\d+)/)
  if (!match) return weekKey
  const year = parseInt(match[1])
  const week = parseInt(match[2])
  const jan4 = new Date(year, 0, 4)
  const startOfWeek1 = startOfISOWeek(jan4)
  const monday = addDays(startOfWeek1, (week - 1) * 7)
  const sunday = endOfISOWeek(monday)
  const formatDay = (d) => format(d, 'd MMM', { locale: fr })
  const formatDayYear = (d) => format(d, 'd MMM yyyy', { locale: fr })
  return `${formatDay(monday)} – ${formatDayYear(sunday)}`
}

export function getWeekNumberFromKey(weekKey) {
  const match = weekKey.match(/W(\d+)/)
  return match ? parseInt(match[1]) : 0
}

export function computeWeekStats(schedule) {
  let total = 0
  let done = 0
  const byDay = {}
  const byCategory = {}

  for (const dayName of DAYS_ORDER) {
    const day = schedule[dayName]
    if (!day) continue
    let dayTotal = 0, dayDone = 0
    for (const block of day.blocks) {
      total++
      dayTotal++
      if (block.done) { done++; dayDone++ }
      const cat = block.category || 'other'
      if (!byCategory[cat]) byCategory[cat] = { total: 0, done: 0 }
      byCategory[cat].total++
      if (block.done) byCategory[cat].done++
    }
    byDay[dayName] = { total: dayTotal, done: dayDone, label: day.label }
  }

  const percentage = total === 0 ? 0 : Math.round((done / total) * 100)
  return { total, done, percentage, byDay, byCategory }
}

export function getMonthLabel(date) {
  return format(date, 'MMMM yyyy', { locale: fr })
}

/**
 * Calcule le récap mensuel complet.
 * @param {Date} date — n'importe quelle date dans le mois
 * @param {Object} weeksData — map { [weekKey]: scheduleObject } fourni de l'extérieur (Supabase ou localStorage)
 */
export function computeMonthRecap(date, weeksData = {}) {
  const weekKeys = getWeekKeysForMonth(date)
  let totalDone = 0
  let totalBlocks = 0
  let weeksWithData = 0

  const weeks = weekKeys.map((key) => {
    const savedSchedule = weeksData[key] || null

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

    const theoreticalStats = computeWeekStats(WEEKLY_SCHEDULE)
    return {
      key,
      weekNumber: getWeekNumberFromKey(key),
      dateRange: getWeekDateRange(key),
      stats: { total: theoreticalStats.total, done: 0, percentage: 0 },
      hasData: false,
    }
  })

  const monthlyPercentage = totalBlocks === 0 ? 0 : Math.round((totalDone / totalBlocks) * 100)

  return {
    monthLabel: getMonthLabel(date),
    weeks,
    monthlyPercentage,
    totalDone,
    totalBlocks,
    weeksWithData,
  }
}
