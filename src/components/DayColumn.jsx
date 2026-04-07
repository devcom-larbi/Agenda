import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Block from './Block'

export default function DayColumn({ dayName, dayData, onToggle, onUpdate, isToday, dateLabel, isChanged }) {
  const { label, type, blocks } = dayData

  const doneCount = blocks.filter((b) => b.done).length
  const totalCount = blocks.length
  const progressPercent = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)

  return (
    <Card className={cn(
      'flex flex-col overflow-hidden transition-all duration-700',
      isToday && 'ring-1 ring-primary',
      isChanged && 'ring-2 ring-green-400 bg-green-500/5'
    )}>
      {/* En-tête */}
      <CardHeader className={cn('pb-2', isToday && 'bg-primary/5', isChanged && 'bg-green-500/5')}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn('capitalize', isToday ? 'text-primary' : 'text-foreground')}>
            {label}
          </CardTitle>
          <div className="flex items-center gap-1">
            {isChanged && (
              <span className="text-[9px] font-semibold bg-green-500/20 text-green-400 px-1 py-0.5 rounded">
                modifié
              </span>
            )}
            {isToday && (
              <span className="text-[10px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-sm">
                Auj.
              </span>
            )}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">{dateLabel} · {type}</p>
      </CardHeader>

      {/* Blocs */}
      <CardContent className="flex-1 flex flex-col gap-1.5 px-3 pb-3 pt-0">
        {blocks.map((block) => (
          <Block
            key={block.id}
            block={block}
            onToggle={() => onToggle(dayName, block.id)}
            onUpdate={(updates) => onUpdate(dayName, block.id, updates)}
          />
        ))}
      </CardContent>

      {/* Progression */}
      <div className="px-3 pb-3 space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-muted-foreground">
            {doneCount}/{totalCount}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">{progressPercent}%</span>
        </div>
        <Progress
          value={progressPercent}
          indicatorClassName={cn(
            progressPercent === 100 ? 'bg-green-500' :
            isToday ? 'bg-primary' : 'bg-muted-foreground/40'
          )}
        />
      </div>
    </Card>
  )
}
