<template>
  <div class="row items-center q-gutter-sm q-mb-md">
    <div>
      <div class="text-h5 text-weight-medium">Verifica rendicontazione</div>
      <div class="text-body2 text-grey-7">Controllo importi rimborsabili e verifica giustificativi.</div>
    </div>
    <q-space />
  </div>

  <div class="row q-col-gutter-md q-mb-md">
    <div v-for="s in summary" :key="s.label" class="col-6 col-sm-3">
      <q-card flat bordered class="fit">
        <q-card-section class="text-center">
          <div class="text-caption text-grey-7">
            {{ s.label }}
          </div>
          <div class="text-h6" :class="s.color ? 'text-' + s.color : ''">
            {{ s.value }}
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>

  <q-banner v-if="store.error" class="bg-red-1 text-negative q-mb-md" rounded>
    {{ store.error }}
  </q-banner>

  <q-banner
    v-if="store.statoDisallineati.length > 0"
    class="bg-warning-2 text-dark q-mb-md"
    rounded
    dense
  >
    <template #avatar>
      <q-icon name="error_outline" color="warning" />
    </template>
    Alcuni progetti hanno uno stato non allineato ai dati. Segnalali all'amministratore
    (Admin → Consistenza → Trasformazioni) per verificarli.
    <q-list dense class="q-mt-sm">
      <q-item v-for="d in store.statoDisallineati" :key="d.idProgetto" dense class="q-px-none q-py-none">
        <q-item-section>
          <div>
            <span class="text-weight-medium">{{ d.beneficiario || d.idProgetto }}</span>
            <q-badge :color="statoProgettoColor(d.statoDB)" :label="statoProgettoLabel(d.statoDB)" outline class="q-mx-xs" />
            →
            <q-badge :color="statoProgettoColor(d.statoCalcolato)" :label="statoProgettoLabel(d.statoCalcolato)" outline class="q-ml-xs" />
          </div>
        </q-item-section>
      </q-item>
    </q-list>
  </q-banner>

  <q-table
    v-model:pagination="pagination"
    v-model:expanded="expandedRows"
    flat
    bordered
    class="verifica-table bg-white"
    row-key="idProgetto"
    :rows="filteredRows"
    :columns="columns"
    :loading="loading"
    :grid="$q.screen.lt.sm"
    :dense="$q.screen.lt.md"
    @request="onRequest"
  >
    <template #top>
      <div class="full-width">
        <TableToolbar
          v-model:search="searchTerm"
          search-placeholder="Cerca famiglia..."
          search-aria-label="Cerca famiglia"
          :loading="loading"
          refresh
          @update:search="onSearchChange"
          @refresh="loadData"
        >
          <template #filters>
            <q-select
              v-model="selectedAnno"
              :options="annoOptions"
              emit-value
              map-options
              outlined
              dense
              clearable
              label="Anno bando"
              class="col-12 col-sm-6 col-md-4"
            />
            <q-select
              v-model="selectedStatoProgetto"
              :options="statoProgettoOptions"
              emit-value
              map-options
              outlined
              dense
              clearable
              label="Stato progetto"
              class="col-12 col-sm-6 col-md-4"
            />
            <q-btn
              icon="download"
              label="Esporta Excel"
              color="primary"
              dense
              data-testid="btn-export-excel"
              :loading="store.loading"
              :disable="store.loading"
              @click="store.exportExcel"
            >
              <q-tooltip>Esporta tutti i progetti in Excel (con dettagli contatti e giustificativi)</q-tooltip>
            </q-btn>
            <q-btn
              icon="table_view"
              label="Esporta dettagliato"
              color="primary"
              outline
              dense
              data-testid="btn-export-dettagliato"
              :loading="store.exporting"
              :disable="store.exporting"
              @click="store.exportExcelDettagliato"
            >
              <q-tooltip>Export multi-foglio: progetti, contatti (anagrafica completa) e giustificativi</q-tooltip>
            </q-btn>
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
          :label="props.row.famiglia || 'Famiglia senza nome'"
          :caption="`${props.row.beneficiario || ''} — Bando ${props.row.annoBando}`"
          header-class="expansion-header"
          @show="loadFamigliaContatti(props.row.idFamiglia)"
        >
          <q-card flat bordered>
            <q-card-actions class="q-pa-sm q-gutter-xs">
              <q-btn
                v-if="canVerifica"
                flat
                round
                dense
                icon="add"
                color="primary"
                size="sm"
                aria-label="Aggiungi giustificativo"
                @click="addingForRow = props.row"
              >
                <q-tooltip>Aggiungi giustificativo</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="visibility"
                size="sm"
                aria-label="Dettaglio progetto"
                @click="openRowDetail(props.row)"
              >
                <q-tooltip>Dettaglio progetto</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="sticky_note_2"
                size="sm"
                aria-label="Aggiungi nota"
                @click="notaRapidaRow = props.row"
              >
                <q-tooltip>Aggiungi nota</q-tooltip>
              </q-btn>
              <q-btn
                v-if="canVerifica && isStatoManuale(props.row.statoProgetto)"
                flat
                round
                dense
                icon="play_arrow"
                color="primary"
                size="sm"
                aria-label="Avanza stato progetto"
                :loading="savingAvanzaStato"
                @click="handleAvanzaStato(props.row)"
              >
                <q-tooltip>{{ labelAvanzaStato(props.row.statoProgetto) }}</q-tooltip>
              </q-btn>
              <q-btn
                v-if="canVerifica && isStatoOperativo(props.row.statoProgetto)"
                flat
                round
                dense
                size="sm"
                icon="lock"
                color="warning"
                aria-label="Chiudi progetto"
                @click="openChiudiProgetto(props.row)"
              >
                <q-tooltip>Chiudi progetto</q-tooltip>
              </q-btn>
              <q-btn
                v-if="canVerifica && isStatoFinale(props.row.statoProgetto)"
                flat
                round
                dense
                size="sm"
                icon="lock_open"
                color="positive"
                aria-label="Riapri progetto"
                :loading="savingRiapriProgetto"
                @click="handleRiapriProgetto(props.row)"
              >
                <q-tooltip>Riapri progetto</q-tooltip>
              </q-btn>
            </q-card-actions>
            <RendicontazioneRowDetail
              :row="props.row"
              :can-verifica="canVerifica"
              :genitori="genitoriCache[props.row.idFamiglia]"
              :volontari="volontariCache[props.row.idFamiglia]"
              :contatti-loading="contattiLoading"
              :saving-field="savingField"
              :verifying-id="verifyingId"
              giust-layout="cards"
              :stato-riga="statoRiga(props.row)"
              @edit-bancari="openBancariDialog(props.row)"
              @save-field="(g, field, val) => handleFieldSave(props.row.idProgetto, g, field, val)"
              @verify="g => handleVerify(props.row.idProgetto, g)"
              @reject="g => handleReject(props.row.idProgetto, g)"
              @revert="g => handleRevert(props.row.idProgetto, g)"
              @send-draft="g => handleSendDraft(props.row.idProgetto, g)"
            />
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
            :icon="expandedRows.includes(props.row.idProgetto) ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
            data-testid="expand-row"
            :aria-label="expandedRows.includes(props.row.idProgetto) ? 'Chiudi' : 'Apri dettagli'"
            @click="toggleExpand(props.row.idProgetto)"
          >
            <q-tooltip>{{ expandedRows.includes(props.row.idProgetto) ? 'Chiudi' : 'Apri dettagli' }}</q-tooltip>
          </q-btn>
        </q-td>
        <q-td v-for="col in props.cols" :key="col.name" :props="props">
          <template v-if="col.name === 'famiglia'">
            <div class="text-weight-medium">
              {{ props.row.famiglia || 'Famiglia senza nome' }}
            </div>
            <div class="text-caption text-grey-7">
              {{ props.row.beneficiario || '' }}
            </div>
          </template>

          <template v-else-if="col.name === 'allocato'">
            <div class="text-weight-medium">
              {{ formatCurrency(props.row.allocato) }}
            </div>
          </template>

          <template v-else-if="col.name === 'rendicontato'">
            <div class="text-weight-medium">
              {{ formatCurrency(props.row.totaleRendicontato) }}
            </div>
            <div class="text-caption text-grey-7">{{ totalGiustificativi(props.row) }} giustificativi</div>
          </template>

          <template v-else-if="col.name === 'stato'">
            <q-badge :color="statoRiga(props.row).color">
              {{ statoRiga(props.row).label }}
            </q-badge>
          </template>

          <template v-else-if="col.name === 'statoProgetto'">
            <q-badge :color="statoProgettoColor(props.row.statoProgetto)" outline>
              {{ statoProgettoLabel(props.row.statoProgetto) }}
            </q-badge>
          </template>

          <template v-else-if="col.name === 'pagato'">
            <div class="text-right">
              <div class="text-body2">{{ formatCurrency(props.row.totalePagato) }}</div>
              <div class="text-caption text-grey-6">/ {{ formatCurrency(props.row.allocato) }}</div>
            </div>
          </template>

          <template v-else-if="col.name === 'actions'">
            <q-btn
              v-if="canVerifica"
              flat
              round
              dense
              icon="add"
              color="primary"
              size="sm"
              data-testid="btn-add-giust"
              aria-label="Aggiungi giustificativo"
              @click="addingForRow = props.row"
            >
              <q-tooltip>Aggiungi giustificativo</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              icon="visibility"
              size="sm"
              data-testid="btn-detail-row"
              aria-label="Dettaglio progetto"
              @click="openRowDetail(props.row)"
            >
              <q-tooltip>Dettaglio progetto</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              icon="sticky_note_2"
              size="sm"
              data-testid="btn-add-note"
              aria-label="Aggiungi nota"
              @click="notaRapidaRow = props.row"
            >
              <q-tooltip>Aggiungi nota</q-tooltip>
            </q-btn>
            <q-btn
              v-if="canVerifica && isStatoManuale(props.row.statoProgetto)"
              flat
              round
              dense
              icon="play_arrow"
              color="primary"
              size="sm"
              aria-label="Avanza stato progetto"
              :loading="savingAvanzaStato"
              @click="handleAvanzaStato(props.row)"
            >
              <q-tooltip>{{ labelAvanzaStato(props.row.statoProgetto) }}</q-tooltip>
            </q-btn>
            <q-btn
              v-if="canVerifica && isStatoOperativo(props.row.statoProgetto)"
              flat
              round
              dense
              icon="lock"
              color="warning"
              size="sm"
              aria-label="Chiudi progetto"
              @click="openChiudiProgetto(props.row)"
            >
              <q-tooltip>Chiudi progetto</q-tooltip>
            </q-btn>
            <q-btn
              v-if="canVerifica && isStatoFinale(props.row.statoProgetto)"
              flat
              round
              dense
              icon="lock_open"
              color="positive"
              size="sm"
              aria-label="Riapri progetto"
              :loading="savingRiapriProgetto"
              @click="handleRiapriProgetto(props.row)"
            >
              <q-tooltip>Riapri progetto</q-tooltip>
            </q-btn>
          </template>

          <template v-else>
            {{ col.value }}
          </template>
        </q-td>
      </q-tr>
      <q-tr v-if="expandedRows.includes(props.row.idProgetto)" :props="props">
        <q-td colspan="100%" class="q-pa-none">
          <div class="expandable-content bg-grey-1">
            <RendicontazioneRowDetail
              :row="props.row"
              :can-verifica="canVerifica"
              :genitori="genitoriCache[props.row.idFamiglia]"
              :volontari="volontariCache[props.row.idFamiglia]"
              :contatti-loading="contattiLoading"
              :saving-field="savingField"
              :verifying-id="verifyingId"
              giust-layout="list"
              :stato-riga="statoRiga(props.row)"
              @edit-bancari="openBancariDialog(props.row)"
              @save-field="(g, field, val) => handleFieldSave(props.row.idProgetto, g, field, val)"
              @verify="g => handleVerify(props.row.idProgetto, g)"
              @reject="g => handleReject(props.row.idProgetto, g)"
              @revert="g => handleRevert(props.row.idProgetto, g)"
              @send-draft="g => handleSendDraft(props.row.idProgetto, g)"
            />
          </div>
        </q-td>
      </q-tr>
    </template>
  </q-table>

  <BancariDialog
    v-model="bancariDialog"
    :famiglia-name="editingRow?.famiglia || ''"
    :beneficiario="editingRow?.beneficiario || ''"
    :initial-iban="editingRow?.iban || ''"
    :initial-intestatario="editingRow?.intestatario || ''"
    :saving="savingBancari"
    @save="saveBancari"
  />

  <AppDialog v-model="chiudiProgettoDialog" title="Chiudi progetto">
    <q-card-section>
      <div class="text-body2 q-mb-sm">
        Vuoi chiudere il progetto <strong>{{ chiudiProgettoRow?.famiglia || '' }}</strong
        >?
      </div>
      <div class="text-caption text-grey-7 q-mb-md">
        Una volta chiuso, non verranno più generate nuove proposte di pagamento.
      </div>
      <q-input
        v-model="chiudiProgettoNota"
        label="Motivo della chiusura (opzionale)"
        outlined
        dense
        type="textarea"
        autogrow
      />
    </q-card-section>
    <template #footer>
      <q-btn v-close-popup flat dense size="sm" label="Annulla" />
      <q-btn color="warning" label="Chiudi progetto" :loading="savingChiudiProgetto" @click="handleChiudiProgetto" />
    </template>
  </AppDialog>

  <RifiutaGiustificativoDialog
    v-model="rejectDialog"
    :item="rejectItem"
    :saving="rejectingId === rejectItem?.id"
    @confirm="confirmReject"
  />

  <GiustificativoForm
    v-model="showAddForm"
    :progetto-id="addingForRow?.idProgetto || ''"
    :famiglia-id="addingForRow?.idFamiglia || ''"
    :anno-bando="addingForRow?.annoBando || ''"
    @save="handleAddSave"
  />

  <ProgettoDetailDialog v-model="detailDialog" :progetto="selectedProgettoRow" />

  <NotaRapidaDialog v-model="showNotaDialog" :progetto-id="notaRapidaRow?.idProgetto || ''" />
</template>

<script setup>
import { useQuasar } from 'quasar'
import { computed, onMounted, ref, watch } from 'vue'
import AppDialog from 'components/Common/AppDialog.vue'
import BancariDialog from 'components/Common/BancariDialog.vue'
import TableToolbar from 'components/TableToolbar.vue'
import GiustificativoForm from 'src/components/Giustificativi/GiustificativoForm.vue'
import { useServerTable } from 'src/composables/useServerTable'
import { statoProgettoColor, statoProgettoLabel } from 'src/utils/badges'
import { STATO_PROGETTO } from 'src/utils/constants'
import { formatCurrency } from 'src/utils/formatters'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { statoProgettoEffettivo } from 'src/utils/statoProgetto'
import { calcolaStatoRiga } from 'src/utils/statoRiga'
import { useAuthStore } from 'stores/auth.store'
import { useVerificaStore } from 'stores/verifica.store'
import NotaRapidaDialog from './NotaRapidaDialog.vue'
import ProgettoDetailDialog from './ProgettoDetailDialog.vue'
import RendicontazioneRowDetail from './RendicontazioneRowDetail.vue'
import RifiutaGiustificativoDialog from './RifiutaGiustificativoDialog.vue'

const $q = useQuasar()
const store = useVerificaStore()
const authStore = useAuthStore()

const selectedAnno = ref(null)
const selectedStatoProgetto = ref(null)
const verifyingId = ref(null)
const rejectingId = ref(null)
const savingField = ref(null)
const addingForRow = ref(null)
const showAddForm = computed({
  get: () => addingForRow.value !== null,
  set: val => {
    if (!val) addingForRow.value = null
  }
})

const notaRapidaRow = ref(null)
const showNotaDialog = computed({
  get: () => notaRapidaRow.value !== null,
  set: val => {
    if (!val) notaRapidaRow.value = null
  }
})

const bancariDialog = ref(false)
const editingRow = ref(null)
const genitoriCache = ref({})
const volontariCache = ref({})
const contattiLoading = ref(false)
const savingBancari = ref(false)

const rejectDialog = ref(false)
const rejectItem = ref(null)
const rejectProgettoId = ref(null)

const chiudiProgettoDialog = ref(false)
const chiudiProgettoRow = ref(null)
const chiudiProgettoNota = ref('')
const savingChiudiProgetto = ref(false)

const selectedProgetto = ref(null)
const detailDialog = ref(false)

const selectedProgettoRow = computed(() => filteredRows.value.find(r => r.idProgetto === selectedProgetto.value) || {})

const {
  loading,
  pagination,
  searchTerm,
  onRequest,
  onSearchChange,
  setFilters,
  loadData
} = useServerTable(
  async (params) => {
    await store.fetchPage({
      page: params.page,
      limit: params.limit,
      sort: params.sort,
      search: params.search,
      anno: selectedAnno.value || undefined,
      statoProgettoFilter: params.statoProgettoFilter || undefined
    })
    return { rows: store.rows, total: store.filterCount }
  },
  { perPage: 25 }
)

const filteredRows = computed(() => store.rows)

// Stato di riga memoizzato: ricalcolato solo quando le righe cambiano (evita
// di risommare i giustificativi a ogni render per ogni badge).
const rowStati = computed(() => {
  const m = new Map()
  for (const row of filteredRows.value) {
    m.set(row.idProgetto, calcolaStatoRiga(row))
  }
  return m
})

const annoOptions = computed(() =>
  store.anniBando.map(anno => ({
    label: String(anno),
    value: anno
  }))
)

const statoProgettoOptions = ['proposto', 'validato', 'approvato', 'accettato', 'in_rendicontazione', 'rimborso_parziale', 'chiuso'].map(
  v => ({ label: statoProgettoLabel(v), value: v })
)

const canVerifica = computed(() => authStore.canManager)

const isStatoOperativo = stato => {
  const s = stato === 'aperto' ? 'accettato' : stato
  return s === 'accettato' || s === 'in_rendicontazione' || s === 'rimborso_parziale'
}

const isStatoFinale = stato => stato === 'chiuso'

const isStatoManuale = stato => {
  const s = statoProgettoEffettivo(stato)
  return s === STATO_PROGETTO.PROPOSTO || s === STATO_PROGETTO.VALIDATO || s === STATO_PROGETTO.APPROVATO
}

const labelAvanzaStato = stato => {
  const s = statoProgettoEffettivo(stato)
  if (s === STATO_PROGETTO.PROPOSTO) return 'Valida progetto'
  if (s === STATO_PROGETTO.VALIDATO) return 'Approva progetto'
  return 'Accetta progetto'
}

const columns = [
  { name: 'annoBando', label: 'Bando', field: 'annoBando', align: 'left', sortable: true },
  { name: 'famiglia', label: 'Famiglia', field: 'famiglia', align: 'left', sortable: true },
  { name: 'allocato', label: 'Allocato', field: 'allocato', align: 'right', sortable: true },
  { name: 'rendicontato', label: 'Rendicontato', field: 'totaleRendicontato', align: 'right', sortable: true },
  { name: 'pagato', label: 'Pagato', field: 'totalePagato', align: 'right' },
  { name: 'stato', label: 'Stato rendicontazione', field: 'id', align: 'left' },
  { name: 'statoProgetto', label: 'Stato progetto', field: 'statoProgetto', align: 'left' },
  { name: 'actions', label: '', field: 'id', align: 'right' }
]

const selectedTotals = computed(() => {
  return filteredRows.value.reduce(
    (totals, row) => {
      totals.rendicontato += Number(row.totaleRendicontato) || 0
      totals.rimborsabile += Number(row.totaleRimborsabile) || 0
      return totals
    },
    { rendicontato: 0, rimborsabile: 0 }
  )
})

const prontiCount = computed(() => {
  return filteredRows.value.filter(
    row =>
      row.totaleRimborsabile > 0 &&
      row.iban &&
      row.intestatario &&
      (!row.giustificativi || !row.giustificativi.some(g => g.Stato === 'inviato'))
  ).length
})

const summary = computed(() => [
  { label: 'Famiglie/progetti', value: String(filteredRows.value.length), color: '' },
  { label: 'Rendicontato', value: formatCurrency(selectedTotals.value.rendicontato), color: 'primary' },
  { label: 'Rimborsabile', value: formatCurrency(selectedTotals.value.rimborsabile), color: 'positive' },
  { label: 'Pronte', value: String(prontiCount.value), color: '' }
])

onMounted(() => {
  store.fetchAnni()
  loadData()
  store.checkStatoDisallineati()
})

watch(selectedAnno, () => {
  onSearchChange()
})

watch(selectedStatoProgetto, val => {
  setFilters({ statoProgettoFilter: val || undefined })
})

function totalGiustificativi(row) {
  return (row.giustificativi || []).filter(g => !g.Invalidato).length
}

function statoRiga(row) {
  return rowStati.value.get(row.idProgetto) || calcolaStatoRiga(row)
}

async function loadFamigliaContatti(famigliaId) {
  if (!famigliaId) return
  if (genitoriCache.value[famigliaId] && volontariCache.value[famigliaId]) return
  contattiLoading.value = true
  try {
    const { genitori, volontari } = await store.loadFamigliaContacts(famigliaId)
    genitoriCache.value = { ...genitoriCache.value, [famigliaId]: genitori }
    volontariCache.value = { ...volontariCache.value, [famigliaId]: volontari }
  } catch {
    genitoriCache.value = { ...genitoriCache.value, [famigliaId]: [] }
    volontariCache.value = { ...volontariCache.value, [famigliaId]: [] }
  } finally {
    contattiLoading.value = false
  }
}

const expandedRows = ref([])

function toggleExpand(progettoId) {
  const idx = expandedRows.value.indexOf(progettoId)
  if (idx === -1) {
    expandedRows.value.push(progettoId)
    const row = filteredRows.value.find(r => r.idProgetto === progettoId)
    if (row) loadFamigliaContatti(row.idFamiglia)
  } else {
    expandedRows.value.splice(idx, 1)
  }
}

function openBancariDialog(row) {
  editingRow.value = row
  bancariDialog.value = true
}

async function saveBancari({ iban, intestatario }) {
  if (!editingRow.value) return
  savingBancari.value = true
  try {
    await store.updateBancari(editingRow.value.idFamiglia, { iban, intestatario })
    notifySuccess($q, 'Dati bancari aggiornati')
    bancariDialog.value = false
  } catch (error) {
    notifyError($q, error, "Errore nell'aggiornamento")
  } finally {
    savingBancari.value = false
  }
}

function openChiudiProgetto(row) {
  chiudiProgettoRow.value = row
  chiudiProgettoNota.value = ''
  chiudiProgettoDialog.value = true
}

async function handleChiudiProgetto() {
  savingChiudiProgetto.value = true
  try {
    const { usePagamentiStore } = await import('stores/pagamenti.store')
    const pagStore = usePagamentiStore()
    await pagStore.chiudiProgetto(chiudiProgettoRow.value.idProgetto, {
      automatica: false,
      motivo: chiudiProgettoNota.value || null
    })
    notifySuccess($q, 'Progetto chiuso')
    chiudiProgettoDialog.value = false
    await loadData()
  } catch (error) {
    notifyError($q, error, 'Errore chiusura progetto')
  } finally {
    savingChiudiProgetto.value = false
  }
}

const savingRiapriProgetto = ref(false)

async function handleRiapriProgetto(row) {
  savingRiapriProgetto.value = true
  try {
    const { usePagamentiStore } = await import('stores/pagamenti.store')
    const pagStore = usePagamentiStore()
    await pagStore.riapriProgetto(row.idProgetto)
    if (pagStore.error) throw new Error(pagStore.error)
    notifySuccess($q, 'Progetto riaperto')
    await loadData()
  } catch (error) {
    notifyError($q, error, 'Errore riapertura progetto')
  } finally {
    savingRiapriProgetto.value = false
  }
}

const savingAvanzaStato = ref(false)

async function handleAvanzaStato(row) {
  savingAvanzaStato.value = true
  try {
    const { usePagamentiStore } = await import('stores/pagamenti.store')
    const pagStore = usePagamentiStore()
    await pagStore.avanzaStatoProgetto(row.idProgetto)
    notifySuccess($q, 'Stato progetto avanzato')
    await loadData()
  } catch (error) {
    notifyError($q, error, 'Errore avanzamento stato progetto')
  } finally {
    savingAvanzaStato.value = false
  }
}

async function handleRevert(progettoId, item) {
  $q.dialog({
    title: 'Ripristina giustificativo',
    message: 'Ripristinare il giustificativo allo stato "inviato"?',
    cancel: { label: 'Annulla', flat: true },
    ok: { label: 'Ripristina', color: 'primary' },
    persistent: true
  }).onOk(async () => {
    verifyingId.value = item.id
    try {
      await store.updateGiustificativoField(progettoId, item.id, 'Stato', 'inviato')
      notifySuccess($q, 'Giustificativo ripristinato')
    } catch (error) {
      notifyError($q, error, 'Errore nel ripristino')
    } finally {
      verifyingId.value = null
    }
  })
}

async function handleVerify(progettoId, item) {
  verifyingId.value = item.id
  try {
    await store.verifyGiustificativo(progettoId, item.id)
    notifySuccess($q, 'Giustificativo verificato')
  } catch (error) {
    notifyError($q, error, 'Errore nella verifica')
  } finally {
    verifyingId.value = null
  }
}

async function handleSendDraft(progettoId, item) {
  verifyingId.value = item.id
  try {
    await store.updateGiustificativoField(progettoId, item.id, 'Stato', 'inviato')
    notifySuccess($q, 'Giustificativo inviato')
  } catch (error) {
    notifyError($q, error, "Errore nell'invio")
  } finally {
    verifyingId.value = null
  }
}

function handleReject(progettoId, item) {
  rejectProgettoId.value = progettoId
  rejectItem.value = item
  rejectDialog.value = true
}

async function handleFieldSave(progettoId, item, field, value) {
  savingField.value = `${item.id}-${field}`
  try {
    await store.updateGiustificativoField(progettoId, item.id, field, value)
    notifySuccess($q, 'Campo aggiornato')
  } catch (error) {
    notifyError($q, error, "Errore nell'aggiornamento")
  } finally {
    savingField.value = null
  }
}

async function handleAddSave(formData) {
  const row = addingForRow.value
  if (!row) return
  try {
    await store.addGiustificativo(formData, formData.File)
    notifySuccess($q, 'Giustificativo creato')
    addingForRow.value = null
  } catch (error) {
    notifyError($q, error, 'Errore nella creazione')
  }
}

async function confirmReject(nota) {
  if (!nota || !rejectItem.value) return
  rejectingId.value = rejectItem.value.id
  try {
    await store.rejectGiustificativo(rejectProgettoId.value, rejectItem.value.id, nota)
    $q.notify({ type: 'warning', message: 'Giustificativo rifiutato' })
    rejectDialog.value = false
  } catch (error) {
    notifyError($q, error, 'Errore nel rifiuto')
  } finally {
    rejectingId.value = null
  }
}

function openRowDetail(row) {
  selectedProgetto.value = row.idProgetto
  detailDialog.value = true
}
</script>
