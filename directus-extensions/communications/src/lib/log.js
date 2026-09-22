import { makeItems } from './items.js'

const COLLECTION = 'Comunicazioni'
const JUNCTION = 'Comunicazioni_Contatti'

export async function createComunicazione(ctx, values) {
  const items = await makeItems(ctx, COLLECTION)
  return items.createOne(values)
}

export async function updateComunicazione(ctx, id, values) {
  const items = await makeItems(ctx, COLLECTION)
  return items.updateOne(id, values)
}

export async function logRecipient(ctx, values) {
  const items = await makeItems(ctx, JUNCTION)
  return items.createOne(values)
}
