export const MANAGER_ROLE_NAMES = ['manager', 'admin']
export const ADMIN_ROLE_NAMES = ['admin']

export const ROLE_ACCESS = {
  manager: ['/verifica', '/riconciliazione', '/gestione'],
  admin: ['/verifica', '/riconciliazione', '/gestione', '/deduplica', '/admin', '/progetti/crea'],
  volontario: ['/famiglie']
}
