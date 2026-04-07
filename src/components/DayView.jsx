import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { DAYS_ORDER } from '../data/schedule'
import { getCurrentDayName, getWeekDatesForKey, formatShortDate } from '../utils/dateUtils'
import Block from './Block'

export default function DayView({ schedule, onToggle, onUpdate, weekKey }) {
  const todayName = getCurrentDayName()
  const todayIndex = DAYS_ORDER.indexOf(todayName)
  const [dayIndex, setDayIndex] = useState(todayIndex >= 0 ? todayIndex : 0)

  const dayName = DAYS_ORDER[dayIndex]
  const dayData = schedule[dayName]
  const isToday = dayName === todayName
  const weekDates = getWeekDatesForKey(weekKey)

  const doneCount = dayData.blocks.filter((b) => b.done).length
  const totalCount = dayData.blocks.length
  const progressPercent = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)

  return (
    <div className="max-w-lg mx-auto space-y-3">

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setDayIndex((i) => Math.max(0, i - 1))} disabled={dayIndex === 0}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-base font-semibold capitalize">{dayData.label}</h2>
            {isToday && (
              <span className="text-[10px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-sm">
                Aujourd'hui
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatShortDate(weekDates[dayName])} · {dayData.type}
          </p>
        </div>

        <Button variant="outline" size="icon" onClick={() => setDayIndex((i) => Math.min(DAYS_ORDER.length - 1, i + 1))} disabled={dayIndex === DAYS_ORDER.length - 1}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Progression */}
      <Card>
        <CardContent className="pt-4 pb-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{doneCount}/{totalCount} blocs</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} indicatorClassName={
            progressPercent >= 80 ? 'bg-green-500' :
            progressPercent >= 50 ? 'bg-amber-500' :
            progressPercent > 0   ? 'bg-red-400' : ''
          } />
        </CardContent>
      </Card>

      {/* Blocs */}
      <div className="flex flex-col gap-2">
        {dayData.blocks.map((block) => (
          <Block
            key={block.id}
            block={block}
            onToggle={() => onToggle(dayName, block.id)}
            onUpdate={(updates) => onUpdate(dayName, block.id, updates)}
          />
        ))}
      </div>

      {/* Sélecteur jours */}
      <div className="flex justify-center gap-1 pt-2 flex-wrap">
        {DAYS_ORDER.map((name, idx) => {
          const isSelected = idx === dayIndex
          const isT = name === todayName
          return (
            <button
              key={name}
              onClick={() => setDayIndex(idx)}
              className={cn(
                'text-[10px] px-2 py-1 rounded font-medium transition-all',
                isSelected ? 'bg-primary text-primary-foreground' :
                isT ? 'bg-primary/10 text-primary' :
                'text-muted-foreground hover:bg-accent'
              )}
            >
              {name.slice(0, 3)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
