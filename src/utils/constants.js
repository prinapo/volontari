export const API_URL = import.meta.env.VITE_API_URL || 'https://app.sostienilsostegno.com'

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token'
}

export const VERIFICA_ROLE_NAMES = [
  'verifica',
  'verificatore',
  'validatore',
  'validator',
  'gestoreverifica',
  'administrator',
  'admin'
]

export const VERIFICA_ROLE_IDS = (import.meta.env.VITE_VERIFICA_ROLE_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

export const GESTIONE_ROLE_NAMES = [
  'gestore volontari',
  'gestione',
  'gestoreverifica',
  'administrator',
  'admin'
]

export const GESTIONE_ROLE_IDS = (import.meta.env.VITE_GESTIONE_ROLE_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

export const ADMIN_ROLE_NAMES = [
  'administrator',
  'admin'
]

export const ADMIN_ROLE_IDS = (import.meta.env.VITE_ADMIN_ROLE_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

export const STATI_GIUSTIFICATIVO = {
  DRAFT: 'draft',
  INVIATO: 'inviato',
  VERIFICATO: 'verificato',
  RIFIUTATO: 'rifiutato',
  APPROVATO: 'approvato'
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
  APERTO: 'aperto',
  CHIUSO: 'chiuso'
}

export const FILE_ACCEPT = '.jpg,.jpeg,.png,.gif,.heic,.pdf'
export const FILE_MAX_SIZE = 5 * 1024 * 1024

export const FOLDERS = {
  INVII_PUBBLICI: import.meta.env.VITE_INVII_PUBBLICI_FOLDER
}
