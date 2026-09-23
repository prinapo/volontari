import { statoProgettoLabel } from './badges'
import { calcolaStatoRendicontazione } from './rendicontazione'
import { calcolaStatoRiga, residuoErogabile } from './statoRiga'

/**
 * Costruzione pura delle righe del nuovo export dettagliato Verifica
 * (workbook multi-foglio). Nessun I/O: le righe prodotte sono consumate da
 * `src/utils/xlsxExport.js` (writer ExcelJS).
 */

const T = {
  TEXT: 'text',
  NUMBER: 'number',
  CURRENCY: 'currency',
  PERCENT: 'percent',
  DATE: 'date'
}

const MAX_CONTATTI_PIATTO = 8
const MAX_GIUSTIFICATIVI_PIATTO = 12

function contattiFlatColumns() {
  const columns = []
  for (let i = 1; i <= MAX_CONTATTI_PIATTO; i++) {
    columns.push(
      { key: `c${i}_nome`, header: `C${i}_Nome`, width: 16, type: T.TEXT },
      { key: `c${i}_cognome`, header: `C${i}_Cognome`, width: 16, type: T.TEXT },
      { key: `c${i}_citta`, header: `C${i}_Citta`, width: 16, type: T.TEXT },
      { key: `c${i}_email`, header: `C${i}_Email`, width: 24, type: T.TEXT },
      { key: `c${i}_ruolo`, header: `C${i}_Ruolo`, width: 12, type: T.TEXT }
    )
  }
  return columns
}

function giustificativiFlatColumns() {
  const columns = []
  for (let i = 1; i <= MAX_GIUSTIFICATIVI_PIATTO; i++) {
    columns.push(
      { key: `g${i}_descrizione`, header: `G${i}_Descrizione`, width: 24, type: T.TEXT },
      { key: `g${i}_importo`, header: `G${i}_Importo`, width: 12, type: T.CURRENCY },
      { key: `g${i}_data`, header: `G${i}_Data`, width: 12, type: T.DATE },
      { key: `g${i}_stato`, header: `G${i}_Stato`, width: 12, type: T.TEXT },
      { key: `g${i}_rendicontazione`, header: `G${i}_Rendicontazione`, width: 22, type: T.TEXT },
      { key: `g${i}_allegato`, header: `G${i}_Allegato`, width: 24, type: T.TEXT }
    )
  }
  return columns
}

export const FLAT_COLUMNS = [
  { key: 'idProgetto', header: 'ID Progetto', width: 38, type: T.TEXT },
  { key: 'anno', header: 'Anno', width: 8, type: T.TEXT },
  { key: 'titolo', header: 'Titolo', width: 28, type: T.TEXT },
  { key: 'famiglia', header: 'Famiglia', width: 28, type: T.TEXT },
  { key: 'allocato', header: 'Allocato', width: 14, type: T.CURRENCY },
  { key: 'rendicontato', header: 'Rendicontato', width: 14, type: T.CURRENCY },
  { key: 'pagato', header: 'Pagato', width: 14, type: T.CURRENCY },
  { key: 'statoRendicontazione', header: 'Stato Rendicontazione', width: 18, type: T.TEXT },
  {
    key: 'statoProgetto',
    header: 'Stato Progetto',
    width: 18,
    type: T.TEXT,
    fillByStatoProgetto: true
  },
  { key: 'dataInizio', header: 'Data Inizio', width: 12, type: T.DATE },
  { key: 'dataFine', header: 'Data Fine', width: 12, type: T.DATE },
  { key: 'eta', header: 'Eta', width: 8, type: T.TEXT },
  { key: 'descrizione', header: 'Descrizione', width: 30, type: T.TEXT },
  { key: 'ambito', header: 'Ambito', width: 16, type: T.TEXT },
  { key: 'iban', header: 'IBAN', width: 28, type: T.TEXT },
  { key: 'intestatario', header: 'Intestatario', width: 22, type: T.TEXT },
  { key: 'stato', header: 'Stato', width: 18, type: T.TEXT },
  { key: 'totaleRendicontato', header: 'Totale Rendicontato', width: 16, type: T.CURRENCY },
  { key: 'totalePagato', header: 'Totale Pagato', width: 16, type: T.CURRENCY },
  { key: 'residuoAllocato', header: 'Residuo Allocato', width: 16, type: T.CURRENCY },
  ...contattiFlatColumns(),
  ...giustificativiFlatColumns()
]

export const EXPORT_THEME = {
  headerFontColor: 'FFFFFFFF',
  headerFillColor: 'FF2E5D6E',
  borderColor: 'FFBFBFBF',
  numFmt: {
    currency: '#,##0.00 "€"',
    number: '#,##0.00',
    percent: '0.00%',
    date: 'dd/mm/yyyy'
  },
  // Riempimento celle per Stato progetto (gli stessi colori usati nei badge).
  statoProgettoFill: {
    Proposto: 'FFE0E0E0',
    Validato: 'FFB3E5FC',
    Approvato: 'FFE1BEE7',
    Accettato: 'FFC8E6C9',
    'In rendicontazione': 'FFFFE0B2',
    'Rimborso parziale': 'FFFFF3C4',
    Chiuso: 'FFCFD8DC'
  }
}

export const INFO_COLUMNS = [
  { key: 'campo', header: 'Campo', width: 28, type: T.TEXT },
  { key: 'valore', header: 'Valore', width: 55, type: T.TEXT }
]

export const PROGETTI_COLUMNS = [
  { key: 'idProgetto', header: 'ID Progetto', width: 38, type: T.TEXT },
  { key: 'annoBando', header: 'Anno', width: 8, type: T.TEXT },
  { key: 'famiglia', header: 'Famiglia', width: 30, type: T.TEXT },
  { key: 'beneficiario', header: 'Beneficiario', width: 24, type: T.TEXT },
  { key: 'titolo', header: 'Titolo', width: 30, type: T.TEXT },
  { key: 'ambito', header: 'Ambito', width: 18, type: T.TEXT },
  { key: 'statoProgetto', header: 'Stato progetto', width: 18, type: T.TEXT, fillByStatoProgetto: true },
  { key: 'statoRendicontazione', header: 'Stato rendicontazione', width: 18, type: T.TEXT },
  { key: 'statoRiga', header: 'Stato riga', width: 18, type: T.TEXT },
  { key: 'percentualeRimborso', header: '% rimborso', width: 12, type: T.PERCENT },
  { key: 'allocato', header: 'Allocato', width: 14, type: T.CURRENCY },
  { key: 'totaleRendicontato', header: 'Rendicontato', width: 14, type: T.CURRENCY },
  { key: 'totaleVerificato', header: 'Verificato', width: 14, type: T.CURRENCY },
  { key: 'totaleProposto', header: 'Proposto', width: 14, type: T.CURRENCY },
  { key: 'totaleInPagamento', header: 'In pagamento', width: 14, type: T.CURRENCY },
  { key: 'totalePagato', header: 'Pagato', width: 14, type: T.CURRENCY },
  { key: 'residuoAllocato', header: 'Residuo allocato', width: 14, type: T.CURRENCY },
  { key: 'totaleRimborsabile', header: 'Rimborsabile', width: 14, type: T.CURRENCY },
  { key: 'residuoErogabile', header: 'Residuo erogabile', width: 14, type: T.CURRENCY },
  { key: 'dataInizio', header: 'Data inizio', width: 12, type: T.DATE },
  { key: 'dataFine', header: 'Data fine', width: 12, type: T.DATE },
  { key: 'eta', header: 'Età', width: 8, type: T.TEXT },
  { key: 'isee', header: 'ISEE', width: 12, type: T.NUMBER },
  { key: 'indiceIsee', header: 'Indice ISEE', width: 12, type: T.NUMBER },
  { key: 'indiceGravita', header: 'Indice gravità', width: 12, type: T.NUMBER },
  { key: 'punteggio', header: 'Punteggio', width: 12, type: T.NUMBER },
  { key: 'costoAnnuale', header: 'Costo annuale', width: 14, type: T.CURRENCY },
  { key: 'costoCaricoFamiglia', header: 'Costo carico famiglia', width: 14, type: T.CURRENCY },
  { key: 'altriFinanziamenti', header: 'Altri finanziamenti', width: 14, type: T.CURRENCY },
  { key: 'erogazioneRichiesta', header: 'Erogazione richiesta', width: 16, type: T.CURRENCY },
  { key: 'sostegnoScolastico', header: 'Sostegno scolastico', width: 14, type: T.TEXT },
  { key: 'continuazione', header: 'Continuazione', width: 12, type: T.TEXT },
  { key: 'motivoChiusura', header: 'Motivo chiusura', width: 24, type: T.TEXT },
  { key: 'dataChiusura', header: 'Data chiusura', width: 12, type: T.DATE },
  { key: 'iban', header: 'IBAN', width: 30, type: T.TEXT },
  { key: 'intestatario', header: 'Intestatario', width: 24, type: T.TEXT },
  { key: 'numGiustificativi', header: 'N. giustificativi', width: 12, type: T.NUMBER },
  { key: 'numContatti', header: 'N. contatti', width: 12, type: T.NUMBER }
]

export const CONTATTI_COLUMNS = [
  { key: 'idProgetto', header: 'ID Progetto', width: 38, type: T.TEXT },
  { key: 'famiglia', header: 'Famiglia', width: 30, type: T.TEXT },
  { key: 'ruolo', header: 'Ruolo', width: 14, type: T.TEXT },
  { key: 'nome', header: 'Nome', width: 18, type: T.TEXT },
  { key: 'cognome', header: 'Cognome', width: 18, type: T.TEXT },
  { key: 'emailPrimaria', header: 'Email primaria', width: 28, type: T.TEXT },
  { key: 'emailTutte', header: 'Email (tutte)', width: 36, type: T.TEXT },
  { key: 'cellulare', header: 'Cellulare', width: 16, type: T.TEXT },
  { key: 'telefono', header: 'Telefono', width: 16, type: T.TEXT },
  { key: 'indirizzo', header: 'Indirizzo', width: 26, type: T.TEXT },
  { key: 'citta', header: 'Città', width: 18, type: T.TEXT },
  { key: 'cap', header: 'CAP', width: 8, type: T.TEXT },
  { key: 'provincia', header: 'Provincia', width: 10, type: T.TEXT },
  { key: 'country', header: 'Country', width: 14, type: T.TEXT },
  { key: 'indirizzoDomicilio', header: 'Indirizzo domicilio', width: 26, type: T.TEXT },
  { key: 'cittaDomicilio', header: 'Città domicilio', width: 18, type: T.TEXT },
  { key: 'capDomicilio', header: 'CAP domicilio', width: 12, type: T.TEXT },
  { key: 'provinciaDomicilio', header: 'Provincia domicilio', width: 14, type: T.TEXT },
  { key: 'cittaNascita', header: 'Città nascita', width: 18, type: T.TEXT },
  { key: 'dataNascita', header: 'Data nascita', width: 12, type: T.DATE },
  { key: 'cf', header: 'Codice fiscale', width: 18, type: T.TEXT },
  { key: 'componenti', header: 'Componenti famiglia', width: 14, type: T.NUMBER },
  { key: 'beneficiario', header: 'Beneficiario', width: 18, type: T.TEXT },
  { key: 'cognomeSposata', header: 'Cognome da sposata', width: 18, type: T.TEXT },
  { key: 'iban', header: 'IBAN', width: 30, type: T.TEXT },
  { key: 'intestatario', header: 'Intestatario', width: 24, type: T.TEXT },
  { key: 'cointestatario', header: 'Cointestatario', width: 24, type: T.TEXT }
]

export const GIUSTIFICATIVI_COLUMNS = [
  { key: 'id', header: 'ID', width: 10, type: T.TEXT },
  { key: 'idProgetto', header: 'ID Progetto', width: 38, type: T.TEXT },
  { key: 'famiglia', header: 'Famiglia', width: 30, type: T.TEXT },
  { key: 'descrizione', header: 'Descrizione', width: 40, type: T.TEXT },
  { key: 'importo', header: 'Importo', width: 14, type: T.CURRENCY },
  { key: 'data', header: 'Data', width: 12, type: T.DATE },
  { key: 'stato', header: 'Stato', width: 14, type: T.TEXT },
  { key: 'rendicontazione', header: 'Rendicontazione', width: 24, type: T.TEXT },
  { key: 'tranche', header: 'Tranche', width: 12, type: T.TEXT },
  { key: 'invalidato', header: 'Invalidato', width: 10, type: T.TEXT },
  { key: 'notaVolontario', header: 'Nota volontario', width: 30, type: T.TEXT },
  { key: 'notaRifiuto', header: 'Nota rifiuto', width: 30, type: T.TEXT },
  { key: 'dataVerifica', header: 'Data verifica', width: 12, type: T.DATE },
  { key: 'dataPagamento', header: 'Data pagamento', width: 12, type: T.DATE },
  { key: 'pagamento', header: 'Pagamento', width: 12, type: T.TEXT },
  { key: 'allegato', header: 'Allegato', width: 30, type: T.TEXT }
]

function primaryEmail(emails = []) {
  return emails.find?.(e => e.Primary)?.email_address || emails[0]?.email_address || ''
}

function allEmails(emails = []) {
  return emails
    .map(e => e.email_address)
    .filter(Boolean)
    .join('; ')
}

export function buildInfoRows({ data, versione, progetti, contatti, giustificativi } = {}) {
  return [
    { campo: 'Data export', valore: data || '' },
    { campo: 'Versione app', valore: versione || '' },
    { campo: 'Progetti esportati', valore: String(progetti ?? '') },
    { campo: 'Contatti esportati', valore: String(contatti ?? '') },
    { campo: 'Giustificativi esportati', valore: String(giustificativi ?? '') }
  ]
}

function emailPrimaria(email = []) {
  return email.find?.(e => e.Primary)?.email_address || email[0]?.email_address || ''
}

export function buildFlatRows(rows = []) {
  return rows.map(row => {
    const base = {
      idProgetto: row.idProgetto,
      anno: row.annoBando,
      titolo: row.titolo,
      famiglia: row.famiglia,
      allocato: row.allocato,
      rendicontato: row.totaleRendicontato,
      pagato: row.totalePagato,
      statoRendicontazione: calcolaStatoRendicontazione(row.giustificativi || []),
      statoProgetto: statoProgettoLabel(row.statoProgetto),
      dataInizio: row.dataInizio,
      dataFine: row.dataFine,
      eta: row.eta,
      descrizione: row.descrizioneProgetto,
      ambito: row.ambito,
      iban: row.iban,
      intestatario: row.intestatario,
      stato: calcolaStatoRiga(row).label,
      totaleRendicontato: row.totaleRendicontato,
      totalePagato: row.totalePagato,
      residuoAllocato: row.residuoAllocato
    }

    const contatti = [...(row.contatti || [])]
      .sort((a, b) => new Date(b.DataCreazione) - new Date(a.DataCreazione))
      .slice(0, MAX_CONTATTI_PIATTO)
    for (let i = 1; i <= MAX_CONTATTI_PIATTO; i++) {
      const c = contatti[i - 1]
      base[`c${i}_nome`] = c?.Nome || ''
      base[`c${i}_cognome`] = c?.Cognome || ''
      base[`c${i}_citta`] = c?.Citta || ''
      base[`c${i}_email`] = emailPrimaria(c?.email)
      base[`c${i}_ruolo`] = c?.Ruolo || ''
    }

    const giustificativi = [...(row.giustificativi || [])]
      .filter(g => !g.Invalidato)
      .sort((a, b) => new Date(b.Data) - new Date(a.Data))
      .slice(0, MAX_GIUSTIFICATIVI_PIATTO)
    for (let i = 1; i <= MAX_GIUSTIFICATIVI_PIATTO; i++) {
      const g = giustificativi[i - 1]
      base[`g${i}_descrizione`] = g?.Descrizione || ''
      base[`g${i}_importo`] = g?.Importo || ''
      base[`g${i}_data`] = g?.Data || ''
      base[`g${i}_stato`] = g?.Stato || ''
      base[`g${i}_rendicontazione`] = g?.Rendicontazione || ''
      base[`g${i}_allegato`] = g?.Allegato || ''
    }

    return base
  })
}

export function buildProgettiRows(rows = [], contattiByFamiglia = {}) {
  return rows.map(row => ({
    idProgetto: row.idProgetto,
    annoBando: row.annoBando,
    famiglia: row.famiglia,
    beneficiario: row.beneficiario,
    titolo: row.titolo,
    ambito: row.ambito,
    statoProgetto: statoProgettoLabel(row.statoProgetto),
    statoRendicontazione: calcolaStatoRendicontazione(row.giustificativi || []),
    statoRiga: calcolaStatoRiga(row).label,
    percentualeRimborso: row.percentualeRimborso,
    allocato: row.allocato,
    totaleRendicontato: row.totaleRendicontato,
    totaleVerificato: row.totaleVerificato,
    totaleProposto: row.totaleProposto,
    totaleInPagamento: row.totaleInPagamento,
    totalePagato: row.totalePagato,
    residuoAllocato: row.residuoAllocato,
    totaleRimborsabile: row.totaleRimborsabile,
    residuoErogabile: residuoErogabile(row),
    dataInizio: row.dataInizio,
    dataFine: row.dataFine,
    eta: row.eta,
    isee: row.isee,
    indiceIsee: row.indiceIsee,
    indiceGravita: row.indiceGravita,
    punteggio: row.punteggio,
    costoAnnuale: row.costoAnnuale,
    costoCaricoFamiglia: row.costoCaricoFamiglia,
    altriFinanziamenti: row.altriFinanziamenti,
    erogazioneRichiesta: row.erogazioneRichiesta,
    sostegnoScolastico: row.sostegnoScolastico,
    continuazione: row.continuazione,
    motivoChiusura: row.motivoChiusura,
    dataChiusura: row.dataChiusura,
    iban: row.iban,
    intestatario: row.intestatario,
    numGiustificativi: (row.giustificativi || []).filter(g => !g.Invalidato).length,
    numContatti: (contattiByFamiglia[row.idFamiglia] || []).length
  }))
}

export function buildContattiRows(rows = [], contattiByFamiglia = {}) {
  const out = []
  for (const row of rows) {
    const contatti = contattiByFamiglia[row.idFamiglia] || []
    const sorted = [...contatti].sort(
      (a, b) =>
        String(a.Cognome || '').localeCompare(String(b.Cognome || '')) ||
        String(a.Nome || '').localeCompare(String(b.Nome || ''))
    )
    for (const c of sorted) {
      out.push({
        idProgetto: row.idProgetto,
        famiglia: row.famiglia,
        ruolo: c.Ruolo || '',
        nome: c.Nome || '',
        cognome: c.Cognome || '',
        emailPrimaria: primaryEmail(c._emails),
        emailTutte: allEmails(c._emails),
        cellulare: c.Numero_di_cellulare || '',
        telefono: c.Numero_di_telefono || '',
        indirizzo: c.Indirizzo || '',
        citta: c.Citta || '',
        cap: c.CAP || '',
        provincia: c.Provincia || '',
        country: c.Country || '',
        indirizzoDomicilio: c.Indirizzo_Domicilio || '',
        cittaDomicilio: c.Citta_Domicilio || '',
        capDomicilio: c.CAP_Domicilio || '',
        provinciaDomicilio: c.Provincia_domicilio || '',
        cittaNascita: c.Citta_Nascita || '',
        dataNascita: c.Data_di_nascita || '',
        cf: c.CF || '',
        componenti: c.Numero_componenti_famiglia ?? '',
        beneficiario: c.Beneficiario || '',
        cognomeSposata: c.Cognome_da_sposata || '',
        iban: c.IBAN || '',
        intestatario: c.Intestatario_CC || '',
        cointestatario: c.Cointestatario_CC || ''
      })
    }
  }
  return out
}

export function buildGiustificativiRows(rows = []) {
  const out = []
  for (const row of rows) {
    for (const g of row.giustificativi || []) {
      out.push({
        id: g.id,
        idProgetto: row.idProgetto,
        famiglia: row.famiglia,
        descrizione: g.Descrizione || '',
        importo: g.Importo,
        data: g.Data || '',
        stato: g.Stato || '',
        rendicontazione: g.Rendicontazione || '',
        tranche: g.Tranche || '',
        invalidato: g.Invalidato ? 'Sì' : 'No',
        notaVolontario: g.NotaVolontario || '',
        notaRifiuto: g.NotaRifiuto || '',
        dataVerifica: g.DataVerifica || '',
        dataPagamento: g.DataPagamento || '',
        pagamento: g.Pagamento || '',
        allegato: g.Allegato || ''
      })
    }
  }
  return out
}
