import { DAYS_ORDER } from '../data/schedule'
import { isCurrentDay, getWeekDatesForKey, formatShortDate } from '../utils/dateUtils'
import DayColumn from './DayColumn'

export default function WeekView({ schedule, onToggle, onUpdate, weekKey, changedDays = new Set(), onMarkRecurring, onAdd, onDelete }) {
  const weekDates = getWeekDatesForKey(weekKey)

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth">
      {DAYS_ORDER.map((dayName) => (
        <DayColumn
          key={dayName}
          dayName={dayName}
          dayData={schedule[dayName]}
          onToggle={onToggle}
          onUpdate={onUpdate}
          isToday={isCurrentDay(dayName, weekKey)}
          dateLabel={formatShortDate(weekDates[dayName])}
          isChanged={changedDays.has(dayName)}
          onMarkRecurring={onMarkRecurring}
          onAdd={onAdd}
          onDelete={onDelete}
          weekKey={weekKey}
          compact
        />
      ))}
    </div>
  )
}
