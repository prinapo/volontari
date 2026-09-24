import { describe, it, expect } from 'vitest'
import {
  buildContattiRows,
  buildGiustificativiRows,
  buildProgettiRows,
  CONTATTI_COLUMNS,
  GIUSTIFICATIVI_COLUMNS,
  PROGETTI_COLUMNS
} from 'src/utils/verificaExport'

function progettoRow(extra = {}) {
  return {
    idProgetto: 'p1',
    idFamiglia: 'f1',
    famiglia: 'Rossi',
    beneficiario: 'Mario Rossi',
    annoBando: 2024,
    titolo: 'Sostegno',
    ambito: 'Scuola',
    statoProgetto: 'accettato',
    percentualeRimborso: 80,
    allocato: 1000,
    totaleRendicontato: 500,
    totaleVerificato: 300,
    totaleProposto: 100,
    totaleInPagamento: 0,
    totalePagato: 200,
    residuoAllocato: 600,
    totaleRimborsabile: 400,
    dataInizio: '2024-01-01',
    dataFine: '2024-12-31',
    eta: 10,
    isee: 5000,
    indiceIsee: 1,
    indiceGravita: 2,
    punteggio: 3,
    costoAnnuale: 100,
    costoCaricoFamiglia: 20,
    altriFinanziamenti: 0,
    erogazioneRichiesta: 50,
    sostegnoScolastico: 'Sì',
    continuazione: 'No',
    motivoChiusura: '',
    dataChiusura: '',
    iban: 'IT00',
    intestatario: 'Rossi',
    giustificativi: [
      { Stato: 'verificato', Importo: 300, Invalidato: false },
      { Stato: 'verificato', Importo: 100, Invalidato: false }
    ],
    ...extra
  }
}

const contattiByFamiglia = {
  f1: [
    {
      Cognome: 'Verdi',
      Nome: 'Anna',
      Ruolo: 'Genitore',
      Citta: 'Milano',
      CF: 'VRDNN',
      _emails: [
        { email_address: 'anna@example.com', Primary: true },
        { email_address: 'anna2@example.com', Primary: false }
      ]
    },
    {
      Cognome: 'Bianchi',
      Nome: 'Luca',
      Ruolo: 'Volontario',
      Citta: 'Roma',
      _emails: []
    }
  ]
}

describe('buildProgettiRows', () => {
  it('mappa stato, etichette e aggregati derivati', () => {
    const rows = buildProgettiRows([progettoRow()], contattiByFamiglia)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      idProgetto: 'p1',
      statoProgetto: 'Accettato',
      statoRiga: 'Pronto',
      statoRendicontazione: 'verificato',
      numGiustificativi: 2,
      numContatti: 2
    })
  })

  it('calcola il residuo erogabile (erogabile - coperto)', () => {
    const [row] = buildProgettiRows([progettoRow()], contattiByFamiglia)
    // erogabile = min(300 * 80%, 1000) = 240; coperto = 200 + 0 = 200
    expect(row.residuoErogabile).toBe(40)
  })

  it('espone tutte le colonne dichiarate', () => {
    const [row] = buildProgettiRows([progettoRow()], {})
    for (const col of PROGETTI_COLUMNS) {
      expect(row).toHaveProperty(col.key)
    }
  })
})

describe('buildContattiRows', () => {
  it('una riga per contatto, ordinata per cognome', () => {
    const rows = buildContattiRows([progettoRow()], contattiByFamiglia)
    expect(rows.map(r => r.cognome)).toEqual(['Bianchi', 'Verdi'])
    expect(rows[0]).toMatchObject({ idProgetto: 'p1', famiglia: 'Rossi', ruolo: 'Volontario' })
  })

  it('valorizza email primaria e tutte le email', () => {
    const rows = buildContattiRows([progettoRow()], contattiByFamiglia)
    const verdi = rows.find(r => r.cognome === 'Verdi')
    expect(verdi.emailPrimaria).toBe('anna@example.com')
    expect(verdi.emailTutte).toBe('anna@example.com; anna2@example.com')
    expect(verdi.citta).toBe('Milano')
    expect(verdi.cf).toBe('VRDNN')
  })

  it('espone tutte le colonne dichiarate', () => {
    const [row] = buildContattiRows([progettoRow()], contattiByFamiglia)
    for (const col of CONTATTI_COLUMNS) {
      expect(row).toHaveProperty(col.key)
    }
  })

  it('nessun contatto se la famiglia non ne ha', () => {
    expect(buildContattiRows([progettoRow()], {})).toEqual([])
  })
})

describe('buildGiustificativiRows', () => {
  it('appiattisce tutti i giustificativi, inclusi gli invalidati', () => {
    const row = progettoRow({
      giustificativi: [
        { id: 1, Stato: 'verificato', Importo: 300, Invalidato: false },
        { id: 2, Stato: 'draft', Importo: 10, Invalidato: true }
      ]
    })
    const rows = buildGiustificativiRows([row])
    expect(rows).toHaveLength(2)
    expect(rows[1]).toMatchObject({ id: 2, idProgetto: 'p1', invalidato: 'Sì' })
    expect(rows[0].invalidato).toBe('No')
  })

  it('espone tutte le colonne dichiarate', () => {
    const rows = buildGiustificativiRows([progettoRow()])
    for (const col of GIUSTIFICATIVI_COLUMNS) {
      expect(rows[0]).toHaveProperty(col.key)
    }
  })
})
