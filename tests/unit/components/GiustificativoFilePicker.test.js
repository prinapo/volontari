import { describe, it, expect, vi } from 'vitest'
import { quasarMount } from '../quasar-mount'
import GiustificativoFilePicker from 'src/components/Giustificativi/GiustificativoFilePicker.vue'

vi.mock('quasar', () => ({
  useQuasar: () => ({ notify: vi.fn() })
}))

const bigFile = new File(['a'.repeat(10)], 'big.pdf')
Object.defineProperty(bigFile, 'size', { value: 6 * 1024 * 1024 })

describe('GiustificativoFilePicker', () => {
  it('renders the file picker', () => {
    const wrapper = quasarMount(GiustificativoFilePicker)
    expect(wrapper.findComponent({ name: 'QFile' }).exists()).toBe(true)
  })

  it('emits update:modelValue when file selected', () => {
    const wrapper = quasarMount(GiustificativoFilePicker)
    const file = new File(['a'], 'ok.pdf')
    wrapper.vm.$emit('update:modelValue', file)
    expect(wrapper.emitted('update:modelValue')).toEqual([[file]])
  })

  it('exposes touch function', () => {
    const wrapper = quasarMount(GiustificativoFilePicker)
    expect(typeof wrapper.vm.touch).toBe('function')
  })
})
