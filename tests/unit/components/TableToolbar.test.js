import { describe, it, expect } from 'vitest'
import TableToolbar from 'src/components/TableToolbar.vue'
import { quasarMount } from '../quasar-mount'

describe('TableToolbar.vue', () => {
  it('renderizza search quando search prop è passata', () => {
    const wrapper = quasarMount(TableToolbar, {
      props: { search: '' }
    })
    expect(wrapper.find('.col-12.col-sm').exists()).toBe(true)
  })

  it('NON renderizza search se search non è passato', () => {
    const wrapper = quasarMount(TableToolbar, {
      props: { refresh: true }
    })
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('vuoto senza props (nessun bottone)', () => {
    const wrapper = quasarMount(TableToolbar, { props: {} })
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('emette refresh al click del refresh button', async () => {
    const wrapper = quasarMount(TableToolbar, {
      props: { search: '', refresh: true }
    })
    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('refresh standalone senza search funziona', async () => {
    const wrapper = quasarMount(TableToolbar, {
      props: { refresh: true }
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('renderizza slot filters', () => {
    const wrapper = quasarMount(TableToolbar, {
      slots: { filters: '<div class="test-filter">Filtro</div>' }
    })
    expect(wrapper.find('.test-filter').exists()).toBe(true)
    expect(wrapper.find('.test-filter').text()).toContain('Filtro')
  })

  it('search e refresh nella stessa riga su mobile', () => {
    const wrapper = quasarMount(TableToolbar, {
      props: { search: '', refresh: true }
    })
    const searchCol = wrapper.find('.col-12.col-sm')
    expect(searchCol.exists()).toBe(true)
  })
})
