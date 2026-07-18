import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn(() => Promise.resolve({ data: {} }))
const mockPost = vi.fn(() => Promise.resolve({ data: {} }))
const mockPatch = vi.fn(() => Promise.resolve({ data: {} }))
const mockDelete = vi.fn(() => Promise.resolve({ data: {} }))

vi.mock('src/services/api', () => ({
  default: { get: mockGet, post: mockPost, patch: mockPatch, delete: mockDelete }
}))

describe('services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('admin.service', async () => {
    const { adminService } = await import('src/services/admin.service')
    await adminService.getUsers()
    expect(mockGet).toHaveBeenCalledWith('/users', expect.any(Object))
    await adminService.getRoles()
    expect(mockGet).toHaveBeenCalledWith('/roles', expect.any(Object))
    await adminService.sendEmail({ to: 'a@b.it' })
    expect(mockPost).toHaveBeenCalledWith('/mail', { to: 'a@b.it' })
    await adminService.searchContattoByEmail('a@b.it')
    expect(mockGet).toHaveBeenCalledWith('/items/email', expect.any(Object))
    await adminService.getProgetti({})
    expect(mockGet).toHaveBeenCalledWith('/items/Progetti', expect.any(Object))
    await adminService.updateProgetto(1, { Nome_Beneficiario: 'M' })
    expect(mockPatch).toHaveBeenCalledWith('/items/Progetti/1', { Nome_Beneficiario: 'M' })
  })

  it('associazioni.service', async () => {
    const { associazioniService } = await import('src/services/associazioni.service')
    await associazioniService.getAll()
    expect(mockGet).toHaveBeenCalledWith('/items/Associazioni', expect.any(Object))
    await associazioniService.create({ Nome: 'A' })
    expect(mockPost).toHaveBeenCalledWith('/items/Associazioni', { Nome: 'A' })
    await associazioniService.update(1, { Nome: 'B' })
    expect(mockPatch).toHaveBeenCalledWith('/items/Associazioni/1', { Nome: 'B' })
  })

  it('auth.service', async () => {
    const { authService } = await import('src/services/auth.service')
    await authService.login('a@b.it', 'pwd')
    expect(mockPost).toHaveBeenCalledWith('/auth/login', { email: 'a@b.it', password: 'pwd', mode: 'cookie' })
    await authService.logout('rtok')
    expect(mockPost).toHaveBeenCalledWith('/auth/logout', { mode: 'cookie' })
    await authService.getMe()
    expect(mockGet).toHaveBeenCalledWith('/users/me', expect.any(Object))
    await authService.getRole('r-1')
    expect(mockGet).toHaveBeenCalledWith('/roles/r-1', expect.any(Object))
    await authService.requestPasswordReset('a@b.it')
    expect(mockPost).toHaveBeenCalledWith('/auth/password/request', { email: 'a@b.it' })
    await authService.requestPasswordReset('a@b.it', 'https://app/reset')
    expect(mockPost).toHaveBeenCalledWith('/auth/password/request', {
      email: 'a@b.it',
      reset_url: 'https://app/reset'
    })
    await authService.resetPassword('reset-token', 'secret')
    expect(mockPost).toHaveBeenCalledWith('/auth/password/reset', { token: 'reset-token', password: 'secret' })
    await authService.changePassword('new-secret')
    expect(mockPatch).toHaveBeenCalledWith('/users/me', { password: 'new-secret' })
  })

  it('contatti.service — CRUD', async () => {
    const { contattiService } = await import('src/services/contatti.service')
    await contattiService.getByUserId('u-1')
    expect(mockGet).toHaveBeenCalledWith(
      '/items/contatti',
      expect.objectContaining({
        params: expect.objectContaining({ 'filter[user_id][_eq]': 'u-1' })
      })
    )
    await contattiService.getByEmail('A@B.IT')
    expect(mockGet).toHaveBeenCalledWith(
      '/items/contatti',
      expect.objectContaining({
        params: expect.objectContaining({ 'filter[email][email_address][_eq]': 'a@b.it' })
      })
    )
    await contattiService.getById('c-1')
    expect(mockGet).toHaveBeenCalledWith('/items/contatti/c-1', expect.any(Object))
    await contattiService.create({ Nome: 'M' })
    expect(mockPost).toHaveBeenCalledWith('/items/contatti', { Nome: 'M' })
    await contattiService.update('c-1', { Nome: 'N' })
    expect(mockPatch).toHaveBeenCalledWith('/items/contatti/c-1', { Nome: 'N' })
  })

  it('contatti.service — query variants', async () => {
    const { contattiService } = await import('src/services/contatti.service')

    await contattiService.getByEmails(['A@B.IT', 'B@C.IT'])
    expect(mockGet).toHaveBeenCalledWith(
      '/items/contatti',
      expect.objectContaining({
        params: expect.objectContaining({ 'filter[email][email_address][_in]': 'a@b.it,b@c.it' })
      })
    )

    await contattiService.search('', false)
    expect(mockGet).toHaveBeenCalledWith('/items/contatti', {
      params: {
        fields: 'id_contatto,Nome,Cognome,email.email_address,email.Primary',
        limit: 20
      }
    })

    await contattiService.search('test', true)
    expect(mockGet).toHaveBeenCalledWith(
      '/items/contatti',
      expect.objectContaining({
        params: expect.objectContaining({
          filter: expect.stringContaining('user_id')
        })
      })
    )

    await contattiService.query({
      limit: 25,
      offset: 10,
      search: 'Mario',
      isVolontario: true,
      stato: 'Attivi'
    })
    expect(mockGet).toHaveBeenCalledWith(
      '/items/contatti',
      expect.objectContaining({
        params: expect.objectContaining({
          offset: 10,
          meta: 'filter_count',
          filter: expect.stringContaining('IsVolontario')
        })
      })
    )

    await contattiService.query({ isGenitore: true })
    expect(mockGet).toHaveBeenCalledWith(
      '/items/contatti',
      expect.objectContaining({
        params: expect.objectContaining({
          filter: expect.stringContaining('IsGenitore')
        })
      })
    )

    await contattiService.query({ isReferente: true })
    expect(mockGet).toHaveBeenCalledWith(
      '/items/contatti',
      expect.objectContaining({
        params: expect.objectContaining({
          filter: expect.stringContaining('IsReferente')
        })
      })
    )

    await contattiService.query({ isVolontario: false, isGenitore: false, isReferente: false, stato: 'Disattivati' })
    expect(mockGet).toHaveBeenCalledWith(
      '/items/contatti',
      expect.objectContaining({
        params: expect.objectContaining({
          filter: expect.stringContaining('suspended')
        })
      })
    )

    await contattiService.getVolontariSenzaUtente()
    expect(mockGet).toHaveBeenCalledWith(
      '/items/contatti',
      expect.objectContaining({
        params: expect.objectContaining({ 'filter[user_id][_null]': true })
      })
    )
  })

  it('email.service', async () => {
    const { emailService } = await import('src/services/email.service')
    await emailService.getByContatto(['c-1'])
    expect(mockGet).toHaveBeenCalledWith('/items/email', expect.any(Object))
    await emailService.getAllByContatto('c-1')
    expect(mockGet).toHaveBeenCalledWith('/items/email', expect.any(Object))
    await emailService.getRecordByContatto('c-1')
    expect(mockGet).toHaveBeenCalledWith('/items/email', expect.any(Object))
    await emailService.create({ email_address: 'a@b.it' })
    expect(mockPost).toHaveBeenCalledWith('/items/email', { email_address: 'a@b.it' })
    await emailService.update('e-1', { email_address: 'b@b.it' })
    expect(mockPatch).toHaveBeenCalledWith('/items/email/e-1', { email_address: 'b@b.it' })
    await emailService.remove('e-1')
    expect(mockDelete).toHaveBeenCalledWith('/items/email/e-1')
  })

  it('error-log.service', async () => {
    const { errorLogService } = await import('src/services/error-log.service')
    await errorLogService.log({ level: 'error', message: 'test' })
    expect(mockPost).toHaveBeenCalledWith('/items/ErrorLog', { level: 'error', message: 'test' })
    await errorLogService.getAll()
    expect(mockGet).toHaveBeenCalledWith('/items/ErrorLog', expect.any(Object))
    await errorLogService.markAsRead(1)
    expect(mockPatch).toHaveBeenCalledWith('/items/ErrorLog/1', { read: true })
    await errorLogService.delete(1)
    expect(mockDelete).toHaveBeenCalledWith('/items/ErrorLog/1')
  })

  it('famiglie.service', async () => {
    const { famiglieService } = await import('src/services/famiglie.service')
    await famiglieService.getFamiglieByVolontario('c-1')
    expect(mockGet).toHaveBeenCalledWith('/items/Famiglie_Contatti', expect.any(Object))
    await famiglieService.getById('fam-1')
    expect(mockGet).toHaveBeenCalledWith('/items/Famiglie/fam-1', expect.any(Object))
    await famiglieService.getFamiglieBatch(['fam-1'])
    expect(mockGet).toHaveBeenCalledWith('/items/Famiglie', expect.any(Object))
    await famiglieService.update('fam-1', { IBAN: 'IT00' })
    expect(mockPatch).toHaveBeenCalledWith('/items/Famiglie/fam-1', { IBAN: 'IT00' })
    await famiglieService.getGenitoriByFamiglia('fam-1')
    expect(mockGet).toHaveBeenCalledWith('/items/Famiglie_Contatti', expect.any(Object))
    await famiglieService.getVolontariByFamiglia('fam-1')
    expect(mockGet).toHaveBeenCalledWith('/items/Famiglie_Contatti', expect.any(Object))
    await famiglieService.getFamiglieByContatto('c-1')
    expect(mockGet).toHaveBeenCalledWith(
      '/items/Famiglie_Contatti',
      expect.objectContaining({
        params: expect.objectContaining({
          filter: expect.stringContaining('"Contatto"')
        })
      })
    )
  })

  it('files.service', async () => {
    const { filesService } = await import('src/services/files.service')
    await filesService.upload(new File([], 'x.pdf'), 'folder-1')
    expect(mockPost).toHaveBeenCalledWith('/files', expect.any(FormData))
    await filesService.updateMeta('f-1', { title: 'x' })
    expect(mockPatch).toHaveBeenCalledWith('/files/f-1', { title: 'x' })
    await filesService.updateFolder('f-1', 'folder-2')
    expect(mockPatch).toHaveBeenCalledWith('/files/f-1', { folder: 'folder-2' })
    await filesService.renameFile('f-1', 'new.pdf')
    expect(mockPatch).toHaveBeenCalledWith('/files/f-1', { filename_download: 'new.pdf' })
    await filesService.getFile('f-1')
    expect(mockGet).toHaveBeenCalledWith('/files/f-1')
    await filesService.delete('f-1')
    expect(mockDelete).toHaveBeenCalledWith('/files/f-1')
  })

  it('gestione.service', async () => {
    const { gestioneService } = await import('src/services/gestione.service')

    await gestioneService.getFamiglie({
      page: 2,
      limit: 10,
      sort: '-Nome_Famiglia',
      search: 'Rossi',
      meta: 'filter_count',
      famigliaIds: ['fam-1', 'fam-2'],
      excludeIds: ['fam-3']
    })
    expect(mockGet).toHaveBeenCalledWith(
      '/items/Famiglie',
      expect.objectContaining({
        params: expect.objectContaining({
          page: 2,
          limit: 10,
          sort: '-Nome_Famiglia',
          meta: 'filter_count',
          'filter[Nome_Famiglia][_icontains]': 'Rossi',
          'filter[id_famiglia][_in]': 'fam-1,fam-2',
          'filter[id_famiglia][_nin]': 'fam-3'
        })
      })
    )

    await gestioneService.createFamiglia({ Nome_Famiglia: 'F' })
    expect(mockPost).toHaveBeenCalledWith('/items/Famiglie', { Nome_Famiglia: 'F' })
    await gestioneService.updateFamiglia(1, { Nome_Famiglia: 'F2' })
    expect(mockPatch).toHaveBeenCalledWith('/items/Famiglie/1', { Nome_Famiglia: 'F2' })
    await gestioneService.searchFamiglie('rossi')
    expect(mockGet).toHaveBeenCalledWith(
      '/items/Famiglie',
      expect.objectContaining({
        params: expect.objectContaining({ 'filter[Nome_Famiglia][_icontains]': 'rossi' })
      })
    )
    await gestioneService.getFamiglieByContatto('cont-1')
    expect(mockGet).toHaveBeenCalledWith(
      '/items/Famiglie_Contatti',
      expect.objectContaining({
        params: expect.objectContaining({
          filter: expect.stringContaining('"Contatto"')
        })
      })
    )
    await gestioneService.queryFamiglieContatti(['cont-1', 'cont-2'])
    expect(mockGet).toHaveBeenCalledWith(
      '/items/Famiglie_Contatti',
      expect.objectContaining({
        params: expect.objectContaining({
          filter: expect.stringContaining('"Contatto"'),
          limit: -1
        })
      })
    )
    await gestioneService.getContattiByFamiglia('fam-1')
    expect(mockGet).toHaveBeenCalledWith(
      '/items/Famiglie_Contatti',
      expect.objectContaining({
        params: expect.objectContaining({ filter: expect.stringContaining('fam-1') })
      })
    )

    mockGet.mockResolvedValueOnce({ data: { data: [{ id: 'active-1' }] } })
    await expect(
      gestioneService.assignToFamiglia({
        Contatto: 'cont-1',
        Famiglia: 'fam-1',
        Ruolo_nella_Famiglia: 'Genitore'
      })
    ).resolves.toBeUndefined()

    mockGet
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: [{ id: 'inactive-1' }] } })
    await gestioneService.assignToFamiglia({
      Contatto: 'cont-1',
      Famiglia: 'fam-1',
      Ruolo_nella_Famiglia: 'Genitore'
    })
    expect(mockPatch).toHaveBeenCalledWith('/items/Famiglie_Contatti/inactive-1', { Disattivo: false })

    mockGet.mockResolvedValueOnce({ data: { data: [] } }).mockResolvedValueOnce({ data: { data: [] } })
    await gestioneService.assignToFamiglia({
      Contatto: 'cont-2',
      Famiglia: 'fam-2',
      Ruolo_nella_Famiglia: 'Volontario'
    })
    expect(mockPost).toHaveBeenCalledWith('/items/Famiglie_Contatti', {
      Contatto: 'cont-2',
      Famiglia: 'fam-2',
      Ruolo_nella_Famiglia: 'Volontario'
    })

    await gestioneService.removeFromFamiglia('fc-1')
    expect(mockPatch).toHaveBeenCalledWith('/items/Famiglie_Contatti/fc-1', { Disattivo: true })

    expect(await gestioneService.checkFamiglieVolontari([])).toEqual({ data: { data: [] } })
    expect(mockGet).not.toHaveBeenCalledWith(
      '/items/Famiglie_Contatti',
      expect.objectContaining({
        params: expect.objectContaining({ 'filter[Famiglia][_in]': '' })
      })
    )

    await gestioneService.checkFamiglieVolontari(['fam-1'])
    expect(mockGet).toHaveBeenCalledWith(
      '/items/Famiglie_Contatti',
      expect.objectContaining({
        params: expect.objectContaining({ 'filter[Famiglia][_in]': 'fam-1' })
      })
    )

    await gestioneService.checkAllFamiglieVolontari()
    expect(mockGet).toHaveBeenCalledWith(
      '/items/Famiglie_Contatti',
      expect.objectContaining({
        params: expect.objectContaining({
          'filter[Ruolo_nella_Famiglia][_eq]': 'Volontario',
          limit: -1
        })
      })
    )
  })

  it('giustificativi.service', async () => {
    const { giustificativiService } = await import('src/services/giustificativi.service')
    await giustificativiService.getByProgetto(1)
    expect(mockGet).toHaveBeenCalledWith('/items/Giustificativi', expect.any(Object))
    await giustificativiService.create({ Descrizione: 'test' })
    expect(mockPost).toHaveBeenCalledWith('/items/Giustificativi', { Descrizione: 'test' })
    await giustificativiService.update(1, { Descrizione: 'upd' })
    expect(mockPatch).toHaveBeenCalledWith('/items/Giustificativi/1', { Descrizione: 'upd' })
    await giustificativiService.submit(1)
    expect(mockPatch).toHaveBeenCalledWith('/items/Giustificativi/1', { Stato: 'inviato' })
    await giustificativiService.invalidate(1)
    expect(mockPatch).toHaveBeenCalledWith('/items/Giustificativi/1', { Invalidato: true })
    await giustificativiService.verify(1)
    expect(mockPatch).toHaveBeenCalledWith('/items/Giustificativi/1', { Stato: 'verificato' })
    await giustificativiService.reject(1, 'nota')
    expect(mockPatch).toHaveBeenCalledWith('/items/Giustificativi/1', { Stato: 'rifiutato', NotaRifiuto: 'nota' })
  })

  it('pagamenti.service', async () => {
    const { pagamentiService } = await import('src/services/pagamenti.service')
    await pagamentiService.getPagamenti({ stato: 'proposto' })
    expect(mockGet).toHaveBeenCalledWith('/items/Pagamenti', { params: { stato: 'proposto' } })
    await pagamentiService.createPagamento({ Importo: 100 })
    expect(mockPost).toHaveBeenCalledWith('/items/Pagamenti', { Importo: 100 })
    await pagamentiService.updatePagamento(1, { Importo: 200 })
    expect(mockPatch).toHaveBeenCalledWith('/items/Pagamenti/1', { Importo: 200 })
    await pagamentiService.deletePagamento(1)
    expect(mockDelete).toHaveBeenCalledWith('/items/Pagamenti/1')
    await pagamentiService.getBatches({ limit: -1 })
    expect(mockGet).toHaveBeenCalledWith('/items/BatchPagamenti', { params: { limit: -1 } })
    await pagamentiService.createBatch({ Nome: 'B1' })
    expect(mockPost).toHaveBeenCalledWith('/items/BatchPagamenti', { Nome: 'B1' })
  })

  it('liste-pagamenti.service', async () => {
    const { listePagamentiService } = await import('src/services/liste-pagamenti.service')
    mockGet.mockResolvedValueOnce({ data: { data: [{ id: 'l-1' }] } })
    expect(await listePagamentiService.getAll()).toEqual([{ id: 'l-1' }])
    expect(mockGet).toHaveBeenCalledWith('/items/ListePagamenti', { params: { sort: '-DataCreazione' } })

    mockPost.mockResolvedValueOnce({ data: { data: { id: 'l-2' } } })
    expect(await listePagamentiService.create({ Nome: 'Lista' })).toEqual({ id: 'l-2' })
    expect(mockPost).toHaveBeenCalledWith('/items/ListePagamenti', { Nome: 'Lista' })

    await listePagamentiService.delete('l-1')
    expect(mockDelete).toHaveBeenCalledWith('/items/ListePagamenti/l-1')

    mockPost.mockResolvedValueOnce({ data: { data: { id: 'file-1' } } })
    expect(await listePagamentiService.uploadCsv('a;b', 'Lista giugno/2026')).toBe('file-1')
    expect(mockPost).toHaveBeenCalledWith('/files', expect.any(FormData))

    await listePagamentiService.deleteFile('file-1')
    expect(mockDelete).toHaveBeenCalledWith('/files/file-1')
  })

  it('progetti.service', async () => {
    const { progettiService } = await import('src/services/progetti.service')
    await progettiService.getById(1)
    expect(mockGet).toHaveBeenCalledWith('/items/Progetti/1')
    await progettiService.updateStats(1, { TotaleVerificato: 100 })
    expect(mockPatch).toHaveBeenCalledWith('/items/Progetti/1', { TotaleVerificato: 100 })
    await progettiService.createProgetto({ Titolo_Progetto: 'Test' })
    expect(mockPost).toHaveBeenCalledWith('/items/Progetti', { Titolo_Progetto: 'Test' })
    await progettiService.createAllegato('Progetti_files', { directus_files_id: 'f-1' })
    expect(mockPost).toHaveBeenCalledWith('/items/Progetti_files', { directus_files_id: 'f-1' })
  })

  it('referenti.service', async () => {
    const { referentiService } = await import('src/services/referenti.service')
    await referentiService.getByVolontario('v-1')
    expect(mockGet).toHaveBeenCalledWith('/items/Volontari_Referenti', expect.any(Object))
    await referentiService.getByVolontari(['v-1'])
    expect(mockGet).toHaveBeenCalledWith('/items/Volontari_Referenti', expect.any(Object))
    await referentiService.create('v-1', 'r-1')
    expect(mockPost).toHaveBeenCalledWith('/items/Volontari_Referenti', { Volontario: 'v-1', Referente: 'r-1' })
    await referentiService.remove('rel-1')
    expect(mockDelete).toHaveBeenCalledWith('/items/Volontari_Referenti/rel-1')
  })

  it('giustificativi.service — rendicontazioni methods', async () => {
    const { giustificativiService } = await import('src/services/giustificativi.service')
    await giustificativiService.findByProject({ famigliaId: 'fam-1', progettoId: 1 })
    expect(mockGet).toHaveBeenCalledWith('/items/Rendicontazioni', expect.any(Object))
    await giustificativiService.createRendicontazione({ Famiglia: 'fam-1', Progetto: 1 })
    expect(mockPost).toHaveBeenCalledWith('/items/Rendicontazioni', { Famiglia: 'fam-1', Progetto: 1 })
  })

  it('submit.service', async () => {
    const { submitService } = await import('src/services/submit.service')
    await submitService.createSubmission({ email: 'a@b.it' })
    expect(mockPost).toHaveBeenCalledWith('/items/InviiGiustificativiNoLogin', { email: 'a@b.it' })
  })

  it('users.service', async () => {
    const { usersService } = await import('src/services/users.service')
    await usersService.getByIds(['u-1'])
    expect(mockGet).toHaveBeenCalledWith('/users', expect.any(Object))
    await usersService.searchByEmail('a@b.it')
    expect(mockGet).toHaveBeenCalledWith('/users', expect.any(Object))
    await usersService.create({ email: 'a@b.it' })
    expect(mockPost).toHaveBeenCalledWith('/users', { email: 'a@b.it' })
    await usersService.update('u-1', { status: 'active' })
    expect(mockPatch).toHaveBeenCalledWith('/users/u-1', { status: 'active' })
    await usersService.sendInvite('a@b.it', 'http://reset')
    expect(mockPost).toHaveBeenCalledWith('/auth/password/request', { email: 'a@b.it', reset_url: 'http://reset' })
    await usersService.getRoleByName('Volontario')
    expect(mockGet).toHaveBeenCalledWith('/roles', expect.any(Object))
  })

  it('verifica.service — getProgetti', async () => {
    const { verificaService } = await import('src/services/verifica.service')
    await verificaService.getProgetti()
    expect(mockGet).toHaveBeenCalledWith(
      '/items/Progetti',
      expect.objectContaining({
        params: expect.objectContaining({
          page: 1,
          limit: 25,
          sort: 'Famiglia,AnnoBando,Cognome_Beneficiario,Nome_Beneficiario'
        })
      })
    )

    await verificaService.getProgetti({
      search: 'test',
      anno: 2024,
      rendicontazioneFilter: 'verificato',
      meta: 'filter_count'
    })
    expect(mockGet).toHaveBeenCalledWith(
      '/items/Progetti',
      expect.objectContaining({
        params: expect.objectContaining({
          meta: 'filter_count',
          filter: expect.stringContaining('verificato')
        })
      })
    )
  })

  it('verifica.service — giustificativi e submissions', async () => {
    const { verificaService } = await import('src/services/verifica.service')
    await verificaService.getGiustificativiByProgetti([1, 2])
    expect(mockGet).toHaveBeenCalledWith(
      '/items/Giustificativi',
      expect.objectContaining({
        params: expect.objectContaining({ 'filter[Progetto][_in]': '1,2' })
      })
    )
    await verificaService.getGiustificativiByProgetto(7)
    expect(mockGet).toHaveBeenCalledWith(
      '/items/Giustificativi',
      expect.objectContaining({
        params: expect.objectContaining({ 'filter[Progetto][_in]': '7' })
      })
    )
    await verificaService.getGiustificativiByProgettiLight([3, 4])
    expect(mockGet).toHaveBeenCalledWith(
      '/items/Giustificativi',
      expect.objectContaining({
        params: expect.objectContaining({
          fields: 'id,Descrizione,Importo,Data,Stato,Allegato,Progetto,Invalidato,Rendicontazione'
        })
      })
    )
    await verificaService.getAnniBando()
    expect(mockGet).toHaveBeenCalledWith('/items/Progetti', expect.any(Object))
    await verificaService.getRendicontazioniBatch(['r-1', 'r-2'])
    expect(mockGet).toHaveBeenCalledWith(
      '/items/Rendicontazioni',
      expect.objectContaining({
        params: expect.objectContaining({ 'filter[id][_in]': 'r-1,r-2' })
      })
    )
    await verificaService.getRendicontazioniBatch('r-3')
    expect(mockGet).toHaveBeenCalledWith(
      '/items/Rendicontazioni',
      expect.objectContaining({
        params: expect.objectContaining({ 'filter[id][_in]': 'r-3' })
      })
    )
    await verificaService.getSubmissions({ includeScartati: true })
    expect(mockGet).toHaveBeenCalledWith(
      '/items/InviiGiustificativiNoLogin',
      expect.objectContaining({
        params: expect.objectContaining({ filter: expect.stringContaining('scartato') })
      })
    )
    await verificaService.getSubmissions({ includeScartati: false, meta: 'filter_count' })
    expect(mockGet).toHaveBeenCalledWith(
      '/items/InviiGiustificativiNoLogin',
      expect.objectContaining({
        params: expect.objectContaining({
          meta: 'filter_count',
          filter: expect.stringContaining('in_attesa')
        })
      })
    )
    await verificaService.getSubmissionsInAttesa()
    expect(mockGet).toHaveBeenCalledWith(
      '/items/InviiGiustificativiNoLogin',
      expect.objectContaining({
        params: expect.objectContaining({ limit: -1 })
      })
    )
    await verificaService.updateSubmission('s-1', { stato: 'riconciliato' })
    expect(mockPatch).toHaveBeenCalledWith('/items/InviiGiustificativiNoLogin/s-1', { stato: 'riconciliato' })
  })

  it('verifica.service — famiglia e progetto', async () => {
    const { verificaService } = await import('src/services/verifica.service')
    await verificaService.findProgettoByFamiglia('fam-1')
    expect(mockGet).toHaveBeenCalledWith(
      '/items/Progetti',
      expect.objectContaining({
        params: expect.objectContaining({ 'filter[Famiglia][_eq]': 'fam-1', limit: -1 })
      })
    )
    await verificaService.updateProgetto(1, { StatoRendicontazione: 'verificato' })
    expect(mockPatch).toHaveBeenCalledWith('/items/Progetti/1', { StatoRendicontazione: 'verificato' })
    await verificaService.searchFamiglie('test')
    expect(mockGet).toHaveBeenCalledWith(
      '/items/Famiglie',
      expect.objectContaining({
        limit: 20,
        fields: 'id_famiglia,Nome_Famiglia,IBAN,Intestatario_CC',
        'filter[Nome_Famiglia][_icontains]': 'test'
      })
    )
    await verificaService.searchFamiglie('   ')
    expect(mockGet).toHaveBeenCalledWith('/items/Famiglie', {
      limit: 20,
      fields: 'id_famiglia,Nome_Famiglia,IBAN,Intestatario_CC'
    })
    await verificaService.findFamigliaByIBAN('IT00', 'Mario')
    expect(mockGet).toHaveBeenCalledWith(
      '/items/Famiglie',
      expect.objectContaining({
        params: expect.objectContaining({
          'filter[IBAN][_eq]': 'IT00',
          'filter[Intestatario_CC][_eq]': 'Mario'
        })
      })
    )
  })
})
