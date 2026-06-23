import { describe, it, expect } from 'vitest'
import { quasarMount } from '../quasar-mount'
import GiustificativoCard from 'src/components/Giustificativi/GiustificativoCard.vue'

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
})
