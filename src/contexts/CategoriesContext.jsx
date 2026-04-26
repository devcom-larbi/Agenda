import { createContext, useContext, useState, useEffect } from 'react'
import { CATEGORY_LABELS } from '../data/schedule'

const CategoriesContext = createContext({
  allLabels: CATEGORY_LABELS,
  customCategories: [],
  addCategory: () => '',
  removeCategory: () => {},
  getCategoryDetails: () => ({ label: '', color: '' })
})

export function CategoriesProvider({ userId, children }) {
  const storageKey = `custom_categories_${userId || 'local'}`

  const [customCategories, setCustomCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`custom_categories_${userId || 'local'}`) || '[]') }
    catch { return [] }
  })

  useEffect(() => {
    try {
      setCustomCategories(JSON.parse(localStorage.getItem(storageKey) || '[]'))
    } catch {
      setCustomCategories([])
    }
  }, [storageKey])

  const allLabels = {
    ...CATEGORY_LABELS,
    ...Object.fromEntries(customCategories.map(c => [c.key, c.label])),
  }

  function addCategory(label) {
    const trimmed = label.trim()
    if (!trimmed) return ''
    const base = trimmed
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
    const key = base || `cat_${Date.now()}`
    // Already exists → just return the key
    if (CATEGORY_LABELS[key]) return key
    if (customCategories.find(c => c.key === key)) return key
    const newCat = { key, label: trimmed }
    const updated = [...customCategories, newCat]
    setCustomCategories(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
    return key
  }

  function removeCategory(key) {
    const updated = customCategories.filter(c => c.key !== key)
    setCustomCategories(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  function getCategoryDetails(key) {
    const defaultColors = {
      sommeil:  '#A8A29E',
      coran:    '#78716C',
      learning: '#0A0A0A',
      clients:  '#D97706',
      salam:    '#0369A1',
      sport:    '#15803D',
      school:   '#1E40AF',
      work:     '#44403C',
      rest:     '#D6D3D1',
    }
    const label = allLabels[key] || key
    const color = defaultColors[key] || '#64748b'
    return { label, color }
  }

  return (
    <CategoriesContext.Provider value={{ allLabels, customCategories, addCategory, removeCategory, getCategoryDetails }}>
      {children}
    </CategoriesContext.Provider>
  )
}

export function useCategories() {
  return useContext(CategoriesContext)
}
