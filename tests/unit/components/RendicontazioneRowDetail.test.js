import { beforeEach, describe, expect, it, vi } from 'vitest'
import RendicontazioneRowDetail from 'src/components/Verifica/RendicontazioneRowDetail.vue'
import { quasarMount } from '../quasar-mount'

vi.mock('src/utils/formatters', () => ({
  formatCurrency: value => `€${value}`
}))

vi.mock('components/Common/ContattiFamigliaPanel.vue', () => ({
  default: { name: 'ContattiFamigliaPanel', template: '<div>ContattiFamigliaPanel Stub</div>' }
}))

vi.mock('components/Common/DatiBancariPanel.vue', () => ({
  default: { name: 'DatiBancariPanel', template: '<div>DatiBancariPanel Stub</div>' }
}))

vi.mock('src/components/Giustificativi/GiustificativoRow.vue', () => ({
  default: { name: 'GiustificativoRow', template: '<div>GiustificativoRow Stub</div>' }
}))

vi.mock('src/components/Note/NoteProgettoPanel.vue', () => ({
  default: { name: 'NoteProgettoPanel', template: '<div>NoteProgettoPanel Stub</div>' }
}))

const baseRow = {
  idProgetto: 'p-1',
  allocato: 3000,
  totaleRendicontato: 3000,
  totaleVerificato: 3000,
  totalePagato: 0,
  totaleInPagamento: 0,
  totaleRimborsabile: 2400,
  percentualeRimborso: 80,
  iban: 'IT00',
  intestatario: 'Mario Rossi',
  statoProgetto: 'in_rendicontazione',
  giustificativi: [{ id: 'g-1', Importo: 3000, Stato: 'verificato', Invalidato: false }]
}

function mount(row) {
  return quasarMount(RendicontazioneRowDetail, { props: { row } })
}

describe('RendicontazioneRowDetail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mostra la percentuale del progetto e il residuo erogabile', () => {
    const wrapper = mount(baseRow)
    const text = wrapper.text()

    expect(text).toContain('Rimborsabile 80%')
    expect(text).toContain('Residuo erogabile')
    expect(text).toContain('€2400')
  })

  it('mostra erogato su rendicontato', () => {
    const wrapper = mount({ ...baseRow, totalePagato: 800 })

    expect(wrapper.text()).toContain('Erogato')
    expect(wrapper.text()).toContain('su €3000 rendicontati')
  })

  it('avvisa quando il cap erogabile è raggiunto', () => {
    const wrapper = mount({ ...baseRow, totalePagato: 2400 })

    expect(wrapper.text()).toContain('Cap erogabile raggiunto')
  })

  it('non avvisa se resta ancora qualcosa da erogare', () => {
    const wrapper = mount({ ...baseRow, totalePagato: 1000 })

    expect(wrapper.text()).not.toContain('Cap erogabile raggiunto')
  })

  it('non avvisa se il progetto è già chiuso', () => {
    const wrapper = mount({ ...baseRow, totalePagato: 2400, statoProgetto: 'chiuso' })

    expect(wrapper.text()).not.toContain('Cap erogabile raggiunto')
  })

  it('con percentuale 100% il rimborsabile è il verificato intero', () => {
    const wrapper = mount({
      ...baseRow,
      percentualeRimborso: 100,
      totaleRimborsabile: 3000,
      totalePagato: 3000
    })

    expect(wrapper.text()).toContain('Rimborsabile 100%')
    expect(wrapper.text()).toContain('Cap erogabile raggiunto')
  })
})
