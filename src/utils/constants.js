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
export const STATI_PROGETTO_OPERATIVI = [STATO_PROGETTO.ACCETTATO, STATO_PROGETTO.IN_RENDICONTAZIONE]

// Stati finali (chiusi, non più in rendicontazione)
export const STATI_PROGETTO_FINALI = [STATO_PROGETTO.CHIUSO, STATO_PROGETTO.RIMBORSO_PARZIALE]

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
