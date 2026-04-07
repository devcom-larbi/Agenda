import { DAYS_ORDER } from '../data/schedule'
import { isCurrentDay, getWeekDatesForKey, formatShortDate } from '../utils/dateUtils'
import DayColumn from './DayColumn'

export default function WeekView({ schedule, onToggle, onUpdate, weekKey, changedDays = new Set() }) {
  const weekDates = getWeekDatesForKey(weekKey)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {DAYS_ORDER.map((dayName) => (
        <DayColumn
          key={dayName}
          dayName={dayName}
          dayData={schedule[dayName]}
          onToggle={onToggle}
          onUpdate={onUpdate}
          isToday={isCurrentDay(dayName)}
          dateLabel={formatShortDate(weekDates[dayName])}
          isChanged={changedDays.has(dayName)}
        />
      ))}
    </div>
  )
}
