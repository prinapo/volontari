import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadAndPrefixFile, markFileObsolete, markFileRejected } from 'src/utils/file-naming'

const mockUpload = vi.fn()
const mockGetFamiglieBatch = vi.fn()
const mockRenameFile = vi.fn()
const mockGetFile = vi.fn()

vi.mock('src/services/files.service', () => ({
  filesService: {
    upload: (...a) => mockUpload(...a),
    renameFile: (...a) => mockRenameFile(...a),
    getFile: (...a) => mockGetFile(...a)
  }
}))

vi.mock('src/services/famiglie.service', () => ({
  famiglieService: {
    getFamiglieBatch: (...a) => mockGetFamiglieBatch(...a)
  }
}))

describe('uploadAndPrefixFile', () => {
  beforeEach(() => {
    mockUpload.mockReset()
    mockGetFamiglieBatch.mockReset()
    mockRenameFile.mockReset()
  })

  it('uploads and renames with famiglia name', async () => {
    mockUpload.mockResolvedValue({ data: { data: { id: 'file-1' } } })
    mockGetFamiglieBatch.mockResolvedValue({ data: { data: [{ Nome_Famiglia: 'Fam Test' }] } })
    mockRenameFile.mockResolvedValue({})

    const result = await uploadAndPrefixFile(new File(['content'], 'doc.pdf'), 'fam-1', 'folder-1')
    expect(result).toBe('file-1')
    expect(mockUpload).toHaveBeenCalledWith(expect.any(File), 'folder-1')
    expect(mockRenameFile).toHaveBeenCalledWith('file-1', 'Fam Test_doc.pdf')
  })

  it('uploads without rename when no famigliaId', async () => {
    mockUpload.mockResolvedValue({ data: { data: { id: 'file-2' } } })
    const result = await uploadAndPrefixFile(new File(['content'], 'doc.pdf'), null, 'folder-1')
    expect(result).toBe('file-2')
    expect(mockGetFamiglieBatch).not.toHaveBeenCalled()
  })
})

describe('markFileObsolete', () => {
  beforeEach(() => {
    mockGetFile.mockReset().mockResolvedValue({ data: { data: { filename_download: 'report.pdf' } } })
    mockRenameFile.mockReset().mockResolvedValue({})
  })

  it('renames file with OBSOLETE prefix', async () => {
    await markFileObsolete('file-1')
    expect(mockRenameFile).toHaveBeenCalled()
    const callArg = mockRenameFile.mock.calls[0][1]
    expect(callArg).toMatch(/^OBSOLETE_\d{4}-\d{2}-\d{2}_report\.pdf$/)
  })
})

describe('markFileRejected', () => {
  beforeEach(() => {
    mockGetFile.mockReset().mockResolvedValue({ data: { data: { filename_download: 'allegato.pdf' } } })
    mockRenameFile.mockReset().mockResolvedValue({})
  })

  it('renames file with RIFIUTATO prefix', async () => {
    await markFileRejected('file-1')
    expect(mockRenameFile).toHaveBeenCalled()
    const callArg = mockRenameFile.mock.calls[0][1]
    expect(callArg).toMatch(/^RIFIUTATO_\d{4}-\d{2}-\d{2}_allegato\.pdf$/)
  })
})
