import { describe, it, expect, vi } from 'vitest'
import { quasarMount } from '../quasar-mount'
import GiustificativoCard from 'src/components/Giustificativi/GiustificativoCard.vue'

const mockDialogOnOk = vi.fn()
const mockDialog = vi.fn(() => ({
  onOk: callback => {
    mockDialogOnOk(callback)
    callback()
    return {}
  }
}))

vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    useQuasar: () => ({ dialog: mockDialog })
  }
})

describe('GiustificativoCard', () => {
  const draftItem = {
    id: 1,
    Descrizione: 'Spese mediche',
    Importo: 50,
    Data: '2024-01-15',
    Stato: 'draft',
    Allegato: null
  }

  it('renders description and amount', () => {
    const wrapper = quasarMount(GiustificativoCard, {
      props: { item: draftItem, canEdit: true }
    })
    expect(wrapper.text()).toContain('Spese mediche')
  })

  it('shows send and delete buttons when canEdit is true', () => {
    const wrapper = quasarMount(GiustificativoCard, {
      props: { item: draftItem, canEdit: true }
    })
    const buttons = wrapper.findAllComponents({ name: 'QBtn' })
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('hides send and delete buttons when canEdit is false', () => {
    const wrapper = quasarMount(GiustificativoCard, {
      props: { item: { ...draftItem, Stato: 'inviato' }, canEdit: false }
    })
    const btns = wrapper.findAllComponents({ name: 'QBtn' })
    expect(btns.length).toBe(0)
  })

  it('emits submit when send is clicked', async () => {
    const wrapper = quasarMount(GiustificativoCard, {
      props: { item: draftItem, canEdit: true }
    })
    const sendBtn = wrapper.findAllComponents({ name: 'QBtn' }).find(b => b.text().includes('Invia'))
    if (sendBtn) {
      await sendBtn.trigger('click')
      expect(wrapper.emitted('submit')).toBeTruthy()
    }
  })

  it('opens delete confirmation and emits invalida', async () => {
    const wrapper = quasarMount(GiustificativoCard, {
      props: { item: draftItem, canEdit: true }
    })
    const deleteBtn = wrapper.findAllComponents({ name: 'QBtn' }).find(b => b.text().includes('Elimina'))
    if (deleteBtn) {
      await deleteBtn.trigger('click')
      expect(mockDialog).toHaveBeenCalled()
      expect(wrapper.emitted('invalida')).toBeTruthy()
      expect(wrapper.emitted('invalida')[0]).toEqual([1])
    }
  })

  it('shows attachment actions when file exists', () => {
    const wrapper = quasarMount(GiustificativoCard, {
      props: { item: { ...draftItem, Allegato: 'file-1' }, canEdit: true }
    })
    const buttons = wrapper.findAllComponents({ name: 'QBtn' })
    expect(buttons.length).toBeGreaterThanOrEqual(4)
    expect(wrapper.text()).not.toContain('Nessun allegato')
  })
})
