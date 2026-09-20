export const API_URL = import.meta.env.VITE_API_URL || 'https://app.sostienilsostegno.com'

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_ID: 'user_id'
}

export const RUOLI_FAMIGLIA = {
  VOLONTARIO: 'Volontario',
  GENITORE: 'Genitore',
  TUTORE: 'Tutore',
  REFERENTE: 'Referente'
}

export const STATO_PAGAMENTO = {
  PROPOSTO: 'proposto',
  IN_PAGAMENTO: 'in_pagamento',
  PAGATO: 'pagato',
  FALLITO: 'fallito',
  ANNULLATO: 'annullato'
}

export const STATO_GIUSTIFICATIVO = {
  DRAFT: 'draft',
  INVIATO: 'inviato',
  VERIFICATO: 'verificato',
  RIFIUTATO: 'rifiutato',
  IN_PAGAMENTO: 'in_pagamento',
  PAGATO: 'pagato'
}

// Stati "verificato-equivalenti": contano per erogabile e TotaleVerificato.
// `pagato`/`in_pagamento` non concorrono più a nuove proposte ma restano
// contabilmente verificati.
export const STATI_GIUSTIFICATIVO_CONTABILI = [
  STATO_GIUSTIFICATIVO.VERIFICATO,
  STATO_GIUSTIFICATIVO.IN_PAGAMENTO,
  STATO_GIUSTIFICATIVO.PAGATO
]

// Stati che avviano la rendicontazione (per lo stato progetto).
export const STATI_GIUSTIFICATIVO_VALIDI = [STATO_GIUSTIFICATIVO.INVIATO, ...STATI_GIUSTIFICATIVO_CONTABILI]

// Stati della submission del modulo libero (InviiGiustificativiNoLogin).
// Il giustificativo nasce solo al riscontro, con Stato `inviato`.
export const STATO_SUBMISSION = {
  INSERITO: 'inserito',
  INVIATO: 'inviato',
  SCARTATO: 'scartato'
}

export const STATO_PROGETTO = {
  PROPOSTO: 'proposto',
  VALIDATO: 'validato',
  APPROVATO: 'approvato',
  ACCETTATO: 'accettato',
  IN_RENDICONTAZIONE: 'in_rendicontazione',
  CHIUSO: 'chiuso',
  RIMBORSO_PARZIALE: 'rimborso_parziale',
  // API compat: i progetti esistenti possono ancora avere il legacy 'aperto'
  APERTO: 'aperto'
}

// Stati operativi (per i quali è possibile caricare giustificativi)
export const STATI_PROGETTO_OPERATIVI = [
  STATO_PROGETTO.ACCETTATO,
  STATO_PROGETTO.IN_RENDICONTAZIONE,
  STATO_PROGETTO.RIMBORSO_PARZIALE
]

// Stati finali (progetto chiuso, non più operativo). Il rimborso parziale NON è
// finale: la famiglia può ancora inserire giustificativi fino al rimborso totale.
export const STATI_PROGETTO_FINALI = [STATO_PROGETTO.CHIUSO]

export const FILE_ACCEPT = '.jpg,.jpeg,.png,.gif,.heic,.pdf'
export const FILE_MAX_SIZE = 5 * 1024 * 1024

export const FOLDERS = {
  INVII_PUBBLICI: import.meta.env.VITE_INVII_PUBBLICI_FOLDER,
  LISTE_PAGAMENTI: import.meta.env.VITE_LISTE_PAGAMENTI_FOLDER,
  GIUSTIFICATIVI: import.meta.env.VITE_GIUSTIFICATIVI_FOLDER,
  ISEE: import.meta.env.VITE_ISEE_FOLDER,
  PROGETTI: import.meta.env.VITE_PROGETTI_FOLDER
}

export const SYNC = {
  ENABLED: import.meta.env.VITE_SYNC_ENABLED === 'true',
  ENDPOINT: import.meta.env.VITE_SYNC_ENDPOINT || '/sync/prod'
}
