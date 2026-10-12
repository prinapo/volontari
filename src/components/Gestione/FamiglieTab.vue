<template>
  <div>
    <div class="text-h5 text-weight-medium q-mb-md">Famiglie</div>
    <div class="row q-gutter-sm q-mb-md">
      <q-btn color="primary" icon="home_work" label="Aggiungi Famiglia" @click="openCreate" />
    </div>

    <q-table
      v-model:expanded="expandedRows"
      v-model:pagination="pagination"
      :rows="rows"
      :columns="columns"
      row-key="id_famiglia"
      flat
      bordered
      :grid="$q.screen.lt.sm"
      :loading="loading"
      @request="onRequest"
    >
      <template #top>
        <div class="full-width">
          <TableToolbar
            v-model:search="searchTerm"
            search-placeholder="Cerca per nome famiglia..."
            :loading="loading"
            refresh
            @update:search="onSearchChange"
            @refresh="loadData"
          >
            <template #filters>
              <q-select
                v-model="volontarioFilter"
                :options="filterOptions"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                dense
                outlined
                class="col-12 col-sm-6 col-md-4"
              />
            </template>
          </TableToolbar>
        </div>
      </template>

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
                <FamigliaContattiList
                  :contatti="expandedCache[props.row.id_famiglia]"
                  :loading="expandedLoading"
                  @add="openContatti(props.row)"
                  @remove="c => confirmRemoveContatto(c, props.row)"
                />
              </q-card-section>
            </q-card>

            <div v-if="progettiLoading && !progettiCache[props.row.id_famiglia]" class="text-center q-py-md">
              <q-spinner size="sm" /> Caricamento progetti...
            </div>
            <q-card v-else-if="progettiCache[props.row.id_famiglia]?.length" flat bordered class="q-mt-sm">
              <q-card-section class="q-pa-sm">
                <div class="text-caption text-grey-7 q-mb-sm">Progetti ({{ progettiCache[props.row.id_famiglia].length }})</div>
                <ProgettoDetailPanel
                  v-for="prog in progettiCache[props.row.id_famiglia]"
                  :key="prog.id_progetto"
                  :prog="prog"
                  :can-admin="authStore.canAdmin"
                  :saving="salvandoProgId === prog.id_progetto"
                  class="q-mb-sm"
                  @save-field="(f, v) => saveProgettoField(prog, f, v)"
                  @save-percentuale="v => salvaPercentualeProgetto(prog, v)"
                />
               </q-card-section>
             </q-card>
            <div v-else-if="!progettiLoading && !progettiCache[props.row.id_famiglia]" class="text-grey q-py-sm">
              Nessun progetto per questa famiglia.
            </div>
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
          <q-td colspan="100%" class="text-break">
            <q-card flat bordered class="q-ma-sm">
              <q-card-section>
                <FamigliaContattiList
                  :contatti="expandedCache[props.row.id_famiglia]"
                  :loading="expandedLoading"
                  @add="openContatti(props.row)"
                  @remove="c => confirmRemoveContatto(c, props.row)"
                />
              </q-card-section>
            </q-card>

            <div v-if="progettiLoading && !progettiCache[props.row.id_famiglia]" class="text-center q-py-md">
              <q-spinner size="sm" /> Caricamento progetti...
            </div>
            <q-card v-else-if="progettiCache[props.row.id_famiglia]?.length" flat bordered class="q-mt-sm">
              <q-card-section class="q-pa-sm">
                <div class="text-caption text-grey-7 q-mb-sm">Progetti ({{ progettiCache[props.row.id_famiglia].length }})</div>
                <ProgettoDetailPanel
                  v-for="prog in progettiCache[props.row.id_famiglia]"
                  :key="prog.id_progetto"
                  :prog="prog"
                  :can-admin="authStore.canAdmin"
                  :saving="salvandoProgId === prog.id_progetto"
                  class="q-mb-sm"
                  @save-field="(f, v) => saveProgettoField(prog, f, v)"
                  @save-percentuale="v => salvaPercentualeProgetto(prog, v)"
                />
               </q-card-section>
             </q-card>
            <div v-else-if="!progettiLoading && !progettiCache[props.row.id_famiglia]" class="text-grey q-py-sm">
              Nessun progetto per questa famiglia.
            </div>
          </q-td>
        </q-tr>
      </template>
    </q-table>

    <FamigliaDialog v-model="showDialog" :edit-item="editingItem" @saved="onSaved" />

    <FamigliaContattiDialog v-model="showContatti" :famiglia="contattiTarget" hide-existing />
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, watch, onMounted } from 'vue'
import InlineEditableField from 'components/Common/InlineEditableField.vue'
import TableToolbar from 'components/TableToolbar.vue'
import { useServerTable } from 'src/composables/useServerTable'
import { emailService } from 'src/services/email.service'
import { famiglieService } from 'src/services/famiglie.service'
import { gestioneService } from 'src/services/gestione.service'
import { progettiService } from 'src/services/progetti.service'
import { revisionsService } from 'src/services/revisions.service'
import { enrichWithEmails } from 'src/utils/enrichment'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { useAuthStore } from 'stores/auth.store'
import { useGestioneStore } from 'stores/gestione.store'
import FamigliaContattiDialog from './FamigliaContattiDialog.vue'
import FamigliaContattiList from './FamigliaContattiList.vue'
import FamigliaDialog from './FamigliaDialog.vue'
import ProgettoDetailPanel from './ProgettoDetailPanel.vue'

const store = useGestioneStore()
const $q = useQuasar()
const authStore = useAuthStore()

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
const progettiCache = ref({})
const progettiLoading = ref(false)
const salvandoProgId = ref(null)

const {
  rows,
  loading,
  pagination,
  searchTerm,
  onRequest,
  onSearchChange,
  loadData
} = useServerTable(
  async (params) => {
    await store.fetchAll(params)
    if (authStore.canAdmin) {
      const ids = store.famiglie.map(f => f.id_famiglia).filter(Boolean)
      if (ids.length > 0) {
        try {
          const data = await revisionsService.getBulkRevisions('Famiglie', ids, 100)
          revisioniFamiglie.value = revisionsService.groupByItemAndField(data, ['Nome_Famiglia', 'IBAN', 'Intestatario_CC'])
        } catch {
          revisioniFamiglie.value = {}
        }
      }
    }
    return { rows: store.famiglie, total: store.totalFamiglie }
  },
  {
    sortMap: {
      nome: 'Nome_Famiglia',
      IBAN: 'IBAN',
      intestatario: 'Intestatario_CC'
    }
  }
)

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
  loadProgetti(row)
}

async function loadProgetti(row) {
  if (!row || progettiCache.value[row.id_famiglia]) return
  const fid = row.id_famiglia
  progettiLoading.value = true
  try {
    const famRes = await famiglieService.getById(fid)
    const progetti = famRes.data.data?.Progetti || []
    progettiCache.value = { ...progettiCache.value, [fid]: progetti }
  } catch {
    if (!progettiCache.value[fid]) progettiCache.value = { ...progettiCache.value, [fid]: [] }
  } finally {
    progettiLoading.value = false
  }
}

async function saveProgettoField(prog, field, value) {
  salvandoProgId.value = prog.id_progetto
  try {
    await progettiService.update(prog.id_progetto, { [field]: value })
    prog[field] = value
    notifySuccess($q, 'Campo aggiornato')
  } catch (error) {
    notifyError($q, error, 'Errore aggiornamento')
  } finally {
    salvandoProgId.value = null
  }
}

async function salvaPercentualeProgetto(prog, val) {
  if (!prog || !prog.id_progetto) return
  const pct = val === '' || val === null ? null : Math.min(100, Math.max(0, Number.parseInt(val, 10) || 0))
  salvandoProgId.value = prog.id_progetto
  try {
    await progettiService.update(prog.id_progetto, { MassimaPercentualeErogabile: pct })
    prog.MassimaPercentualeErogabile = pct
    notifySuccess($q, 'Percentuale aggiornata', 1500)
  } catch (error) {
    notifyError($q, error, 'Errore salvataggio percentuale')
  } finally {
    salvandoProgId.value = null
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
  loadData()
}
</script>
