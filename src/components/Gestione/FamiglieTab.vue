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
        class="col"
        @update:model-value="onSearchChange"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
      </q-input>

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

      <q-space />

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
            header-class="expansion-header"
            @show="loadExpanded(props.row)"
          >
            <template #header>
              <q-item-section>
                <q-item-label>{{ props.row.Nome_Famiglia || 'Famiglia senza nome' }}</q-item-label>
                <q-item-label caption>
                  <q-badge
                    :color="props.row.HasVolontario ? 'positive' : 'grey-5'"
                    :label="props.row.HasVolontario ? 'Associato' : 'Nessuno'"
                    class="q-mr-xs"
                  />
                  Volontario
                </q-item-label>
              </q-item-section>
            </template>
            <q-card flat bordered>
              <q-card-section class="q-pa-sm">
                <div class="row q-col-gutter-sm q-mb-sm">
                  <div class="col-12">
                    <InlineEditableField
                      :model-value="props.row.IBAN"
                      label="IBAN"
                      :readonly="!authStore.canAdmin"
                      :saving="savingField === `IBAN_${props.row.id_famiglia}`"
                      history-collection="Famiglie"
                      :history-item-id="props.row.id_famiglia"
                      history-field="IBAN"
                      :revisions="revisioniFamiglie[props.row.id_famiglia]?.IBAN"
                      @save="value => handleInlineSave(props.row, 'IBAN', value)"
                    />
                  </div>
                  <div class="col-12">
                    <InlineEditableField
                      :model-value="props.row.Intestatario_CC"
                      label="Intestatario CC"
                      :readonly="!authStore.canAdmin"
                      :saving="savingField === `Intestatario_CC_${props.row.id_famiglia}`"
                      history-collection="Famiglie"
                      :history-item-id="props.row.id_famiglia"
                      history-field="Intestatario_CC"
                      :revisions="revisioniFamiglie[props.row.id_famiglia]?.Intestatario_CC"
                      @save="value => handleInlineSave(props.row, 'Intestatario_CC', value)"
                    />
                  </div>
                </div>

                <q-separator class="q-mb-sm" />
                <div class="text-caption text-grey-7 q-mb-sm">Contatti</div>
                <div v-if="expandedLoading && !expandedCache[props.row.id_famiglia]" class="text-center q-py-md">
                  <q-spinner size="sm" /> Caricamento...
                </div>
                <div
                  v-else-if="!expandedCache[props.row.id_famiglia] || expandedCache[props.row.id_famiglia].length === 0"
                  class="text-grey q-py-sm"
                >
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
                        <q-item-label caption>
                          <template v-for="em in c._emails" :key="em.email_address">
                            <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" /><ContactLink
                              type="email"
                              :value="em.email_address"
                            />
                            <q-badge
                              v-if="em.Primary"
                              color="primary"
                              label="Primaria"
                              size="xs"
                              class="q-ml-xs q-mr-sm"
                            />
                          </template>
                        </q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-btn
                          flat
                          round
                          dense
                          icon="delete"
                          size="sm"
                          color="negative"
                          @click="confirmRemoveContatto(c, props.row)"
                        >
                          <q-tooltip>Rimuovi contatto</q-tooltip>
                        </q-btn>
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
                        <q-item-label caption>
                          <template v-for="em in c._emails" :key="em.email_address">
                            <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" /><ContactLink
                              type="email"
                              :value="em.email_address"
                            />
                            <q-badge
                              v-if="em.Primary"
                              color="primary"
                              label="Primaria"
                              size="xs"
                              class="q-ml-xs q-mr-sm"
                            />
                          </template>
                        </q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-btn
                          flat
                          round
                          dense
                          icon="delete"
                          size="sm"
                          color="negative"
                          @click="confirmRemoveContatto(c, props.row)"
                        >
                          <q-tooltip>Rimuovi contatto</q-tooltip>
                        </q-btn>
                      </q-item-section>
                    </q-item>
                  </template>
                  <q-item dense class="q-px-none">
                    <q-item-section>
                      <q-btn
                        flat
                        dense
                        icon="person_add"
                        color="primary"
                        label="Aggiungi contatto"
                        @click="openContatti(props.row)"
                      />
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
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
          <q-td v-for="col in props.cols" :key="col.name" :props="props">
            <template v-if="col.name === 'nome'">
              <InlineEditableField
                :model-value="props.row.Nome_Famiglia"
                :readonly="!authStore.canAdmin"
                :saving="savingField === `nome_${props.row.id_famiglia}`"
                history-collection="Famiglie"
                :history-item-id="props.row.id_famiglia"
                history-field="Nome_Famiglia"
                :revisions="revisioniFamiglie[props.row.id_famiglia]?.Nome_Famiglia"
                @save="value => handleInlineSave(props.row, 'Nome_Famiglia', value)"
              />
            </template>
            <template v-else-if="col.name === 'IBAN'">
              <InlineEditableField
                :model-value="props.row.IBAN"
                :readonly="!authStore.canAdmin"
                :saving="savingField === `IBAN_${props.row.id_famiglia}`"
                history-collection="Famiglie"
                :history-item-id="props.row.id_famiglia"
                history-field="IBAN"
                :revisions="revisioniFamiglie[props.row.id_famiglia]?.IBAN"
                @save="value => handleInlineSave(props.row, 'IBAN', value)"
              />
            </template>
            <template v-else-if="col.name === 'intestatario'">
              <InlineEditableField
                :model-value="props.row.Intestatario_CC"
                :readonly="!authStore.canAdmin"
                :saving="savingField === `Intestatario_CC_${props.row.id_famiglia}`"
                history-collection="Famiglie"
                :history-item-id="props.row.id_famiglia"
                history-field="Intestatario_CC"
                :revisions="revisioniFamiglie[props.row.id_famiglia]?.Intestatario_CC"
                @save="value => handleInlineSave(props.row, 'Intestatario_CC', value)"
              />
            </template>
            <template v-else-if="col.name === 'volontario'">
              <q-badge
                :color="props.row.HasVolontario ? 'positive' : 'grey-5'"
                :label="props.row.HasVolontario ? 'Associato' : 'Nessuno'"
              />
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
                <div class="text-caption text-grey-7 q-mb-sm">Contatti</div>
                <div v-if="expandedLoading && !expandedCache[props.row.id_famiglia]" class="text-center q-py-md">
                  <q-spinner size="sm" /> Caricamento...
                </div>
                <div
                  v-else-if="!expandedCache[props.row.id_famiglia] || expandedCache[props.row.id_famiglia].length === 0"
                  class="text-grey q-py-sm"
                >
                  Nessun contatto assegnato a questa famiglia.
                </div>
                <q-list v-else dense>
                  <template v-for="c in expandedCache[props.row.id_famiglia]" :key="c.id">
                    <q-item v-if="c.Ruolo_nella_Famiglia === 'Genitore'" dense>
                      <q-item-section>
                        <q-item-label>
                          {{ c.Contatto?.Nome || '' }} {{ c.Contatto?.Cognome || '' }}
                          <q-badge outline color="secondary" class="q-ml-sm">
                            {{ c.Ruolo_nella_Famiglia }}
                          </q-badge>
                        </q-item-label>
                        <q-item-label caption>
                          <template v-for="em in c._emails" :key="em.email_address">
                            <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" />
                            <ContactLink type="email" :value="em.email_address" />
                            <q-badge
                              v-if="em.Primary"
                              color="primary"
                              label="Primaria"
                              size="xs"
                              class="q-ml-xs q-mr-sm"
                            />
                          </template>
                          <template v-if="c.Contatto?.Numero_di_cellulare">
                            <span class="q-ml-sm">
                              <q-icon name="smartphone" size="xs" class="q-mr-xs text-grey-6" />
                              <ContactLink type="tel" :value="c.Contatto.Numero_di_cellulare" />
                            </span>
                          </template>
                          <template v-if="c.Contatto?.Numero_di_telefono">
                            <span class="q-ml-sm">
                              <q-icon name="phone" size="xs" class="q-mr-xs text-grey-6" />
                              <ContactLink type="tel" :value="c.Contatto.Numero_di_telefono" />
                            </span>
                          </template>
                        </q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-btn
                          flat
                          round
                          dense
                          icon="delete"
                          size="sm"
                          color="negative"
                          @click="confirmRemoveContatto(c, props.row)"
                        >
                          <q-tooltip>Rimuovi contatto</q-tooltip>
                        </q-btn>
                      </q-item-section>
                    </q-item>
                  </template>

                  <q-separator
                    v-if="expandedCache[props.row.id_famiglia]?.some(c => c.Ruolo_nella_Famiglia !== 'Genitore')"
                    class="q-my-sm"
                  />

                  <template v-for="c in expandedCache[props.row.id_famiglia]" :key="c.id + '-vol'">
                    <q-item v-if="c.Ruolo_nella_Famiglia !== 'Genitore'" dense>
                      <q-item-section>
                        <q-item-label>
                          {{ c.Contatto?.Nome || '' }} {{ c.Contatto?.Cognome || '' }}
                          <q-badge outline color="primary" class="q-ml-sm">
                            {{ c.Ruolo_nella_Famiglia }}
                          </q-badge>
                        </q-item-label>
                        <q-item-label caption>
                          <template v-for="em in c._emails" :key="em.email_address">
                            <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" />
                            <ContactLink type="email" :value="em.email_address" />
                            <q-badge
                              v-if="em.Primary"
                              color="primary"
                              label="Primaria"
                              size="xs"
                              class="q-ml-xs q-mr-sm"
                            />
                          </template>
                          <template v-if="c.Contatto?.Numero_di_cellulare">
                            <span class="q-ml-sm">
                              <q-icon name="smartphone" size="xs" class="q-mr-xs text-grey-6" />
                              <ContactLink type="tel" :value="c.Contatto.Numero_di_cellulare" />
                            </span>
                          </template>
                          <template v-if="c.Contatto?.Numero_di_telefono">
                            <span class="q-ml-sm">
                              <q-icon name="phone" size="xs" class="q-mr-xs text-grey-6" />
                              <ContactLink type="tel" :value="c.Contatto.Numero_di_telefono" />
                            </span>
                          </template>
                        </q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-btn
                          flat
                          round
                          dense
                          icon="delete"
                          size="sm"
                          color="negative"
                          @click="confirmRemoveContatto(c, props.row)"
                        >
                          <q-tooltip>Rimuovi contatto</q-tooltip>
                        </q-btn>
                      </q-item-section>
                    </q-item>
                  </template>
                  <q-item dense>
                    <q-item-section>
                      <q-btn
                        flat
                        dense
                        icon="person_add"
                        color="primary"
                        label="Aggiungi contatto"
                        @click="openContatti(props.row)"
                      />
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>
          </q-td>
        </q-tr>
      </template>
    </q-table>

    <FamigliaDialog v-model="showDialog" :edit-item="editingItem" @saved="onSaved" />

    <ContattiDialog v-model="showContatti" :famiglia="contattiTarget" hide-existing />
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, watch, onMounted } from 'vue'
import ContactLink from 'components/Common/ContactLink.vue'
import InlineEditableField from 'components/Common/InlineEditableField.vue'
import { emailService } from 'src/services/email.service'
import { gestioneService } from 'src/services/gestione.service'
import { revisionsService } from 'src/services/revisions.service'
import { enrichWithEmails } from 'src/utils/enrichment'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { useAuthStore } from 'stores/auth.store'
import { useGestioneStore } from 'stores/gestione.store'
import ContattiDialog from './ContattiDialog.vue'
import FamigliaDialog from './FamigliaDialog.vue'

const store = useGestioneStore()
const $q = useQuasar()
const authStore = useAuthStore()

const search = ref('')
const volontarioFilter = ref('tutti')
const revisioniFamiglie = ref({})
const savingField = ref('')
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

watch(showContatti, val => {
  if (val) {
    expandedRows.value = []
    expandedCache.value = {}
  }
})

watch(volontarioFilter, val => {
  store.volontarioFilter = val
  pagination.value.page = 1
  loadData()
})

const columns = [
  { name: 'nome', label: 'Nome Famiglia', field: 'Nome_Famiglia', align: 'left', sortable: true },
  { name: 'volontario', label: 'Volontario', field: 'HasVolontario', align: 'center' },
  { name: 'IBAN', label: 'IBAN', align: 'left' },
  { name: 'intestatario', label: 'Intestatario CC', field: 'Intestatario_CC', align: 'left' }
]

async function loadData() {
  const SORT_FIELD_MAP = {
    nome: 'Nome_Famiglia',
    IBAN: 'IBAN',
    intestatario: 'Intestatario_CC'
  }
  const sortField = SORT_FIELD_MAP[pagination.value.sortBy] || pagination.value.sortBy
  const sort = sortField ? (pagination.value.descending ? `-${sortField}` : sortField) : undefined
  const params = {
    page: pagination.value.page,
    limit: pagination.value.rowsPerPage > 0 ? pagination.value.rowsPerPage : -1,
    search: search.value || undefined,
    sort
  }
  await store.fetchAll(params)
  pagination.value.rowsNumber = store.totalFamiglie
  if (!authStore.canAdmin) return
  const ids = store.famiglie.map(f => f.id_famiglia).filter(Boolean)
  if (ids.length === 0) return
  try {
    const data = await revisionsService.getBulkRevisions('Famiglie', ids, 100)
    revisioniFamiglie.value = revisionsService.groupByItemAndField(data, ['Nome_Famiglia', 'IBAN', 'Intestatario_CC'])
  } catch {
    revisioniFamiglie.value = {}
  }
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
  if (!row || expandedCache.value[row.id_famiglia]) return
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

async function handleInlineSave(row, field, value) {
  savingField.value = `${field}_${row.id_famiglia}`
  try {
    await gestioneService.updateFamiglia(row.id_famiglia, { [field]: value })
    row[field] = value
    notifySuccess($q, 'Campo aggiornato')
  } catch (error) {
    notifyError($q, error, 'Errore aggiornamento')
  } finally {
    savingField.value = ''
  }
}

function confirmRemoveContatto(c, row) {
  $q.dialog({
    title: 'Rimuovere contatto?',
    message: `Rimuovere ${c.Contatto?.Nome || ''} ${c.Contatto?.Cognome || ''} dalla famiglia?`,
    cancel: { label: 'Annulla', flat: true },
    ok: { label: 'Rimuovi', color: 'negative' },
    persistent: true
  }).onOk(async () => {
    try {
      await gestioneService.removeFromFamiglia(c.id)
      loadExpanded(row)
      notifySuccess($q, 'Contatto rimosso')
    } catch (error) {
      notifyError($q, error, 'Errore rimozione contatto')
    }
  })
}

function openCreate() {
  editingItem.value = null
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
