import { EXPORT_THEME } from './verificaExport'

/**
 * Writer ExcelJS condiviso per l'export dettagliato: intestazione formattata,
 * formati numerici/data, freeze della prima riga e autofiltro.
 * L'import di ExcelJS è dinamico (nel chiamante) per non pesare sul bundle.
 */

const BORDER = { style: 'thin', color: { argb: EXPORT_THEME.borderColor } }

function styleHeader(sheet, columnCount) {
  const header = sheet.getRow(1)
  header.height = 24
  for (let i = 1; i <= columnCount; i++) {
    const cell = header.getCell(i)
    cell.font = { bold: true, color: { argb: EXPORT_THEME.headerFontColor }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXPORT_THEME.headerFillColor } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER }
  }
}

function applyFill(cell, key) {
  const argb = EXPORT_THEME.statoProgettoFill?.[key]
  if (argb) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function applyFormats(sheet, columns, rowCount) {
  for (let r = 0; r < rowCount; r++) {
    const excelRow = sheet.getRow(r + 2)
    columns.forEach((col, index) => {
      const cell = excelRow.getCell(index + 1)
      if (col.fillByStatoProgetto) applyFill(cell, cell.value)
      const raw = cell.value
      if (raw === null || raw === undefined || raw === '') return

      switch (col.type) {
        case 'currency':
        case 'number': {
          const num = Number.parseFloat(raw)
          if (Number.isFinite(num)) {
            cell.value = num
            cell.numFmt = col.type === 'currency' ? EXPORT_THEME.numFmt.currency : EXPORT_THEME.numFmt.number
          }
          break
        }
        case 'percent': {
          const num = Number.parseFloat(raw)
          if (Number.isFinite(num)) {
            cell.value = num / 100
            cell.numFmt = EXPORT_THEME.numFmt.percent
          }
          break
        }
        case 'date': {
          const date = new Date(raw)
          if (Number.isFinite(date.getTime())) {
            cell.value = date
            cell.numFmt = EXPORT_THEME.numFmt.date
          }
          break
        }
        default:
          break
      }
    })
  }
}

export function writeSheet(workbook, name, columns, rows) {
  const sheet = workbook.addWorksheet(name)
  sheet.columns = columns.map(col => ({ header: col.header, key: col.key, width: col.width }))
  for (const row of rows) sheet.addRow(row)

  styleHeader(sheet, columns.length)
  applyFormats(sheet, columns, rows.length)

  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  if (columns.length > 0) {
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } }
  }
  return sheet
}

export function downloadWorkbookBuffer(buffer, filename) {
  const blob = new globalThis.Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = globalThis.URL.createObjectURL(blob)
  const link = globalThis.document.createElement('a')
  link.href = url
  link.download = filename
  globalThis.document.body.append(link)
  link.click()
  link.remove()
  globalThis.URL.revokeObjectURL(url)
}

export function exportFileName(date = new Date()) {
  const pad = value => String(value).padStart(2, '0')
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`
  return `Verifica_Dettaglio_${stamp}.xlsx`
}
