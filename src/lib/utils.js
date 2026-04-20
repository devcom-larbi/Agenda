import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function deepEqual(a, b) {
  if (a === b) return true
  if (typeof a !== typeof b || typeof a !== 'object' || a === null || b === null) return a === b
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false
    return a.every((v, i) => deepEqual(v, b[i]))
  }
  const keysA = Object.keys(a).sort()
  const keysB = Object.keys(b).sort()
  if (keysA.join(',') !== keysB.join(',')) return false
  return keysA.every(k => deepEqual(a[k], b[k]))
}
