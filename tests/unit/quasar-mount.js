import { mount } from '@vue/test-utils'

const QUASAR_STUBS = {
  'q-icon': { name: 'QIcon', template: '<span />' },
  'q-badge': { name: 'QBadge', template: '<span><slot /></span>' },
  'q-tooltip': { name: 'QTooltip', template: '<span><slot /></span>' },
  'q-spinner': { name: 'QSpinner', template: '<span />' },
  'q-btn': { name: 'QBtn', template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'q-input': {
    name: 'QInput',
    template: '<div><slot /><slot name="append" /><slot name="prepend" /></div>',
    props: ['modelValue', 'label', 'type'],
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
  'q-form': { name: 'QForm', template: '<form><slot /></form>', methods: { validate: () => Promise.resolve(true) } },
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
  'v-ripple': true,
  'close-popup': true,
  'router-link': { template: '<a><slot /></a>' },
  'router-view': { template: '<div />' }
}

export function quasarMount(component, options = {}) {
  const mergedStubs = { ...QUASAR_STUBS, ...(options.global?.stubs || {}) }

  return mount(component, {
    ...options,
    global: {
      ...(options.global || {}),
      stubs: mergedStubs,
      config: {
        globalProperties: {
          $q: {
            platform: { is: { mobile: false } },
            lang: { isoName: 'it' },
            screen: { width: 1024, sm: true, md: true, gt: { sm: true }, lt: { sm: false } }
          },
          $route: { name: '' },
          $router: { push: () => {} }
        }
      }
    }
  })
}
