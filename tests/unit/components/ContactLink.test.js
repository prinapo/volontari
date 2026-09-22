import { beforeEach, describe, expect, it, vi } from 'vitest'
import ContactLink from 'src/components/Common/ContactLink.vue'
import { quasarMount } from '../quasar-mount'

const { authState } = vi.hoisted(() => ({ authState: { canManager: false } }))

vi.mock('stores/auth.store', () => ({ useAuthStore: () => authState }))
vi.mock('src/components/Comunicazioni/InviaEmailDialog.vue', () => ({
  default: { name: 'InviaEmailDialog', template: '<div class="stub-mailer" />' }
}))

describe('ContactLink', () => {
  beforeEach(() => {
    authState.canManager = false
  })

  it('volontario: usa il link mailto, nessun mailer interno', () => {
    const wrapper = quasarMount(ContactLink, { props: { type: 'email', value: 'a@b.it' } })
    expect(wrapper.vm.isInternalMail).toBe(false)
    expect(wrapper.findComponent({ name: 'InviaEmailDialog' }).exists()).toBe(false)
  })

  it('manager: apre il mailer interno', () => {
    authState.canManager = true
    const wrapper = quasarMount(ContactLink, { props: { type: 'email', value: 'a@b.it' } })
    expect(wrapper.vm.isInternalMail).toBe(true)
    expect(wrapper.findComponent({ name: 'InviaEmailDialog' }).exists()).toBe(true)
  })

  it('telefono: mai mailer interno, usa tel:', () => {
    authState.canManager = true
    const wrapper = quasarMount(ContactLink, { props: { type: 'tel', value: '123' } })
    expect(wrapper.vm.isInternalMail).toBe(false)
    expect(wrapper.vm.href).toBe('tel:123')
  })
})
