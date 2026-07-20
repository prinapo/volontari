import { describe, it, expect } from 'vitest'
import { quasarMount } from '../quasar-mount'
import GiustificativoForm from 'src/components/Giustificativi/GiustificativoForm.vue'

describe('GiustificativoForm', () => {
  it('renders title in dialog', () => {
    const wrapper = quasarMount(GiustificativoForm, {
      props: { modelValue: true, progettoId: 'p-1', famigliaId: 'fam-1' }
    })
    expect(wrapper.text()).toContain('Nuovo giustificativo')
  })

  it('emits save with formatted data', async () => {
    const wrapper = quasarMount(GiustificativoForm, {
      props: { modelValue: true, progettoId: 'p-1', famigliaId: 'fam-1', annoBando: 2024 }
    })
    // Fill form fields
    wrapper.vm.form.Descrizione = 'Spese mediche'
    wrapper.vm.form.Importo = 50
    wrapper.vm.form.Data = '2024-01-15'

    await wrapper.vm.handleSave()

    expect(wrapper.emitted('save')).toBeTruthy()
    const payload = wrapper.emitted('save')[0][0]
    expect(payload.Descrizione).toBe('Spese mediche')
    expect(payload.Importo).toBe(50)
    expect(payload.Progetto).toBe('p-1')
    expect(payload.Famiglia).toBe('fam-1')
    expect(payload.Stato).toBe('draft')
  })

  it('resets form after save', async () => {
    const wrapper = quasarMount(GiustificativoForm, {
      props: { modelValue: true, progettoId: 'p-1', famigliaId: 'fam-1' }
    })
    wrapper.vm.form.Descrizione = 'Test'
    await wrapper.vm.handleSave()
    expect(wrapper.vm.form.Descrizione).toBe('')
    expect(wrapper.vm.form.Importo).toBeNull()
  })

  it('closes dialog when modelValue changes', async () => {
    const wrapper = quasarMount(GiustificativoForm, {
      props: { modelValue: true, progettoId: 'p-1', famigliaId: 'fam-1' }
    })
    await wrapper.setProps({ modelValue: false })
    expect(wrapper.vm.model).toBe(false)
  })
})
