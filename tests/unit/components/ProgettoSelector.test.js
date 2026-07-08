import { describe, expect, it } from 'vitest'
import { quasarMount } from '../quasar-mount'
import ProgettoSelector from 'src/components/Famiglia/ProgettoSelector.vue'

describe('ProgettoSelector', () => {
  it('maps options adding label from beneficiary names', () => {
    const wrapper = quasarMount(ProgettoSelector, {
      props: {
        modelValue: 'p-1',
        options: [
          {
            id_progetto: 'p-1',
            Cognome_Beneficiario: 'Rossi',
            Nome_Beneficiario: 'Mario',
            AnnoBando: 2026,
            Eta: 12,
            Allocato: 5000
          }
        ]
      }
    })

    expect(wrapper.vm.mappedOptions[0].label).toBe('Rossi Mario')
  })

  it('emits update:modelValue when q-select emits update', async () => {
    const wrapper = quasarMount(ProgettoSelector, {
      props: {
        options: [{ id_progetto: 'p-1', Cognome_Beneficiario: 'Rossi', Nome_Beneficiario: 'Mario' }]
      }
    })

    wrapper.findComponent({ name: 'QSelect' }).vm.$emit('update:model-value', 'p-1')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toEqual([['p-1']])
  })
})
