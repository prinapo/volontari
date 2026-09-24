import ExcelJS from 'exceljs'
import { describe, it, expect } from 'vitest'
import { PROGETTI_COLUMNS } from 'src/utils/verificaExport'
import { exportFileName, writeSheet } from 'src/utils/xlsxExport'

describe('exportFileName', () => {
  it('formatta nome file con data e ora', () => {
    expect(exportFileName(new Date(2026, 0, 2, 9, 5))).toBe('Verifica_Dettaglio_2026-01-02_0905.xlsx')
  })
})

describe('writeSheet', () => {
  it('crea il foglio con intestazioni, freeze e autofilter', () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = writeSheet(workbook, 'Progetti', PROGETTI_COLUMNS, [{ idProgetto: 'p1', allocato: 100 }])
    expect(sheet.getRow(1).getCell(1).value).toBe('ID Progetto')
    expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })
    expect(sheet.autoFilter).toBeTruthy()
    expect(sheet.getColumn(1).width).toBe(PROGETTI_COLUMNS[0].width)
  })

  it('applica il formato valuta alle colonne currency', () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = writeSheet(workbook, 'X', PROGETTI_COLUMNS, [{ idProgetto: 'p1', allocato: 123.45 }])
    const index = PROGETTI_COLUMNS.findIndex(col => col.key === 'allocato') + 1
    const cell = sheet.getRow(2).getCell(index)
    expect(cell.value).toBe(123.45)
    expect(cell.numFmt).toContain('€')
  })
})
