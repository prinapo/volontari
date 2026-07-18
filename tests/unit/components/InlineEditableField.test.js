import { describe, it, expect } from 'vitest'
import { quasarMount } from '../quasar-mount'
import InlineEditableField from 'src/components/Common/InlineEditableField.vue'

function createWrapper(props = {}) {
  return quasarMount(InlineEditableField, {
    props: { modelValue: '', ...props }
  })
}

describe('InlineEditableField', () => {
  it('renders in display mode by default', () => {
    const wrapper = createWrapper({ modelValue: 'Test', label: 'Nome' })
    expect(wrapper.text()).toContain('Test')
  })

  it('shows placeholder when value is empty', () => {
    const wrapper = createWrapper({ modelValue: '', label: 'Nome' })
    expect(wrapper.text()).toContain('—')
  })

  it('uses formatDisplay function when provided', () => {
    const wrapper = createWrapper({
      modelValue: 100,
      label: 'Importo',
      formatDisplay: v => `€ ${v.toFixed(2)}`
    })
    expect(wrapper.text()).toContain('€ 100.00')
  })

  it('applies readonly class when readonly', () => {
    const wrapper = createWrapper({ modelValue: 'Test', readonly: true })
    expect(wrapper.classes()).not.toContain('cursor-pointer')
  })

  it('emits cancel when cancel is triggered', async () => {
    const wrapper = createWrapper({ modelValue: 'Originale', label: 'Test' })
    // Enter edit mode
    await wrapper.trigger('click')
    // Trigger cancel through internal method
    await wrapper.vm.cancel()
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('emits save with new value', async () => {
    const wrapper = createWrapper({ modelValue: 'Old' })
    await wrapper.trigger('click')
    wrapper.vm.editValue = 'New'
    await wrapper.vm.save()
    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')[0][0]).toBe('New')
  })

  it('restores display mode when save completes', async () => {
    const wrapper = createWrapper({ modelValue: 'Old' })
    expect(wrapper.vm.editing).toBe(false)
    wrapper.vm.editing = true
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.editing).toBe(true)
    wrapper.vm.editValue = 'New'
    await wrapper.vm.save()
    expect(wrapper.vm.editing).toBe(false)
  })
})
