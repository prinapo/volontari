import { describe, it, expect } from 'vitest'
import { buildInfoRows, buildProgettiPiattiRows, FLAT_COLUMNS } from 'src/utils/verificaExport'

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
    giustificativi: [
      { Stato: 'verificato', Importo: 500, Invalidato: false, Data: '2024-05-01', Descrizione: 'Visita ortopedica' }
    ],
    ...extra
  }
}

const contattiRossi = {
  f1: [
    {
      Nome: 'Mario',
      Cognome: 'Rossi',
      Ruolo: 'Volontario',
      Numero_di_cellulare: '',
      Numero_di_telefono: '02111222',
      _emails: [{ email_address: 'm@b.it', Primary: true }]
    },
    {
      Nome: 'Anna',
      Cognome: 'Verdi',
      Ruolo: 'Genitore',
      Numero_di_cellulare: '+393331112222',
      _emails: [
        { email_address: 'a@b.it', Primary: false },
        { email_address: 'p@b.it', Primary: true }
      ]
    },
    {
      Nome: 'Paolo',
      Cognome: 'Bianchi',
      Ruolo: 'Tutore',
      Numero_di_cellulare: '+393334445555',
      _emails: [{ email_address: 't@b.it', Primary: true }]
    },
    {
      Nome: 'Rita',
      Cognome: 'Arancio',
      Ruolo: 'Referente',
      Numero_di_cellulare: '+393336667777',
      _emails: [{ email_address: 'r@b.it', Primary: true }]
    }
  ]
}

describe('buildProgettiPiattiRows', () => {
  it('mappa i campi base con le chiavi delle colonne', () => {
    const [row] = buildProgettiPiattiRows([flatRow()], contattiRossi)
    expect(row).toMatchObject({
      idProgetto: 'p1',
      anno: 2024,
      famiglia: 'Rossi',
      statoProgetto: 'Accettato',
      rendicontato: 500,
      pagato: 200,
      totaleRendicontato: 500,
      residuoAllocato: 600
    })
  })

  it('mette i contatti in una cella multi-riga con ruolo ed email primaria', () => {
    const [row] = buildProgettiPiattiRows([flatRow({ idFamiglia: 'f1' })], contattiRossi)
    const righe = row.contatti.split('\n')
    expect(righe).toHaveLength(3)
    expect(righe[0]).toBe('Genitore · Anna Verdi — p@b.it — +393331112222')
    expect(righe[1]).toBe('Volontario · Mario Rossi — m@b.it — 02111222')
    expect(righe[2]).toBe('Tutore · Paolo Bianchi — t@b.it — +393334445555')
  })

  it('esclude i referenti e ordina per ruolo (Genitore, Volontario, Tutore) poi cognome', () => {
    const [row] = buildProgettiPiattiRows([flatRow({ idFamiglia: 'f1' })], contattiRossi)
    expect(row.contatti).not.toContain('Referente')
    expect(row.contatti).not.toContain('Rita Arancio')
    expect(row.contatti.indexOf('Genitore')).toBeLessThan(row.contatti.indexOf('Volontario'))
    expect(row.contatti.indexOf('Volontario')).toBeLessThan(row.contatti.indexOf('Tutore'))
  })

  it('cella contatti vuota senza contatti per la famiglia', () => {
    const [row] = buildProgettiPiattiRows([flatRow()], contattiRossi)
    expect(row.contatti).toBe('')
  })

  it('appiattisce i giustificativi non invalidati in una riga per giustificativo', () => {
    const [row] = buildProgettiPiattiRows([flatRow()], {}, {})
    const righe = row.giustificativi.split('\n')
    expect(righe).toHaveLength(1)
    expect(righe[0]).toMatch(/^Visita ortopedica — 500[,.]00\s*€ — 01\/05\/2024 — verificato$/)
  })

  it('esclude i giustificativi invalidati', () => {
    const [row] = buildProgettiPiattiRows(
      [
        flatRow({
          giustificativi: [
            { Stato: 'verificato', Importo: 100, Invalidato: false, Data: '2024-05-01', Descrizione: 'Valido' },
            { Stato: 'inviato', Importo: 50, Invalidato: true, Data: '2024-06-01', Descrizione: 'Cancellato' }
          ]
        })
      ],
      {},
      {}
    )
    expect(row.giustificativi).toContain('Valido')
    expect(row.giustificativi).not.toContain('Cancellato')
    expect(row.giustificativi.split('\n')).toHaveLength(1)
  })

  it('ordina i giustificativi per data decrescente', () => {
    const [row] = buildProgettiPiattiRows(
      [
        flatRow({
          giustificativi: [
            { Stato: 'pagato', Importo: 10, Invalidato: false, Data: '2024-03-01', Descrizione: 'Vecchio' },
            { Stato: 'pagato', Importo: 20, Invalidato: false, Data: '2024-06-01', Descrizione: 'Recente' }
          ]
        })
      ],
      {},
      {}
    )
    const righe = row.giustificativi.split('\n')
    expect(righe[0]).toContain('Recente')
    expect(righe[1]).toContain('Vecchio')
  })

  it('mette le note di progetto in una cella, una riga per nota in ordine cronologico', () => {
    const note = {
      p1: [
        { Testo: 'Seconda nota', AutoreNome: 'Giovanni', date_created: '2026-01-15T10:00:00' },
        { Testo: 'Prima nota', AutoreNome: 'Anna', date_created: '2026-01-10T10:00:00' }
      ]
    }
    const [row] = buildProgettiPiattiRows([flatRow()], {}, note)
    const righe = row.note.split('\n')
    expect(righe).toHaveLength(2)
    expect(righe[0]).toBe('10/01/2026 · Anna — Prima nota')
    expect(righe[1]).toBe('15/01/2026 · Giovanni — Seconda nota')
  })

  it('cella note vuota senza note o senza testo', () => {
    const [row] = buildProgettiPiattiRows([flatRow()], {}, {})
    expect(row.note).toBe('')
    const [senzaTesto] = buildProgettiPiattiRows(
      [flatRow()],
      {},
      { p1: [{ Testo: '  ', date_created: '2026-01-10T10:00:00' }] }
    )
    expect(senzaTesto.note).toBe('')
  })

  it('espone tutte le colonne dichiarate', () => {
    const [row] = buildProgettiPiattiRows([flatRow({ idFamiglia: 'f1' })], contattiRossi)
    for (const col of FLAT_COLUMNS) {
      expect(row).toHaveProperty(col.key)
    }
  })
})

describe('FLAT_COLUMNS', () => {
  it('le celle multi-riga hanno il wrap attivo', () => {
    for (const key of ['contatti', 'giustificativi', 'note']) {
      const col = FLAT_COLUMNS.find(c => c.key === key)
      expect(col).toBeDefined()
      expect(col.wrap).toBe(true)
    }
  })

  it('la colonna Stato Progetto ha il fill condizionale', () => {
    const col = FLAT_COLUMNS.find(c => c.key === 'statoProgetto')
    expect(col.fillByStatoProgetto).toBe(true)
  })

  it('mantiene le colonne finanziarie precedenti', () => {
    const headers = FLAT_COLUMNS.map(c => c.header)
    for (const header of [
      'Allocato',
      'Rendicontato',
      'Pagato',
      'Stato Rendicontazione',
      'Stato Progetto',
      'Totale Rendicontato',
      'Totale Pagato',
      'Residuo Allocato'
    ]) {
      expect(headers).toContain(header)
    }
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
