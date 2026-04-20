import { DAYS_ORDER } from '../data/schedule'
import { isCurrentDay, getWeekDatesForKey, formatShortDate } from '../utils/dateUtils'
import DayColumn from './DayColumn'

export default function WeekView({ schedule, onToggle, onUpdate, weekKey, changedDays = new Set(), onAdd, onDelete }) {
  const weekDates = getWeekDatesForKey(weekKey)

  return (
    <div
      className="flex gap-4 overflow-x-auto pb-4 pt-2 px-4 snap-x snap-mandatory scroll-smooth h-full"
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <style>{`div::-webkit-scrollbar { display: none; }`}</style>

      {DAYS_ORDER.map((dayName) => (
        <div key={dayName} className="snap-center shrink-0 w-[85vw] max-w-[320px] h-full">
          <DayColumn
            dayName={dayName}
            dayData={schedule[dayName]}
            onToggle={onToggle}
            onUpdate={onUpdate}
            isToday={isCurrentDay(dayName, weekKey)}
            dateLabel={formatShortDate(weekDates[dayName])}
            isChanged={changedDays.has(dayName)}
            onAdd={onAdd}
            onDelete={onDelete}
            weekKey={weekKey}
            compact
          />
        </div>
      ))}
    </div>
  )
}
