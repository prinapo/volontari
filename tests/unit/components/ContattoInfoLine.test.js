import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ContattoInfoLine from 'src/components/Common/ContattoInfoLine.vue'

describe('ContattoInfoLine', () => {
  it('renders contact name', () => {
    const wrapper = mount(ContattoInfoLine, {
      props: {
        contact: { Nome: 'Mario', Cognome: 'Rossi' }
      },
      global: { stubs: { 'q-icon': true, 'q-badge': true } }
    })
    expect(wrapper.text()).toContain('Mario')
    expect(wrapper.text()).toContain('Rossi')
  })

  it('renders nothing when contact is null', () => {
    const wrapper = mount(ContattoInfoLine, {
      props: { contact: null },
      global: { stubs: { 'q-icon': true, 'q-badge': true } }
    })
    expect(wrapper.find('.contatto-info-line').exists()).toBe(true)
  })

  it('renders primary email badge', () => {
    const wrapper = mount(ContattoInfoLine, {
      props: {
        contact: { Nome: 'Mario' },
        emails: [{ email_address: 'mario@test.it', Primary: true }]
      },
      global: { stubs: { 'q-icon': true, 'q-badge': true } }
    })
    expect(wrapper.text()).toContain('mario@test.it')
  })

  it('renders phone numbers', () => {
    const wrapper = mount(ContattoInfoLine, {
      props: {
        contact: { Nome: 'Mario', Numero_di_cellulare: '3331234567', Numero_di_telefono: '021234567' }
      },
      global: { stubs: { 'q-icon': true, 'q-badge': true } }
    })
    expect(wrapper.text()).toContain('3331234567')
    expect(wrapper.text()).toContain('021234567')
  })
})
