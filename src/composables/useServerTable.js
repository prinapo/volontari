import { ref, computed } from 'vue'

/**
 * Composable per tabelle server-side con QTable + Directus.
 *
 * Il chiamante DEVE invocare `loadData()` esplicitamente al mount
 * (es. `onMounted(() => table.loadData())`).
 *
 * IMPORTANTE — due fonti di verità:
 * Quando `fetchFn` avvolge un'azione di store che gestisce
 * internamente `store.loading`/`store.error` (es. `store.fetchAll`),
 * il template DEVE usare SEMPRE `table.loading` e `table.error`
 * del composable, mai quelli dello store direttamente.
 * Il composable ignora lo stato interno dello store e gestisce
 * loading/error in modo indipendente.
 *
 * Convenzioni rispettate:
 * - stato: `{ data (rows), loading, error }`
 * - error: `err.response?.data?.errors?.[0]?.message || err.message || 'Errore caricamento'`
 *
 * @param {Function} fetchFn  — riceve `{ page, limit, sort, search, ...extraFilters }`
 *                              e deve tornare `{ rows, total }` (rows = array, total = number)
 * @param {Object}   [options]
 * @param {Object}   [options.sortMap]       — mappa nome colonna → campo Directus
 *                                             (es. `{ nome: 'Nome_Famiglia' }`).
 *                                             Default: nome colonna usato as-is.
 * @param {string}   [options.defaultSort]   — colonna di default (es. `'Cognome'`)
 * @param {number}   [options.perPage=25]
 *
 * @returns {{
 *   rows:           import('vue').Ref<Array>,
 *   loading:        import('vue').Ref<boolean>,
 *   error:          import('vue').Ref<string|null>,
 *   pagination:     import('vue').Ref<{ sortBy, descending, page, rowsPerPage, rowsNumber }>,
 *   searchTerm:     import('vue').Ref<string>,
 *   filters:        import('vue').Ref<Object>,
 *   loadData:       () => Promise<void>,
 *   onRequest:      (props: { pagination: Object }) => Promise<void>,
 *   onSearchChange: () => void,
 *   setFilters:     (extra: Object) => void
 * }}
 */
export function useServerTable(fetchFn, options = {}) {
  const {
    sortMap = {},
    defaultSort = null,
    perPage = 25
  } = options

  const rows = ref([])
  const loading = ref(false)
  const _error = ref(null)
  const searchTerm = ref('')
  const filters = ref({})

  const pagination = ref({
    sortBy: defaultSort,
    descending: false,
    page: 1,
    rowsPerPage: perPage,
    rowsNumber: 0
  })

  const sortField = computed(() => {
    const col = pagination.value.sortBy
    if (!col) return
    const mapped = sortMap[col] || col
    return pagination.value.descending ? `-${mapped}` : mapped
  })

  async function loadData() {
    loading.value = true
    _error.value = null
    try {
      const params = {
        page: pagination.value.page,
        limit: pagination.value.rowsPerPage > 0 ? pagination.value.rowsPerPage : -1,
        sort: sortField.value,
        search: searchTerm.value || undefined,
        ...filters.value
      }
      const result = await fetchFn(params)
      rows.value = result.rows
      pagination.value.rowsNumber = result.total
    } catch (error) {
      _error.value = error.response?.data?.errors?.[0]?.message || error.message || 'Errore caricamento'
      rows.value = []
    } finally {
      loading.value = false
    }
  }

  function onRequest(props) {
    const { page, rowsPerPage, sortBy, descending } = props.pagination
    pagination.value.page = page
    if (rowsPerPage !== undefined) pagination.value.rowsPerPage = rowsPerPage
    if (sortBy !== undefined) pagination.value.sortBy = sortBy
    if (descending !== undefined) pagination.value.descending = descending
    return loadData()
  }

  function onSearchChange() {
    pagination.value.page = 1
    return loadData()
  }

  function setFilters(extra) {
    filters.value = { ...filters.value, ...extra }
    pagination.value.page = 1
    return loadData()
  }

  return {
    rows,
    loading,
    error: _error,
    pagination,
    searchTerm,
    filters,
    loadData,
    onRequest,
    onSearchChange,
    setFilters
  }
}
