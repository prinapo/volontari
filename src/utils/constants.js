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
  'administrator',
  'admin'
]

export const VERIFICA_ROLE_IDS = (import.meta.env.VITE_VERIFICA_ROLE_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

export const STATI_GIUSTIFICATIVO = {
  DRAFT: 'draft',
  INVIATO: 'Inviato',
  VERIFICATO: 'Verificato',
  RIFIUTATO: 'Rifiutato',
  APPROVATO: 'approvato'
}

export const RUOLI_FAMIGLIA = {
  VOLONTARIO: 'Volontario',
  GENITORE: 'Genitore',
  TUTORE: 'Tutore'
}

export const TRANCHE_RENDICONTAZIONE = [
  { label: 'Luglio', value: 'luglio' },
  { label: 'Settembre', value: 'settembre' },
  { label: 'Novembre', value: 'novembre' },
  { label: 'Febbraio', value: 'febbraio' }
]

export const FILE_ACCEPT = '.jpg,.jpeg,.png,.gif,.heic,.pdf'
export const FILE_MAX_SIZE = 5 * 1024 * 1024

export const FOLDERS = {
  GIUSTIFICATIVI: '91a9c958-206f-4e1c-8143-e67f85398d0c',
  ISEE: 'd2253e77-177b-429e-b281-1ea0b7f5166c',
  PROGETTI: '81ed8d72-e82b-4d0f-8eda-1b564a2b8ca2'
}
