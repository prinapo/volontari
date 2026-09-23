import { describe, it, expect } from 'vitest'
import { buildFlatRows, buildInfoRows, FLAT_COLUMNS } from 'src/utils/verificaExport'

function flatRow(extra = {}) {
  return {
    idProgetto: 'p1',
    annoBando: 2024,
    titolo: 'Sostegno',
    famiglia: 'Rossi',
    allocato: 1000,
    totaleRendicontato: 500,
    totalePagato: 200,
    statoProgetto: 'accettato',
    dataInizio: '2024-01-01',
    dataFine: '2024-12-31',
    eta: 10,
    descrizioneProgetto: 'Desc',
    ambito: 'Scuola',
    iban: 'IT00',
    intestatario: 'Rossi',
    residuoAllocato: 600,
    giustificativi: [{ Stato: 'verificato', Importo: 500, Invalidato: false, Data: '2024-05-01' }],
    contatti: [
      {
        Nome: 'Anna',
        Cognome: 'Verdi',
        Citta: 'Milano',
        Ruolo: 'Genitore',
        DataCreazione: '2024-01-02',
        email: [{ email_address: 'a@b.it', Primary: false }, { email_address: 'p@b.it', Primary: true }]
      }
    ],
    ...extra
  }
}

describe('buildFlatRows', () => {
  it('mappa i campi base con le chiavi delle colonne', () => {
    const [row] = buildFlatRows([flatRow()])
    expect(row).toMatchObject({
      idProgetto: 'p1',
      famiglia: 'Rossi',
      statoProgetto: 'Accettato',
      totaleRendicontato: 500,
      residuoAllocato: 600
    })
  })

  it('appiattisce i contatti valorizzando la email primaria', () => {
    const [row] = buildFlatRows([flatRow()])
    expect(row.c1_nome).toBe('Anna')
    expect(row.c1_cognome).toBe('Verdi')
    expect(row.c1_citta).toBe('Milano')
    expect(row.c1_email).toBe('p@b.it')
    expect(row.c1_ruolo).toBe('Genitore')
    expect(row.c2_nome).toBe('')
  })

  it('appiattisce i giustificativi non invalidati', () => {
    const [row] = buildFlatRows([flatRow()])
    expect(row.g1_descrizione).toBe('')
    expect(row.g1_stato).toBe('verificato')
    expect(row.g1_importo).toBe(500)
  })

  it('espone tutte le colonne piatte dichiarate', () => {
    const [row] = buildFlatRows([flatRow()])
    for (const col of FLAT_COLUMNS) {
      expect(row).toHaveProperty(col.key)
    }
  })

  it('la colonna Stato Progetto ha il fill condizionale', () => {
    const col = FLAT_COLUMNS.find(c => c.key === 'statoProgetto')
    expect(col.fillByStatoProgetto).toBe(true)
  })
})

describe('buildInfoRows', () => {
  it('riporta i metadati e i conteggi', () => {
    const rows = buildInfoRows({ data: '01/01/2026', versione: '4.0.9', progetti: 3, contatti: 5, giustificativi: 7 })
    expect(rows).toEqual([
      { campo: 'Data export', valore: '01/01/2026' },
      { campo: 'Versione app', valore: '4.0.9' },
      { campo: 'Progetti esportati', valore: '3' },
      { campo: 'Contatti esportati', valore: '5' },
      { campo: 'Giustificativi esportati', valore: '7' }
    ])
  })
})
