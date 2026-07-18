const SESSION_LOG_KEY = 'session_events'

export function logSessionEvent(reason, detail = '') {
  try {
    const events = JSON.parse(localStorage.getItem(SESSION_LOG_KEY) || '[]')
    events.push({
      timestamp: new Date().toISOString(),
      reason,
      detail,
      url: typeof globalThis !== 'undefined' ? globalThis.location?.href || '' : '',
      userAgent: typeof navigator !== 'undefined' ? navigator?.userAgent?.slice(0, 200) || '' : ''
    })
    if (events.length > 50) events.splice(0, events.length - 50)
    localStorage.setItem(SESSION_LOG_KEY, JSON.stringify(events))
  } catch {
    /* silent */
  }
}
