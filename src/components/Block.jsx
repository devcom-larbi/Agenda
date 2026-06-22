import { useRef } from 'react'
import { Check, Repeat2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCategories } from '../contexts/CategoriesContext'
import { useUserSettings } from '../hooks/useUserSettings'
import { useAuth } from '../contexts/AuthContext'
import { hapticCheck, hapticUncheck } from '../lib/haptic'
import { DEFAULT_CATEGORY_COLORS } from '../data/schedule'

export default function Block({ block, onToggle, onEdit, height }) {
  const { user } = useAuth()
  const { settings } = useUserSettings(user?.id)
  const { allLabels } = useCategories()
  const lastTap = useRef(0)

  function handleToggle(e) {
    e.stopPropagation()
    if (!block.done) hapticCheck()
    else hapticUncheck()
    onToggle()
  }

  function handleDoubleTap(e) {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      onEdit?.()
      e.preventDefault()
      e.stopPropagation()
    }
    lastTap.current = now
  }

  const baseColor = block.color
    || settings?.categoryColors?.[block.category]
    || DEFAULT_CATEGORY_COLORS[block.category]
    || '#94a3b8'

  const bgOpacity = block.done ? '15' : '1A'
  const backgroundColor = `${baseColor}${bgOpacity}`

  const glowEffect = block.done
    ? 'none'
    : `0 6px 24px ${baseColor}4D`

  const isSmall = height < 40

  return (
    <div
      className={cn(
        "relative w-full h-full rounded-[6px] overflow-hidden transition-all duration-300 cursor-pointer",
        block.done ? "opacity-50 grayscale-[30%]" : "opacity-100"
      )}
      style={{
        backgroundColor,
        borderLeft: `3px solid ${baseColor}`,
        boxShadow: glowEffect,
      }}
      onClick={handleToggle}
      onDoubleClick={e => { e.stopPropagation(); onEdit?.() }}
      onPointerUp={handleDoubleTap}
    >
      <div className="w-full h-full px-2 py-1.5 flex flex-col pointer-events-none">

        <div className="flex items-start justify-between gap-1 leading-tight">
          <p
            className="font-bold truncate flex items-center gap-1.5 tracking-tight"
            style={{
              fontSize: isSmall ? '11px' : '13px',
              color: baseColor,
              textDecoration: block.done ? 'line-through' : 'none',
              textShadow: block.done ? 'none' : `0 0 16px ${baseColor}66`
            }}
          >
            {block.emoji && <span className="drop-shadow-sm">{block.emoji}</span>}
            {block.label}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {(block.note || block.description) && isSmall && (
              <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ backgroundColor: baseColor, boxShadow: `0 0 4px ${baseColor}` }} />
            )}
            {block.done && (
              <Check className="h-3 w-3 mt-0.5" style={{ color: baseColor }} strokeWidth={3} />
            )}
          </div>
        </div>

        {!isSmall && (
          <div className="flex items-center gap-1 mt-1">
            <span
              className="text-[10px] font-semibold tabular-nums tracking-wide"
              style={{ color: baseColor, opacity: 0.9 }}
            >
              {block.time}
            </span>
            {block.priority === 'urgent' && (
              <span className="text-[9px] font-bold text-white px-1 rounded-sm ml-1" style={{ backgroundColor: baseColor, boxShadow: `0 0 6px ${baseColor}80` }}>!</span>
            )}
            {block.recurring && <Repeat2 className="h-2.5 w-2.5 ml-1" style={{ color: baseColor, opacity: 0.8 }} />}
          </div>
        )}

        {!isSmall && (block.note || block.description) && (
          <p className="text-[10px] mt-1 leading-snug line-clamp-2 font-medium"
            style={{ color: baseColor, opacity: 0.85 }}>
            {(block.note || block.description)}
          </p>
        )}
      </div>
    </div>
  )
}
