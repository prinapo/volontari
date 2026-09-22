/**
 * Helper condiviso: crea un ItemsService con accountability admin (root).
 * L'endpoint è già protetto da `allowedToSend`: qui leggiamo/scriviamo i dati
 * di dominio senza i limiti field-scoped delle policy.
 *
 * @param {Object} ctx - context dell'endpoint: { services, getSchema, database }
 */
export async function makeItems(ctx, collection) {
  const schema = await ctx.getSchema()
  return new ctx.services.ItemsService(collection, {
    schema,
    accountability: { admin: true },
    knex: ctx.database
  })
}
