/**
 * Esegue un'azione su più elementi isolando gli errori per elemento.
 * I fallimenti non interrompono il loop: si contano successi/errori.
 *
 * @param {Array} items - elementi da processare
 * @param {(item: *) => Promise<void>} action - azione asincrona per elemento
 * @param {Object} [options]
 * @param {(item: *, error: *) => void} [options.onError] - callback per elemento fallito
 * @returns {Promise<{successi: number, errori: number, totale: number}>}
 */
export async function runBulk(items, action, { onError } = {}) {
  let successi = 0
  let errori = 0
  for (const item of items) {
    try {
      await action(item)
      successi++
    } catch (error) {
      errori++
      if (onError) onError(item, error)
    }
  }
  return { successi, errori, totale: items.length }
}
