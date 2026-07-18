import { describe, it, expect } from 'vitest'
import { quasarMount } from '../quasar-mount'
import FileUploader from 'src/components/Common/FileUploader.vue'

describe('FileUploader', () => {
  it('renders with default props', () => {
    const wrapper = quasarMount(FileUploader)
    expect(wrapper.exists()).toBe(true)
  })

  it('changes internal model when q-file emits update:model-value', () => {
    const wrapper = quasarMount(FileUploader)
    const fakeFile = new File(['content'], 'doc.pdf')
    const qFile = wrapper.findComponent({ name: 'QFile' })
    qFile.vm.$emit('update:model-value', fakeFile)
    expect(wrapper.emitted('file-selected')).toBeTruthy()
    expect(wrapper.emitted('file-selected')[0][0]).toBe(fakeFile)
  })

  it('emits file-removed when q-file clears', () => {
    const wrapper = quasarMount(FileUploader)
    const qFile = wrapper.findComponent({ name: 'QFile' })
    qFile.vm.$emit('update:model-value', null)
    expect(wrapper.emitted('file-removed')).toBeTruthy()
  })
})
