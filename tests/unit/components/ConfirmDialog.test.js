import { beforeEach, describe, expect, it } from 'vitest'
import { quasarMount } from '../quasar-mount'
import ConfirmDialog from 'src/components/Common/ConfirmDialog.vue'

describe('ConfirmDialog', () => {
  beforeEach(() => {})

  it('renders default labels and text', () => {
    const wrapper = quasarMount(ConfirmDialog, {
      props: { modelValue: true }
    })

    expect(wrapper.text()).toContain('Conferma')
    expect(wrapper.text()).toContain('Sei sicuro?')
    expect(wrapper.text()).toContain('Annulla')
  })

  it('renders custom props and emits confirm on click', async () => {
    const wrapper = quasarMount(ConfirmDialog, {
      props: {
        modelValue: true,
        title: 'Elimina record',
        message: 'Vuoi davvero eliminare?',
        confirmLabel: 'Elimina'
      }
    })

    expect(wrapper.text()).toContain('Elimina record')
    expect(wrapper.text()).toContain('Vuoi davvero eliminare?')

    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('emits update:modelValue when computed model changes', async () => {
    const wrapper = quasarMount(ConfirmDialog, {
      props: { modelValue: true }
    })

    wrapper.vm.model = false
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })
})
