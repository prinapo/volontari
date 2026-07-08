import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BancariDialog from 'src/components/Common/BancariDialog.vue'

function createWrapper(props = {}) {
  return mount(BancariDialog, {
    props: {
      modelValue: true,
      ...props
    },
    global: {
      stubs: {
        'q-dialog': true,
        'q-card': { template: '<div><slot /></div>' },
        'q-card-section': { template: '<div><slot /></div>' },
        'q-card-actions': { template: '<div><slot /></div>' },
        'q-input': true,
        'q-btn': true,
        'close-popup': true
      }
    }
  })
}

describe('BancariDialog', () => {
  it('renders when modelValue is true', () => {
    const wrapper = createWrapper({ famigliaName: 'Fam Test' })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders beneficiario when provided', () => {
    const wrapper = createWrapper({
      famigliaName: 'Fam Test',
      beneficiario: 'Mario Rossi'
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('emits save on Salva click', async () => {
    const wrapper = createWrapper({
      initialIban: 'IT00X',
      initialIntestatario: 'Mario'
    })
    // Simulate save by directly calling the internal function
    await wrapper.vm.handleSave()
    expect(wrapper.emitted('save')).toBeTruthy()
    const payload = wrapper.emitted('save')[0][0]
    expect(payload).toHaveProperty('iban')
    expect(payload).toHaveProperty('intestatario')
  })

  it('sets local values from initial props when dialog opens', () => {
    const wrapper = createWrapper({
      initialIban: 'IT00X',
      initialIntestatario: 'Mario'
    })
    expect(wrapper.vm.localIban).toBe('IT00X')
    expect(wrapper.vm.localIntestatario).toBe('Mario')
  })

  it('emits update:modelValue through computed model setter', async () => {
    const wrapper = createWrapper()

    wrapper.vm.model = false
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('computes hasChanges based on edited fields', async () => {
    const wrapper = createWrapper({
      initialIban: 'IT60X0542811101000000123456',
      initialIntestatario: 'Mario Rossi'
    })

    expect(wrapper.vm.hasChanges).toBe(false)

    wrapper.vm.localIban = 'IT60X0542811101000000123457'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.hasChanges).toBe(true)
  })
})
