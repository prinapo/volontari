import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  allineaPrimariaALogin,
  applicaCorrezioniEmailPrimarie,
  eliminaContatto,
  eliminaEmail,
  impostaEmailPrimaria
} from 'src/usecases/email'

const { emailMock, contattiMock, famiglieMock, gestioneMock, referentiMock, usersMock } = vi.hoisted(() => ({
  emailMock: {
    getAllByContatto: vi.fn(),
    getAll: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    remove: vi.fn()
  },
  contattiMock: { getById: vi.fn(), remove: vi.fn(), getAllConUtente: vi.fn() },
  famiglieMock: { getFamiglieByContatto: vi.fn() },
  gestioneMock: { deleteFamigliaContatto: vi.fn() },
  referentiMock: { getByVolontario: vi.fn(), getByReferente: vi.fn(), remove: vi.fn() },
  usersMock: { update: vi.fn() }
}))

vi.mock('src/services/email.service', () => ({ emailService: emailMock }))
vi.mock('src/services/contatti.service', () => ({ contattiService: contattiMock }))
vi.mock('src/services/famiglie.service', () => ({ famiglieService: famiglieMock }))
vi.mock('src/services/gestione.service', () => ({ gestioneService: gestioneMock }))
vi.mock('src/services/referenti.service', () => ({ referentiService: referentiMock }))
vi.mock('src/services/users.service', () => ({ usersService: usersMock }))

function response(data) {
  return { data: { data } }
}

describe('usecases/email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const fn of Object.values(emailMock)) fn.mockResolvedValue(response({}))
    contattiMock.getById.mockResolvedValue(response({ id_contatto: 'A' }))
    contattiMock.remove.mockResolvedValue(response({}))
    famiglieMock.getFamiglieByContatto.mockResolvedValue(response([]))
    referentiMock.getByVolontario.mockResolvedValue(response([]))
    referentiMock.getByReferente.mockResolvedValue(response([]))
    usersMock.update.mockResolvedValue(response({}))
  })

  describe('impostaEmailPrimaria', () => {
    it('senza account non tocca lo user Directus', async () => {
      emailMock.getAllByContatto.mockResolvedValue(response([{ id: 1 }, { id: 2 }]))
      await impostaEmailPrimaria({ contattoId: 'A', emailId: 2 })
      expect(emailMock.update).toHaveBeenCalledWith(1, { Primary: false })
      expect(emailMock.update).toHaveBeenCalledWith(2, { Primary: true })
      expect(usersMock.update).not.toHaveBeenCalled()
    })

    it('con account allinea l email di login', async () => {
      contattiMock.getById.mockResolvedValue(response({ id_contatto: 'A', user_id: 'U' }))
      emailMock.getAllByContatto.mockResolvedValue(
        response([
          { id: 1, email_address: 'a@x.it' },
          { id: 2, email_address: 'b@x.it' }
        ])
      )
      await impostaEmailPrimaria({ contattoId: 'A', emailId: 2 })
      expect(usersMock.update).toHaveBeenCalledWith('U', { email: 'b@x.it' })
    })
  })

  describe('eliminaEmail', () => {
    it('rifiuta la primaria', async () => {
      emailMock.getAllByContatto.mockResolvedValue(response([{ id: 1, Primary: true }]))
      await expect(eliminaEmail({ contattoId: 'A', emailId: 1 })).rejects.toThrow(/primaria/)
      expect(emailMock.remove).not.toHaveBeenCalled()
    })

    it('elimina una email non primaria', async () => {
      emailMock.getAllByContatto.mockResolvedValue(
        response([
          { id: 1, Primary: true },
          { id: 2, Primary: false }
        ])
      )
      await eliminaEmail({ contattoId: 'A', emailId: 2 })
      expect(emailMock.remove).toHaveBeenCalledWith(2)
    })
  })

  describe('eliminaContatto', () => {
    it('blocca i contatti con account', async () => {
      contattiMock.getById.mockResolvedValue(response({ id_contatto: 'A', user_id: 'U' }))
      await expect(eliminaContatto({ contattoId: 'A' })).rejects.toThrow(/account/)
      expect(contattiMock.remove).not.toHaveBeenCalled()
    })

    it('rimuove a cascata email, famiglie e referenti', async () => {
      emailMock.getAllByContatto.mockResolvedValue(response([{ id: 11 }, { id: 12 }]))
      famiglieMock.getFamiglieByContatto.mockResolvedValue(response([{ id: 21 }]))
      referentiMock.getByVolontario.mockResolvedValue(response([{ id: 31 }]))
      referentiMock.getByReferente.mockResolvedValue(response([{ id: 32 }]))

      await eliminaContatto({ contattoId: 'A' })

      expect(emailMock.remove).toHaveBeenCalledWith(11)
      expect(emailMock.remove).toHaveBeenCalledWith(12)
      expect(gestioneMock.deleteFamigliaContatto).toHaveBeenCalledWith(21)
      expect(referentiMock.remove).toHaveBeenCalledWith(31)
      expect(referentiMock.remove).toHaveBeenCalledWith(32)
      expect(contattiMock.remove).toHaveBeenCalledWith('A')
    })
  })

  describe('applicaCorrezioniEmailPrimarie', () => {
    it('azzera le eccedenti e promuove le mancanti', async () => {
      const result = await applicaCorrezioniEmailPrimarie({
        duplicati: [{ contattoId: 'A', keepId: 1, extraIds: [2, 3] }],
        senzaPrimaria: [{ contattoId: 'B', keepId: 4 }]
      })
      expect(emailMock.update).toHaveBeenCalledWith(2, { Primary: false })
      expect(emailMock.update).toHaveBeenCalledWith(3, { Primary: false })
      expect(emailMock.update).toHaveBeenCalledWith(4, { Primary: true })
      expect(result).toEqual({ contattiCorretti: 2, aggiornamenti: 3 })
    })
  })

  describe('allineaPrimariaALogin', () => {
    it('promuove la email che coincide con la login', async () => {
      emailMock.getAllByContatto.mockResolvedValue(
        response([
          { id: 1, email_address: 'old@x.it' },
          { id: 2, email_address: 'login@x.it' }
        ])
      )
      await allineaPrimariaALogin({ contattoId: 'A', loginEmail: 'login@x.it' })
      expect(emailMock.update).toHaveBeenCalledWith(2, { Primary: true })
      expect(emailMock.update).toHaveBeenCalledWith(1, { Primary: false })
    })

    it('crea la email di login se manca', async () => {
      emailMock.getAllByContatto.mockResolvedValue(response([{ id: 1, email_address: 'old@x.it' }]))
      await allineaPrimariaALogin({ contattoId: 'A', loginEmail: 'login@x.it' })
      expect(emailMock.create).toHaveBeenCalledWith({
        email_address: 'login@x.it',
        Contatto_Relation: 'A',
        Primary: true
      })
      expect(emailMock.update).toHaveBeenCalledWith(1, { Primary: false })
    })
  })
})
