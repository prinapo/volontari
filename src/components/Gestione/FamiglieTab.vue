<template>
  <div>
    <div class="row items-center q-mb-md q-gutter-sm">
      <q-input
        v-model="search"
        dense
        outlined
        placeholder="Cerca per nome famiglia..."
        clearable
        debounce="300"
        class="col famiglia-search-input"
        @update:model-value="onSearchChange"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
      </q-input>

      <q-space />

      <q-select
        v-model="volontarioFilter"
        :options="filterOptions"
        option-value="value"
        option-label="label"
        emit-value
        map-options
        dense
        outlined
        class="col-auto"
        style="min-width: 160px"
      />

      <q-btn color="primary" icon="home_work" label="Aggiungi Famiglia" @click="openCreate" />
    </div>

    <q-table
      v-model:expanded="expandedRows"
      v-model:pagination="pagination"
      :rows="store.famiglie"
      :columns="columns"
      row-key="id_famiglia"
      flat
      bordered
      :grid="$q.screen.lt.sm"
      :loading="store.loading"
      @request="onRequest"
    >
      <template #header="props">
        <q-tr :props="props">
          <q-th auto-width />
          <q-th v-for="col in props.cols" :key="col.name" :props="props">
            {{ col.label }}
          </q-th>
        </q-tr>
      </template>

      <template #item="props">
        <div class="q-pa-xs col-12">
          <q-expansion-item
            dense
            dense-toggle
            expand-separator
            :label="props.row.Nome_Famiglia || 'Famiglia senza nome'"
            :caption="(props.row.HasVolontario ? '✅' : '❌') + ' Volontario'"
            :header-style="{ borderRadius: '12px' }"
            @show="loadExpanded(props.row)"
          >
            <q-card flat bordered>
              <q-card-section class="q-pa-sm">
                <div class="row q-col-gutter-sm q-mb-sm">
                  <div class="col-12">
                    <div class="text-caption text-grey-7">
                      IBAN
                    </div>
                    <div class="text-body2">
                      {{ props.row.IBAN || '—' }}
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="text-caption text-grey-7">
                      Intestatario CC
                    </div>
                    <div class="text-body2">
                      {{ props.row.Intestatario_CC || '—' }}
                    </div>
                  </div>
                </div>

                <q-separator class="q-mb-sm" />
                <div class="text-caption text-grey text-uppercase q-mb-sm">
                  Contatti
                </div>
                <div v-if="expandedLoading && !expandedCache[props.row.id_famiglia]" class="text-center q-py-md">
                  <q-spinner size="sm" /> Caricamento...
                </div>
                <div v-else-if="!expandedCache[props.row.id_famiglia] || expandedCache[props.row.id_famiglia].length === 0" class="text-grey q-py-sm">
                  Nessun contatto assegnato a questa famiglia.
                </div>
                <q-list v-else dense>
                  <template v-for="c in expandedCache[props.row.id_famiglia]" :key="c.id">
                    <q-item v-if="c.Ruolo_nella_Famiglia === 'Genitore'" dense class="q-px-none">
                      <q-item-section>
                        <q-item-label>
                          {{ c.Contatto?.Nome || '' }} {{ c.Contatto?.Cognome || '' }}
                          <q-badge outline color="secondary" class="q-ml-sm">
                            {{ c.Ruolo_nella_Famiglia }}
                          </q-badge>
                        </q-item-label>
                        <q-item-label caption lines="1">
                          <template v-for="em in c._emails" :key="em.email_address">
                            <q-icon name="email" size="xs" class="q-mr-xs" /><a :href="'mailto:'+em.email_address" class="text-primary">{{ em.email_address }}</a>
                            <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs q-mr-sm" />
                          </template>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                  <template v-for="c in expandedCache[props.row.id_famiglia]" :key="c.id + '-vol'">
                    <q-item v-if="c.Ruolo_nella_Famiglia !== 'Genitore'" dense class="q-px-none">
                      <q-item-section>
                        <q-item-label>
                          {{ c.Contatto?.Nome || '' }} {{ c.Contatto?.Cognome || '' }}
                          <q-badge outline color="primary" class="q-ml-sm">
                            {{ c.Ruolo_nella_Famiglia }}
                          </q-badge>
                        </q-item-label>
                        <q-item-label caption lines="1">
                          <template v-for="em in c._emails" :key="em.email_address">
                            <q-icon name="email" size="xs" class="q-mr-xs" /><a :href="'mailto:'+em.email_address" class="text-primary">{{ em.email_address }}</a>
                            <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs q-mr-sm" />
                          </template>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-list>
              </q-card-section>
              <q-card-actions class="q-pa-sm q-gutter-xs">
                <q-btn
                  flat
                  round
                  dense
                  icon="edit"
                  size="sm"
                  data-testid="btn-edit-famiglia"
                  aria-label="Modifica"
                  @click="openEdit(props.row)"
                >
                  <q-tooltip>Modifica</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  round
                  dense
                  icon="contacts"
                  size="sm"
                  aria-label="Gestisci contatti"
                  @click="openContatti(props.row)"
                >
                  <q-tooltip>Gestisci contatti</q-tooltip>
                </q-btn>
              </q-card-actions>
            </q-card>
          </q-expansion-item>
        </div>
      </template>

      <template #body="props">
        <q-tr :props="props">
          <q-td auto-width>
            <q-btn
              flat
              round
              dense
              :icon="props.expand ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
              :aria-label="props.expand ? 'Chiudi' : 'Mostra contatti'"
              @click="props.expand = !props.expand; loadExpanded(props.row)"
            >
              <q-tooltip>{{ props.expand ? 'Chiudi' : 'Mostra contatti' }}</q-tooltip>
            </q-btn>
          </q-td>
          <q-td
            v-for="col in props.cols"
            :key="col.name"
            :props="props"
          >
            <template v-if="col.name === 'IBAN'">
              {{ truncateIban(props.row.IBAN) }}
            </template>
            <template v-else-if="col.name === 'azioni'">
              <q-btn
                flat
                round
                dense
                icon="edit"
                data-testid="btn-edit-famiglia"
                aria-label="Modifica"
                @click="openEdit(props.row)"
              >
                <q-tooltip>Modifica</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                icon="contacts"
                aria-label="Gestisci contatti"
                @click="openContatti(props.row)"
              >
                <q-tooltip>Gestisci contatti</q-tooltip>
              </q-btn>
            </template>
            <template v-else>
              {{ col.value }}
            </template>
          </q-td>
        </q-tr>
        <q-tr v-show="props.expand" :props="props">
          <q-td colspan="100%">
            <q-card flat bordered class="q-ma-sm">
              <q-card-section>
                <div class="text-caption text-grey text-uppercase q-mb-sm">
                  Contatti
                </div>
                <div v-if="expandedLoading && !expandedCache[props.row.id_famiglia]" class="text-center q-py-md">
                  <q-spinner size="sm" /> Caricamento...
                </div>
                <div v-else-if="!expandedCache[props.row.id_famiglia] || expandedCache[props.row.id_famiglia].length === 0" class="text-grey q-py-sm">
                  Nessun contatto assegnato a questa famiglia.
                </div>
                <q-list v-else dense>
                  <template v-for="c in expandedCache[props.row.id_famiglia]" :key="c.id">
                    <q-item v-if="c.Ruolo_nella_Famiglia === 'Genitore'">
                      <q-item-section avatar>
                        <q-icon name="person" size="sm" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>
                          {{ c.Contatto?.Nome || '' }} {{ c.Contatto?.Cognome || '' }}
                          <q-badge outline color="secondary" class="q-ml-sm">
                            {{ c.Ruolo_nella_Famiglia }}
                          </q-badge>
                        </q-item-label>
                        <q-item-label caption lines="1">
                          <template v-for="em in c._emails" :key="em.email_address">
                            <q-icon name="email" size="xs" class="q-mr-xs" />
                            <a :href="'mailto:'+em.email_address" class="text-primary">{{ em.email_address }}</a>
                            <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs q-mr-sm" />
                          </template>
                          <template v-if="c.Contatto?.Numero_di_cellulare">
                            <span class="q-ml-sm">
                              <q-icon name="smartphone" size="xs" class="q-mr-xs" />
                              <a :href="'tel:'+c.Contatto.Numero_di_cellulare" class="text-primary">{{ c.Contatto.Numero_di_cellulare }}</a>
                            </span>
                          </template>
                          <template v-if="c.Contatto?.Numero_di_telefono">
                            <span class="q-ml-sm">
                              <q-icon name="phone" size="xs" class="q-mr-xs" />
                              <a :href="'tel:'+c.Contatto.Numero_di_telefono" class="text-primary">{{ c.Contatto.Numero_di_telefono }}</a>
                            </span>
                          </template>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>

                  <q-separator v-if="expandedCache[props.row.id_famiglia]?.some(c => c.Ruolo_nella_Famiglia !== 'Genitore')" class="q-my-sm" />

                  <template v-for="c in expandedCache[props.row.id_famiglia]" :key="c.id + '-vol'">
                    <q-item v-if="c.Ruolo_nella_Famiglia !== 'Genitore'">
                      <q-item-section avatar>
                        <q-icon name="person" size="sm" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>
                          {{ c.Contatto?.Nome || '' }} {{ c.Contatto?.Cognome || '' }}
                          <q-badge outline color="primary" class="q-ml-sm">
                            {{ c.Ruolo_nella_Famiglia }}
                          </q-badge>
                        </q-item-label>
                        <q-item-label caption lines="1">
                          <template v-for="em in c._emails" :key="em.email_address">
                            <q-icon name="email" size="xs" class="q-mr-xs" />
                            <a :href="'mailto:'+em.email_address" class="text-primary">{{ em.email_address }}</a>
                            <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs q-mr-sm" />
                          </template>
                          <template v-if="c.Contatto?.Numero_di_cellulare">
                            <span class="q-ml-sm">
                              <q-icon name="smartphone" size="xs" class="q-mr-xs" />
                              <a :href="'tel:'+c.Contatto.Numero_di_cellulare" class="text-primary">{{ c.Contatto.Numero_di_cellulare }}</a>
                            </span>
                          </template>
                          <template v-if="c.Contatto?.Numero_di_telefono">
                            <span class="q-ml-sm">
                              <q-icon name="phone" size="xs" class="q-mr-xs" />
                              <a :href="'tel:'+c.Contatto.Numero_di_telefono" class="text-primary">{{ c.Contatto.Numero_di_telefono }}</a>
                            </span>
                          </template>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-list>
              </q-card-section>
            </q-card>
          </q-td>
        </q-tr>
      </template>
    </q-table>

    <FamigliaDialog
      v-model="showDialog"
      :edit-item="editingItem"
      @saved="onSaved"
    />

    <ContattiDialog
      v-model="showContatti"
      :famiglia="contattiTarget"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useGestioneStore } from 'stores/gestione.store'
import { gestioneService } from 'src/services/gestione.service'
import { emailService } from 'src/services/email.service'
import { enrichWithEmails } from 'src/utils/enrichment'
import FamigliaDialog from './FamigliaDialog.vue'
import ContattiDialog from './ContattiDialog.vue'

const store = useGestioneStore()

const search = ref('')
const volontarioFilter = ref('tutti')
const filterOptions = [
  { label: 'Tutti', value: 'tutti' },
  { label: 'Con volontario', value: 'con' },
  { label: 'Senza volontario', value: 'senza' }
]

const showDialog = ref(false)
const editingItem = ref(null)

const showContatti = ref(false)
const contattiTarget = ref(null)

const expandedCache = ref({})
const expandedLoading = ref(false)
const expandedRows = ref([])

const pagination = ref({
  page: 1,
  rowsPerPage: 25,
  rowsNumber: 0,
  sortBy: null,
  descending: false
})

watch(showContatti, (val) => {
  if (val) {
    expandedRows.value = []
    expandedCache.value = {}
  }
})

watch(volontarioFilter, (val) => {
  store.volontarioFilter = val
  pagination.value.page = 1
  loadData()
})

const columns = [
  { name: 'nome', label: 'Nome Famiglia', field: 'Nome_Famiglia', align: 'left', sortable: true },
  { name: 'volontario', label: 'Volontario', field: 'HasVolontario', align: 'center', format: (val) => val ? '✅' : '❌' },
  { name: 'IBAN', label: 'IBAN', align: 'left' },
  { name: 'intestatario', label: 'Intestatario CC', field: 'Intestatario_CC', align: 'left' },
  { name: 'azioni', label: 'Azioni', align: 'center' }
]

async function loadData() {
  const SORT_FIELD_MAP = {
    nome: 'Nome_Famiglia',
    IBAN: 'IBAN',
    intestatario: 'Intestatario_CC'
  }
  const sortField = SORT_FIELD_MAP[pagination.value.sortBy] || pagination.value.sortBy
  const sort = sortField
    ? (pagination.value.descending ? `-${sortField}` : sortField)
    : undefined
  const params = {
    page: pagination.value.page,
    limit: pagination.value.rowsPerPage,
    search: search.value || undefined,
    sort
  }
  await store.fetchAll(params)
  pagination.value.rowsNumber = store.totalFamiglie
}

function onSearchChange() {
  pagination.value.page = 1
  loadData()
}

async function onRequest(props) {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  pagination.value.page = page
  if (rowsPerPage) pagination.value.rowsPerPage = rowsPerPage
  if (sortBy !== undefined) pagination.value.sortBy = sortBy
  if (descending !== undefined) pagination.value.descending = descending
  await loadData()
}

onMounted(() => {
  loadData()
})

async function loadExpanded(row) {
  if (!row || expandedCache.value[ row.id_famiglia ]) return
  expandedLoading.value = true
  try {
    const res = await gestioneService.getContattiByFamiglia(row.id_famiglia)
    const items = res.data.data || []
    const ids = items.map(i => i.Contatto?.id_contatto).filter(Boolean)
    if (ids.length > 0) {
      const emailMap = await enrichWithEmails(ids, emailService.getByContatto.bind(emailService))
      for (const item of items) {
        if (item.Contatto?.id_contatto) {
          item._emails = emailMap[item.Contatto.id_contatto] || []
        }
      }
    }
    expandedCache.value = { ...expandedCache.value, [row.id_famiglia]: items }
  } catch {
    expandedCache.value = { ...expandedCache.value, [row.id_famiglia]: [] }
  } finally {
    expandedLoading.value = false
  }
}

function truncateIban(iban) {
  if (!iban || iban.length < 8) return iban || ''
  return `${iban.slice(0, 4)}...${iban.slice(-4)}`
}

function openCreate() {
  editingItem.value = null
  showDialog.value = true
}

function openEdit(row) {
  editingItem.value = { ...row }
  showDialog.value = true
}

function openContatti(row) {
  contattiTarget.value = row
  showContatti.value = true
}

function onSaved() {
  // nothing to refresh
}
</script>

<style scoped>
.famiglia-search-input {
  max-width: 320px;
}
</style>
