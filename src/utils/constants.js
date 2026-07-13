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
  APERTO: 'aperto',
  CHIUSO: 'chiuso'
}

export const FILE_ACCEPT = '.jpg,.jpeg,.png,.gif,.heic,.pdf'
export const FILE_MAX_SIZE = 5 * 1024 * 1024

export const FOLDERS = {
  INVII_PUBBLICI: import.meta.env.VITE_INVII_PUBBLICI_FOLDER,
  LISTE_PAGAMENTI: import.meta.env.VITE_LISTE_PAGAMENTI_FOLDER
}
