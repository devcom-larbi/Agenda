import * as React from 'react'
import { cn } from '@/lib/utils'

function Card({ className, ...props }) {
  return <div className={cn('rounded-xl border bg-card text-card-foreground shadow-sm', className)} {...props} />
}
function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-1 p-5 pb-3', className)} {...props} />
}
function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-sm font-semibold leading-none tracking-tight', className)} {...props} />
}
function CardContent({ className, ...props }) {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardContent }
