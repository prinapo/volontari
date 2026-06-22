import { famiglieService } from 'src/services/famiglie.service'
import { filesService } from 'src/services/files.service'

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

export async function markFileObsolete(fileId) {
  const fileRes = await filesService.getFile(fileId)
  const origName = fileRes.data.data?.filename_download || 'file'
  const date = new Date().toISOString().slice(0, 10)
  await filesService.renameFile(fileId, `OBSOLETE_${date}_${origName}`)
}

export async function markFileRejected(fileId) {
  const fileRes = await filesService.getFile(fileId)
  const origName = fileRes.data.data?.filename_download || 'file'
  const date = new Date().toISOString().slice(0, 10)
  await filesService.renameFile(fileId, `RIFIUTATO_${date}_${origName}`)
}
