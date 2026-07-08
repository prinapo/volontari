import { describe, it, expect } from 'vitest'
import { quasarMount } from '../quasar-mount'
import GiustificativoFilePicker from 'src/components/Giustificativi/GiustificativoFilePicker.vue'

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

  it('emits selected file and resets the input value', () => {
    const wrapper = quasarMount(GiustificativoFilePicker)
    const file = new File(['a'], 'ok.pdf')
    const event = { target: { files: [file], value: 'tmp' } }

    wrapper.vm.onFileChange(event)

    expect(wrapper.emitted('update:modelValue')).toEqual([[file]])
    expect(event.target.value).toBe('')
  })

  it('ignores oversized files and can remove current file', async () => {
    const wrapper = quasarMount(GiustificativoFilePicker, {
      props: { modelValue: new File(['a'], 'ok.pdf') }
    })

    wrapper.vm.onFileChange({ target: { files: [bigFile], value: 'tmp' } })
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()

    wrapper.vm.fileInput = { value: 'tmp' }
    wrapper.vm.removeFile()
    expect(wrapper.emitted('update:modelValue')).toEqual([[null]])
  })
})
