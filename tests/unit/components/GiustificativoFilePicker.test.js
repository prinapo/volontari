import { describe, it, expect, vi } from 'vitest'
import { quasarMount } from '../quasar-mount'
import GiustificativoFilePicker from 'src/components/Giustificativi/GiustificativoFilePicker.vue'

vi.mock('quasar', () => ({
  useQuasar: () => ({ notify: vi.fn() })
}))

const bigFile = new File(['a'.repeat(10)], 'big.pdf')
Object.defineProperty(bigFile, 'size', { value: 6 * 1024 * 1024 })

describe('GiustificativoFilePicker', () => {
  it('computes button color based on state', async () => {
    const wrapper = quasarMount(GiustificativoFilePicker)

    expect(wrapper.vm.fileBtnColor).toBe('grey-7')
    wrapper.vm.touch()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.fileBtnColor).toBe('negative')

    await wrapper.setProps({ modelValue: new File(['a'], 'ok.pdf') })
    expect(wrapper.vm.fileBtnColor).toBe('green')
  })

  it('emits selected file via onFileChange', () => {
    const wrapper = quasarMount(GiustificativoFilePicker)
    const file = new File(['a'], 'ok.pdf')

    wrapper.vm.onFileChange(file)

    expect(wrapper.emitted('update:modelValue')).toEqual([[file]])
  })

  it('resets internalFile after file change', () => {
    const wrapper = quasarMount(GiustificativoFilePicker)
    wrapper.vm.onFileChange(new File(['a'], 'ok.pdf'))

    expect(wrapper.vm.internalFile).toBeNull()
  })

  it('removes current file', () => {
    const wrapper = quasarMount(GiustificativoFilePicker, {
      props: { modelValue: new File(['a'], 'ok.pdf') }
    })

    wrapper.vm.removeFile()
    expect(wrapper.emitted('update:modelValue')).toEqual([[null]])
  })
})
