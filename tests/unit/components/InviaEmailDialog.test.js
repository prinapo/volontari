import { beforeEach, describe, expect, it, vi } from 'vitest'
import InviaEmailDialog from 'src/components/Comunicazioni/InviaEmailDialog.vue'
import { quasarMount } from '../quasar-mount'

const { mockInvia } = vi.hoisted(() => ({ mockInvia: vi.fn() }))

vi.mock('quasar', () => ({ useQuasar: () => ({ notify: vi.fn() }) }))
vi.mock('src/utils/notify', () => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }))
vi.mock('src/usecases/comunicazioni', () => ({ inviaComunicazione: (...args) => mockInvia(...args) }))

describe('InviaEmailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvia.mockResolvedValue({ inviati: 1, falliti: 0 })
  })

  it('senza contattoId invia con audience email all indirizzo passato', async () => {
    const wrapper = quasarMount(InviaEmailDialog, { props: { modelValue: true, email: 'x@y.it' } })
    wrapper.vm.oggetto = 'Ciao'
    wrapper.vm.corpo = 'Testo'
    await wrapper.vm.invia()
    expect(mockInvia).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'email', email: 'x@y.it', subject: 'Ciao', body: 'Testo' })
    )
  })

  it('con contattoId invia con audience contatto', async () => {
    const wrapper = quasarMount(InviaEmailDialog, { props: { modelValue: true, contattoId: '123' } })
    wrapper.vm.oggetto = 'Ciao'
    wrapper.vm.corpo = 'Testo'
    await wrapper.vm.invia()
    expect(mockInvia).toHaveBeenCalledWith(expect.objectContaining({ audience: 'contatto', contattoId: '123' }))
  })
})
