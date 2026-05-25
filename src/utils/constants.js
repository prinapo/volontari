export const API_URL = import.meta.env.VITE_API_URL || 'https://app.sostienilsostegno.com'

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token'
}

export const STATI_GIUSTIFICATIVO = {
  DRAFT: 'draft',
  INVIATO: 'Inviato',
  APPROVATO: 'approvato'
}

export const RUOLI_FAMIGLIA = {
  VOLONTARIO: 'Volontario',
  GENITORE: 'Genitore',
  TUTORE: 'Tutore'
}

export const FILE_ACCEPT = '.jpg,.jpeg,.png,.gif,.heic,.pdf'
export const FILE_MAX_SIZE = 5 * 1024 * 1024
