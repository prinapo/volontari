import { mount } from '@vue/test-utils'

const QUASAR_STUBS = {
  'q-icon': { name: 'QIcon', template: '<span />' },
  'q-badge': { name: 'QBadge', template: '<span><slot /></span>' },
  'q-tooltip': { name: 'QTooltip', template: '<span><slot /></span>' },
  'q-spinner': { name: 'QSpinner', template: '<span />' },
  'q-btn': {
    name: 'QBtn',
    template: '<button @click="$emit(\'click\')"><slot />{{ label }}</button>',
    props: ['label']
  },
  'q-input': {
    name: 'QInput',
    template: '<div><slot /><slot name="append" /><slot name="prepend" /></div>',
    props: ['modelValue', 'label', 'type'],
    methods: { validate: () => true, focus: () => {}, resetValidation: () => {} }
  },
  'q-field': {
    name: 'QField',
    template: '<div><slot name="control" /><slot name="append" /><slot /></div>',
    props: ['modelValue', 'label'],
    methods: { validate: () => true, focus: () => {}, resetValidation: () => {} }
  },
  'q-file': {
    name: 'QFile',
    template: '<div><slot /><slot name="prepend" /></div>',
    props: ['modelValue', 'label', 'accept'],
    methods: { validate: () => true }
  },
  'q-dialog': {
    name: 'QDialog',
    template: '<div v-if="modelValue"><slot /></div>',
    props: ['modelValue', 'persistent']
  },
  'q-card': { name: 'QCard', template: '<div><slot /></div>' },
  'q-card-section': { name: 'QCardSection', template: '<div><slot /></div>' },
  'q-card-actions': { name: 'QCardActions', template: '<div><slot /></div>' },
  'q-separator': { name: 'QSeparator', template: '<hr />' },
  'q-space': { name: 'QSpace', template: '<span />' },
  'q-form': {
    name: 'QForm',
    template: '<form><slot /></form>',
    methods: { validate: () => Promise.resolve(true) }
  },
  'q-select': {
    name: 'QSelect',
    template:
      '<div><slot /><template v-if="firstOption"><slot name="option" :opt="firstOption" :itemProps="{}" /><slot name="selected-item" :opt="firstOption" /></template></div>',
    props: ['modelValue', 'options', 'label'],
    computed: {
      firstOption() {
        return Array.isArray(this.options) ? this.options[0] : null
      }
    }
  },
  'q-tabs': { name: 'QTabs', template: '<div><slot /></div>', props: ['modelValue'] },
  'q-tab': { name: 'QTab', template: '<button><slot />{{ label }}</button>', props: ['name', 'label', 'badge'] },
  'q-tab-panels': { name: 'QTabPanels', template: '<div><slot /></div>', props: ['modelValue'] },
  'q-tab-panel': { name: 'QTabPanel', template: '<div><slot /></div>', props: ['name'] },
  'q-toggle': { name: 'QToggle', template: '<div><slot />{{ label }}</div>', props: ['modelValue', 'label'] },
  'q-table': {
    name: 'QTable',
    template:
      '<div><slot /><template v-if="firstRow"><slot name="item" :row="firstRow" :cols="[]" /><slot name="header" :cols="[]" /><slot name="body-cell-actions" :row="firstRow" :value="firstRow.id" /><slot name="body-cell-stato" :row="firstRow" :value="firstRow._detectState" /><slot name="body-cell-stato_submission" :row="firstRow" :value="firstRow.stato" /><slot name="body-cell-email" :row="firstRow" :value="firstRow.email" /><slot name="body-cell-descrizione" :row="firstRow" :value="firstRow.descrizione" /><slot name="body-cell-telefono" :row="firstRow" :value="firstRow.telefono" /><slot name="body-cell-importo" :row="firstRow" :value="firstRow.importo" /><slot name="body-cell-data_invio" :row="firstRow" :value="firstRow.data_invio" /><slot name="body-cell-allegato" :row="firstRow" :value="firstRow.allegato" /></template></div>',
    props: ['rows', 'columns'],
    computed: {
      firstRow() {
        return Array.isArray(this.rows) ? this.rows[0] : null
      }
    }
  },
  'q-td': { name: 'QTd', template: '<div><slot /></div>', props: ['props'] },
  'q-popup-proxy': { name: 'QPopupProxy', template: '<div><slot /></div>' },
  'q-date': { name: 'QDate', template: '<div><slot /></div>', props: ['modelValue', 'mask'] },
  'q-banner': { name: 'QBanner', template: '<div><slot /></div>' },
  'q-layout': { name: 'QLayout', template: '<div><slot /></div>' },
  'q-page-container': { name: 'QPageContainer', template: '<div><slot /></div>' },
  'q-page': { name: 'QPage', template: '<div><slot /></div>' },
  'q-header': { name: 'QHeader', template: '<div><slot /></div>' },
  'q-toolbar': { name: 'QToolbar', template: '<div><slot /></div>' },
  'q-toolbar-title': { name: 'QToolbarTitle', template: '<div><slot /></div>' },
  'q-drawer': { name: 'QDrawer', template: '<div><slot /></div>' },
  'q-item': { name: 'QItem', template: '<div><slot /></div>' },
  'q-item-section': { name: 'QItemSection', template: '<div><slot /></div>' },
  'q-item-label': { name: 'QItemLabel', template: '<div><slot /></div>' },
  'q-list': { name: 'QList', template: '<div><slot /></div>' },
  'q-btn-dropdown': { name: 'QBtnDropdown', template: '<div><slot />{{ label }}</div>', props: ['label'] },
  'q-expansion-item': { name: 'QExpansionItem', template: '<div><slot /></div>' },
  'q-scroll-area': { name: 'QScrollArea', template: '<div><slot /></div>' },
  'q-inner-loading': { name: 'QInnerLoading', template: '<div v-if="showing"><slot /></div>', props: ['showing'] },
  'router-link': { template: '<a><slot /></a>' },
  'router-view': { template: '<div />' }
}

const $qMock = {
  platform: { is: { mobile: false } },
  screen: { width: 1024, sm: true, md: true, gt: { sm: true }, lt: { sm: false } },
  dialog: vi.fn()
}

export function quasarMount(component, options = {}) {
  const mergedStubs = { ...QUASAR_STUBS, ...(options.global?.stubs || {}) }

  return mount(component, {
    ...options,
    global: {
      ...(options.global || {}),
      stubs: mergedStubs,
      directives: {
        ...(options.global?.directives || {}),
        ripple: () => {},
        closePopup: () => {}
      },
      config: {
        globalProperties: {
          $q: $qMock,
          $route: { name: '' },
          $router: { push: () => {} }
        }
      }
    }
  })
}
