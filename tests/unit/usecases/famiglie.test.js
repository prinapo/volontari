import { describe, it, expect, vi, beforeEach } from 'vitest'
import { aggiornaContatto, assegnaAFamiglia, creaGenitore, creaUtentePerVolontario } from 'src/usecases/famiglie'

const mockGetContattoById = vi.fn()
const mockGetContattoByEmails = vi.fn()
const mockCreateContatto = vi.fn()
const mockUpdateContatto = vi.fn()
const mockCreateEmail = vi.fn()
const mockUpdateEmail = vi.fn()
const mockGetEmailRecord = vi.fn()
const mockSearchEmail = vi.fn()
const mockCreateUser = vi.fn()
const mockUpdateUser = vi.fn()
const mockGetRoleByName = vi.fn()
const mockAssignToFamiglia = vi.fn()

vi.mock('src/services/contatti.service', () => ({
  contattiService: {
    getById: (...a) => mockGetContattoById(...a),
    getByEmails: (...a) => mockGetContattoByEmails(...a),
    create: (...a) => mockCreateContatto(...a),
    update: (...a) => mockUpdateContatto(...a)
  }
}))

vi.mock('src/services/email.service', () => ({
  emailService: {
    createSafe: (...a) => mockCreateEmail(...a),
    updateSafe: (...a) => mockUpdateEmail(...a),
    getRecordByContatto: (...a) => mockGetEmailRecord(...a)
  }
}))

vi.mock('src/services/users.service', () => ({
  usersService: {
    searchByEmail: (...a) => mockSearchEmail(...a),
    create: (...a) => mockCreateUser(...a),
    update: (...a) => mockUpdateUser(...a),
    getRoleByName: (...a) => mockGetRoleByName(...a),
    getByIds: vi.fn(() => Promise.resolve({ data: { data: [{ role: 'role-vol' }] } }))
  }
}))

vi.mock('src/services/gestione.service', () => ({
  gestioneService: {
    assignToFamiglia: (...a) => mockAssignToFamiglia(...a)
  }
}))

describe('creaUtentePerVolontario (findOrCreateUser)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('crea l’utente per il contatto con email', async () => {
    mockGetContattoById.mockResolvedValue({
      data: { data: { id_contatto: 'c-1', email: [{ Primary: true, email_address: 'v@r.it' }], user_id: null } }
    })
    mockSearchEmail.mockResolvedValue({ data: { data: [] } })
    mockGetRoleByName.mockResolvedValue({ data: { data: [{ id: 'role-vol' }] } })
    mockCreateUser.mockResolvedValue({ data: { data: { id: 'u-1' } } })
    mockUpdateContatto.mockResolvedValue({})

    const res = await creaUtentePerVolontario('c-1')
    expect(mockCreateUser).toHaveBeenCalled()
    expect(res).toEqual({ success: true, contatto: expect.any(Object) })
  })

  it('ritorna errore se il contatto manca', async () => {
    mockGetContattoById.mockResolvedValueOnce({ data: { data: null } })
    await expect(creaUtentePerVolontario('c-0')).rejects.toThrow('Contatto non trovato')
  })

  it('riusa l’utente esistente e salta se l’email manca', async () => {
    mockGetContattoById.mockResolvedValueOnce({ data: { data: { id_contatto: 'c-1', user_id: 'u-1' } } })
    await expect(creaUtentePerVolontario('c-1')).resolves.toEqual(expect.objectContaining({ success: true }))

    mockGetContattoById.mockResolvedValueOnce({ data: { data: { id_contatto: 'c-2', email: [] } } })
    await expect(creaUtentePerVolontario('c-2')).rejects.toThrow('Email mancante')
  })

  it('segnala ruolo volontario non trovato', async () => {
    mockGetContattoById.mockResolvedValueOnce({
      data: { data: { id_contatto: 'c-3', email: [{ email_address: 'a@b.it', Primary: true }] } }
    })
    mockSearchEmail.mockResolvedValueOnce({ data: { data: [] } })
    mockGetRoleByName.mockResolvedValueOnce({ data: { data: [] } })
    await expect(creaUtentePerVolontario('c-3')).rejects.toThrow(
      "Ruolo Volontario non trovato in Directus. Contatta l'amministratore."
    )
  })
})

describe('assegnaAFamiglia / creaGenitore / aggiornaContatto', () => {
  beforeEach(() => vi.clearAllMocks())

  it('assegna volontario e blocca senza email', async () => {
    mockGetContattoById.mockResolvedValue({ data: { data: { id_contatto: 'c-9', email: [] } } })
    await expect(assegnaAFamiglia('c-9', 'fam-1', 'Volontario')).rejects.toThrow('Email mancante')
    expect(mockAssignToFamiglia).not.toHaveBeenCalled()

    mockGetContattoById.mockResolvedValue({
      data: { data: { id_contatto: 'c-1', email: [{ Primary: true, email_address: 'v@r.it' }] } }
    })
    mockSearchEmail.mockResolvedValue({ data: { data: [] } })
    mockGetRoleByName.mockResolvedValue({ data: { data: [{ id: 'role-vol' }] } })
    mockCreateUser.mockResolvedValue({ data: { data: { id: 'u-1' } } })
    mockUpdateContatto.mockResolvedValue({})
    mockAssignToFamiglia.mockResolvedValue({})

    await assegnaAFamiglia('c-1', 'fam-1', 'Volontario')
    expect(mockAssignToFamiglia).toHaveBeenCalled()
  })

  it('creaGenitore blocca email duplicate', async () => {
    mockGetContattoByEmails.mockResolvedValueOnce({ data: { data: [{ id_contatto: 'c-other' }] } })
    await expect(creaGenitore({ Email: 'a@b.it' })).rejects.toThrow('Email duplicata')
  })

  it('creaGenitore crea contatto + email + flag referente', async () => {
    mockGetContattoByEmails.mockResolvedValueOnce({ data: { data: [] } })
    mockCreateContatto.mockResolvedValueOnce({ data: { data: { id_contatto: 'c-new' } } })
    mockCreateEmail.mockResolvedValueOnce({})
    mockUpdateContatto.mockResolvedValueOnce({})
    const id = await creaGenitore({ Email: 'g@b.it', IsReferente: true })
    expect(id).toBe('c-new')
    expect(mockCreateEmail).toHaveBeenCalledWith(expect.objectContaining({ email_address: 'g@b.it', Primary: true }))
    expect(mockUpdateContatto).toHaveBeenCalledWith('c-new', { IsReferente: true })
  })

  it('aggiornaContatto blocca email duplicate su altro contatto', async () => {
    mockUpdateContatto.mockResolvedValueOnce({})
    mockGetContattoByEmails.mockResolvedValueOnce({ data: { data: [{ id_contatto: 'c-other' }] } })
    await expect(aggiornaContatto('c-1', { Email: 'new@b.it' })).rejects.toThrow('Email duplicata')
  })
})
