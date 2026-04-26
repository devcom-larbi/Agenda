import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import WeekView from './WeekView'
import MonthView from './MonthView'
import { cn } from '@/lib/utils'

export default function PanoramaView({ schedule, onToggle, onUpdate, weekKey, changedDays, onAdd, onDelete, onSelectWeek }) {
  const [activeSubTab, setActiveSubTab] = useState('week')

  return (
    <div className="flex flex-col h-full bg-[var(--bg)]">
      <div className="px-4 pt-1 pb-3 flex items-center justify-between">
        <h1 className="text-[32px] font-semibold tracking-[-0.025em] leading-[1.1] text-[var(--text-1)]">Panorama</h1>
      </div>

      <div className="flex justify-center mb-4 px-4">
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full max-w-sm">
          <TabsList className="grid w-full grid-cols-2 bg-[var(--surface-1)] border border-[var(--line)] rounded-[10px] p-0.5">
            <TabsTrigger value="week" className="data-[state=active]:bg-[var(--surface-0)] data-[state=active]:text-[var(--text-1)] text-[12px] font-medium text-[var(--text-3)] rounded-[7px] py-1.5 transition-all">Semaine</TabsTrigger>
            <TabsTrigger value="month" className="data-[state=active]:bg-[var(--surface-0)] data-[state=active]:text-[var(--text-1)] text-[12px] font-medium text-[var(--text-3)] rounded-[7px] py-1.5 transition-all">Mois</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className={cn("flex-1", activeSubTab === 'week' ? "overflow-hidden" : "overflow-y-auto px-3 pb-32")}>
        {activeSubTab === 'week' ? (
          <WeekView
            schedule={schedule}
            onToggle={onToggle}
            onUpdate={onUpdate}
            weekKey={weekKey}
            changedDays={changedDays}
            onAdd={onAdd}
            onDelete={onDelete}
          />
        ) : (
          <MonthView onSelectWeek={(key) => {
            if (onSelectWeek) onSelectWeek(key);
            setActiveSubTab('week');
          }} />
        )}
      </div>
    </div>
  )
}
