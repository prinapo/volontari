import { famiglieService } from 'src/services/famiglie.service'
import { filesService } from 'src/services/files.service'

/**
 * Carica un file su Directus e lo rinomina con prefisso famiglia
 * @param {File} file - File da caricare
 * @param {string} famigliaId - ID della famiglia
 * @param {string} folder - ID della cartella Directus
 * @returns {Promise<string>} ID del file caricato
 */
export async function uploadAndPrefixFile(file, famigliaId, folder) {
  const uploadRes = await filesService.upload(file, folder)
  const fileId = uploadRes.data.data.id
  if (famigliaId) {
    const famRes = await famiglieService.getFamiglieBatch([famigliaId])
    const nomeFamiglia = famRes.data.data?.[0]?.Nome_Famiglia || ''
    if (nomeFamiglia) {
      await filesService.renameFile(fileId, `${nomeFamiglia}_${file.name}`)
    }
  }
  return fileId
}

/**
 * Marca un file come obsoleto rinominandolo con prefisso OBSOLETE_ e data
 * @param {string} fileId - ID del file Directus
 */
function normalizeFileId(fileId) {
  if (!fileId) return null
  return typeof fileId === 'object' ? fileId?.id : fileId
}

export async function markFileObsolete(fileId) {
  const id = normalizeFileId(fileId)
  if (!id) return
  const fileRes = await filesService.getFile(id)
  const origName = fileRes.data.data?.filename_download || 'file'
  const date = new Date().toISOString().slice(0, 10)
  await filesService.renameFile(id, `OBSOLETE_${date}_${origName}`)
}

/**
 * Marca un file come rifiutato rinominandolo con prefisso RIFIUTATO_ e data
 * @param {string} fileId - ID del file Directus
 */
export async function markFileRejected(fileId) {
  const id = normalizeFileId(fileId)
  if (!id) return
  const fileRes = await filesService.getFile(id)
  const origName = fileRes.data.data?.filename_download || 'file'
  const date = new Date().toISOString().slice(0, 10)
  await filesService.renameFile(id, `RIFIUTATO_${date}_${origName}`)
}
