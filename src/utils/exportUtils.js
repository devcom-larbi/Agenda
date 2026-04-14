function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportToCSV(weeksData) {
  const rows = [
    ['Semaine', 'Jour', 'Horaire', 'Titre', 'Catégorie', 'Priorité', 'Fait', 'Récurrent', 'Notes'],
  ]

  for (const { weekKey, schedule } of weeksData) {
    if (!schedule) continue
    for (const [dayName, dayData] of Object.entries(schedule)) {
      for (const block of dayData.blocks) {
        rows.push([
          weekKey,
          dayData.label || dayName,
          block.time || '',
          block.label || '',
          block.category || '',
          block.priority || 'normal',
          block.done ? 'Oui' : 'Non',
          block.recurring ? 'Oui' : 'Non',
          (block.description || '').replace(/\r?\n/g, ' | '),
        ])
      }
    }
  }

  const csv = rows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `agenda-export-${new Date().toISOString().slice(0, 10)}.csv`)
}

export function exportToJSON(weeksData) {
  const data = weeksData
    .filter(w => w.schedule)
    .map(({ weekKey, offset, schedule }) => ({ weekKey, offset, schedule }))

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `agenda-export-${new Date().toISOString().slice(0, 10)}.json`)
}
