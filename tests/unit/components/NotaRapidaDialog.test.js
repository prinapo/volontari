import { describe, it, expect, vi, beforeEach } from 'vitest'
import NotaRapidaDialog from 'src/components/Verifica/NotaRapidaDialog.vue'
import { quasarMount } from '../quasar-mount'

const mockCreateNota = vi.fn()

vi.mock('src/stores/note.store', () => ({
  useNoteStore: () => ({
    saving: false,
    createNota: (...a) => mockCreateNota(...a)
  })
}))

vi.mock('src/utils/notify', () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn()
}))

describe('NotaRapidaDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders titolo, textarea e azioni', () => {
    const wrapper = quasarMount(NotaRapidaDialog, {
      props: { modelValue: true, progettoId: 'p-1' }
    })

    expect(wrapper.text()).toContain('Aggiungi nota')
    expect(wrapper.text()).toContain('Annulla')
    expect(wrapper.find('[data-testid="nota-rapida-salva"]').exists()).toBe(true)
  })

  it('crea la nota con origine verificatore e chiude il dialog', async () => {
    mockCreateNota.mockResolvedValue({ id: 1 })
    const wrapper = quasarMount(NotaRapidaDialog, {
      props: { modelValue: true, progettoId: 'p-1' }
    })

    wrapper.vm.testo = 'nota di prova'
    await wrapper.vm.handleSubmit()

    expect(mockCreateNota).toHaveBeenCalledWith('p-1', 'nota di prova', 'verificatore')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('non crea se il testo è vuoto', async () => {
    const wrapper = quasarMount(NotaRapidaDialog, {
      props: { modelValue: true, progettoId: 'p-1' }
    })

    await wrapper.vm.handleSubmit()

    expect(mockCreateNota).not.toHaveBeenCalled()
  })
})
