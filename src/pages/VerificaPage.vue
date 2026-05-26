<template>
  <q-page class="q-pa-md verifica-page">
    <div class="page-inner">
      <div class="row items-center q-gutter-sm q-mb-md">
        <div>
          <div class="text-h5 text-weight-medium">Verifica rendicontazione</div>
          <div class="text-body2 text-grey-7">
            Controllo delle tranche, importi rimborsabili e verifica giustificativi.
          </div>
        </div>
        <q-space />
        <q-btn
          flat
          round
          icon="refresh"
          :loading="store.loading"
          @click="store.fetchAll"
        >
          <q-tooltip>Aggiorna dati</q-tooltip>
        </q-btn>
        <q-btn
          color="primary"
          icon="download"
          label="Export ASPI"
          :disable="aspiRows.length === 0"
          @click="exportAspi"
        />
      </div>

      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-sm-6 col-md-3">
          <q-select
            v-model="selectedTranche"
            :options="trancheOptions"
            emit-value
            map-options
            outlined
            dense
            label="Tranche"
          />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <q-select
            v-model="selectedAnno"
            :options="annoOptions"
            emit-value
            map-options
            outlined
            dense
            clearable
            label="Anno bando"
          />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <q-select
            v-model="rendicontazioneFilter"
            :options="rendicontazioneOptions"
            emit-value
            map-options
            outlined
            dense
            label="Rendicontazione"
          />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <q-input
            v-model="search"
            outlined
            dense
            debounce="250"
            label="Cerca famiglia"
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
      </div>

      <div class="summary-grid q-mb-md">
        <div class="summary-cell">
          <div class="text-caption text-grey-7">Famiglie/progetti</div>
          <div class="text-h6">{{ filteredRows.length }}</div>
        </div>
        <div class="summary-cell">
          <div class="text-caption text-grey-7">Rendicontato tranche</div>
          <div class="text-h6 text-primary">{{ formatCurrency(selectedTotals.rendicontato) }}</div>
        </div>
        <div class="summary-cell">
          <div class="text-caption text-grey-7">Rimborsabile 80%</div>
          <div class="text-h6 text-positive">{{ formatCurrency(selectedTotals.rimborsabile) }}</div>
        </div>
        <div class="summary-cell">
          <div class="text-caption text-grey-7">Pronte per ASPI</div>
          <div class="text-h6">{{ aspiRows.length }}</div>
        </div>
      </div>

      <q-banner v-if="store.error" class="bg-red-1 text-negative q-mb-md" rounded>
        {{ store.error }}
      </q-banner>

      <q-table
        flat
        bordered
        class="verifica-table"
        row-key="idProgetto"
        :rows="filteredRows"
        :columns="columns"
        :loading="store.loading"
        :filter="search"
        :pagination="pagination"
        binary-state-sort
      >
        <template v-slot:header="props">
          <q-tr :props="props">
            <q-th auto-width />
            <q-th v-for="col in props.cols" :key="col.name" :props="props">
              {{ col.label }}
            </q-th>
          </q-tr>
        </template>

        <template v-slot:body="props">
          <q-tr :props="props">
            <q-td auto-width>
              <q-btn
                flat
                round
                dense
                :icon="props.expand ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
                @click="props.expand = !props.expand"
              >
                <q-tooltip>{{ props.expand ? 'Chiudi' : 'Apri giustificativi' }}</q-tooltip>
              </q-btn>
            </q-td>
            <q-td v-for="col in props.cols" :key="col.name" :props="props">
              <template v-if="col.name === 'famiglia'">
                <div class="text-weight-medium">{{ props.row.famiglia || 'Famiglia senza nome' }}</div>
                <div class="text-caption text-grey-7">{{ props.row.beneficiario || '' }} — ID {{ props.row.idFamiglia || '-' }}</div>
              </template>

              <template v-else-if="col.name === 'datiBancari'">
                <div class="row items-center q-gutter-xs">
                  <div class="col">
                    <q-badge
                      :color="props.row.iban && props.row.intestatario ? 'positive' : 'warning'"
                      outline
                    >
                      {{ props.row.iban && props.row.intestatario ? 'Completi' : 'Da completare' }}
                    </q-badge>
                    <div class="text-caption ellipsis">{{ props.row.iban || 'IBAN mancante' }}</div>
                  </div>
                  <q-btn
                    flat
                    round
                    dense
                    size="sm"
                    icon="edit"
                    @click="openBancariDialog(props.row)"
                  >
                    <q-tooltip>Modifica dati bancari</q-tooltip>
                  </q-btn>
                </div>
              </template>

              <template v-else-if="col.name === 'allocato'">
                <div class="text-weight-medium">{{ formatCurrency(props.row.allocato) }}</div>
              </template>

              <template v-else-if="col.name === 'selectedTranche'">
                <template v-if="selectedTranche">
                  <div class="text-weight-medium">
                    {{ formatCurrency(props.row.tranche[selectedTranche].rendicontato) }}
                  </div>
                  <div class="text-caption text-grey-7">
                    {{ props.row.tranche[selectedTranche].count }} giustificativi
                  </div>
                </template>
                <template v-else>
                  <div class="text-weight-medium">
                    {{ formatCurrency(props.row.totaleRendicontato) }}
                  </div>
                  <div class="text-caption text-grey-7">
                    {{ totalGiustificativi(props.row) }} giustificativi
                  </div>
                </template>
              </template>

              <template v-else-if="col.name === 'rimborsabile'">
                <div class="text-positive text-weight-medium">
                  {{ formatCurrency(props.row.totaleRimborsabile) }}
                </div>
              </template>

              <template v-else-if="col.name === 'stato'">
                <q-badge :color="statoRiga(props.row).color">
                  {{ statoRiga(props.row).label }}
                </q-badge>
              </template>

              <template v-else-if="col.name === 'actions'">
                <q-btn
                  flat
                  round
                  dense
                  icon="content_copy"
                  @click="copyAspiLine(props.row)"
                >
                  <q-tooltip>Copia riga ASPI</q-tooltip>
                </q-btn>
              </template>

              <template v-else>
                {{ col.value }}
              </template>
            </q-td>
          </q-tr>
          <q-tr v-show="props.expand" :props="props">
            <q-td colspan="100%" class="q-pa-none">
              <div class="expandable-content">
                <div class="text-subtitle2 q-px-md q-pt-md q-pb-xs text-grey-8">
                  Giustificativi — {{ props.row.annoBando || 'N/A' }}
                </div>

                <q-list v-if="props.row.giustificativi.length > 0" dense separator class="giust-sub-list">
                  <q-item
                    v-for="g in props.row.giustificativi"
                    :key="g.id"
                    class="giust-item"
                  >
                    <q-item-section class="col-3">
                      <div class="text-body2 text-weight-medium ellipsis">{{ g.Descrizione || '—' }}</div>
                      <div v-if="g.NotaVolontario" class="text-caption text-grey-6 q-mt-xs ellipsis-2">
                        {{ g.NotaVolontario }}
                      </div>
                    </q-item-section>

                    <q-item-section class="col-2">
                      <div class="text-body2">{{ formatCurrency(g.Importo) }}</div>
                    </q-item-section>

                    <q-item-section class="col-2">
                      <div class="text-body2">{{ formatDate(g.Data) || '—' }}</div>
                    </q-item-section>

                    <q-item-section class="col-2">
                      <div v-if="g.Allegato" class="row q-gutter-x-xs">
                        <a
                          :href="assetUrl(g.Allegato)"
                          target="_blank"
                          class="text-body2"
                        >Apri</a>
                        <span class="text-grey-5">|</span>
                        <a
                          :href="assetUrl(g.Allegato, true)"
                          class="text-body2"
                        >Scarica</a>
                      </div>
                      <div v-else class="text-grey-5 text-body2">
                        —
                      </div>
                    </q-item-section>

                    <q-item-section class="col-1">
                      <q-badge :color="statoColor(g.Stato)" outline>
                        {{ statoLabel(g.Stato) }}
                      </q-badge>
                    </q-item-section>

                    <q-item-section class="col-2">
                      <div v-if="g.Stato === 'Inviato'" class="row q-gutter-xs">
                        <q-btn
                          dense
                          flat
                          icon="check_circle"
                          color="primary"
                          size="sm"
                          :loading="verifyingId === g.id"
                          @click="handleVerify(props.row.idProgetto, g)"
                        >
                          <q-tooltip>Verifica</q-tooltip>
                        </q-btn>
                        <q-btn
                          dense
                          flat
                          icon="cancel"
                          color="negative"
                          size="sm"
                          @click="handleReject(props.row.idProgetto, g)"
                        >
                          <q-tooltip>Rifiuta</q-tooltip>
                        </q-btn>
                      </div>
                      <div v-else-if="g.Stato === 'Verificato'" class="text-positive row items-center q-gutter-xs">
                        <q-icon name="check_circle" size="sm" />
                        <span class="text-body2">Verificato</span>
                      </div>
                      <div v-else-if="g.Stato === 'Rifiutato'">
                        <div class="text-negative row items-center q-gutter-xs">
                          <q-icon name="cancel" size="sm" />
                          <span class="text-body2">Rifiutato</span>
                        </div>
                        <div v-if="g.NotaRifiuto" class="text-caption text-grey-7 q-mt-xs" style="max-width: 200px; white-space: normal;">
                          {{ g.NotaRifiuto }}
                        </div>
                      </div>
                    </q-item-section>
                  </q-item>
                </q-list>

                <div v-else class="q-pa-md text-grey-5 text-center">
                  Nessun giustificativo per questo progetto.
                </div>
              </div>
            </q-td>
          </q-tr>
        </template>
      </q-table>

      <q-dialog v-model="bancariDialog" persistent>
        <q-card style="min-width: 400px">
          <q-card-section>
            <div class="text-h6">Modifica dati bancari</div>
            <div class="text-caption text-grey-7">
              {{ editingRow?.famiglia }} — {{ editingRow?.beneficiario }}
            </div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <q-input
              v-model="editIban"
              outlined
              dense
              label="IBAN"
              class="q-mb-md"
              :rules="[val => !val || /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/i.test(val) || 'IBAN non valido']"
            />
            <q-input
              v-model="editIntestatario"
              outlined
              dense
              label="Intestatario conto corrente"
            />
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Annulla" color="negative" v-close-popup />
            <q-btn
              flat
              label="Salva"
              color="primary"
              :loading="savingBancari"
              @click="saveBancari"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-dialog v-model="rejectDialog" persistent>
        <q-card style="min-width: 400px">
          <q-card-section>
            <div class="text-h6">Rifiuta giustificativo</div>
            <div class="text-caption text-grey-7">
              {{ rejectItem?.Descrizione || '' }}
            </div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <q-input
              v-model="rejectNota"
              outlined
              dense
              autofocus
              label="Motivazione del rifiuto *"
              type="textarea"
              :rules="[val => !!val || 'Inserisci una motivazione']"
            />
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Annulla" color="negative" v-close-popup />
            <q-btn
              flat
              label="Rifiuta"
              color="negative"
              :disable="!rejectNota"
              :loading="rejectingId === rejectItem?.id"
              @click="confirmReject"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { copyToClipboard, useQuasar } from 'quasar'
import { TRANCHE, useVerificaStore } from 'stores/verifica.store'
import { verificaService } from 'src/services/verifica.service'
import { formatCurrency, formatDate, statoLabel, statoColor } from 'src/utils/formatters'
import { API_URL, STORAGE_KEYS } from 'src/utils/constants'

const $q = useQuasar()
const store = useVerificaStore()

const selectedTranche = ref(null)
const selectedAnno = ref(null)
const rendicontazioneFilter = ref('tutte')
const search = ref('')
const pagination = ref({ rowsPerPage: 25, sortBy: 'idFamiglia', descending: false })
const verifyingId = ref(null)
const rejectingId = ref(null)

const bancariDialog = ref(false)
const editingRow = ref(null)
const editIban = ref('')
const editIntestatario = ref('')
const savingBancari = ref(false)

const rejectDialog = ref(false)
const rejectNota = ref('')
const rejectItem = ref(null)
const rejectProgettoId = ref(null)

const trancheOptions = computed(() => {
  const active = TRANCHE
    .filter(t => store.rows.some(row => row.tranche[t.value].count > 0))
    .map(t => ({ label: t.label, value: t.value }))
  return [{ label: 'Tutte', value: null }, ...active]
})

const annoOptions = computed(() => store.anniBando.map(anno => ({
  label: String(anno),
  value: anno
})))

const rendicontazioneOptions = [
  { label: 'Solo con importi', value: 'con_importi' },
  { label: 'Tutte', value: 'tutte' },
  { label: 'Solo mancanti', value: 'mancanti' }
]

const columns = computed(() => [
  { name: 'annoBando', label: 'Bando', field: 'annoBando', align: 'left', sortable: true },
  { name: 'famiglia', label: 'Famiglia', field: 'famiglia', align: 'left', sortable: true },
  { name: 'datiBancari', label: 'Dati bancari', field: 'iban', align: 'left' },
  {
    name: 'allocato',
    label: 'Allocato',
    field: 'allocato',
    align: 'right',
    sortable: true
  },
  {
    name: 'selectedTranche',
    label: `Rendicontato ${trancheLabel.value}`,
    field: row => selectedTranche.value
      ? row.tranche[selectedTranche.value].rendicontato
      : row.totaleRendicontato,
    align: 'right',
    sortable: true
  },
  {
    name: 'rimborsabile',
    label: 'Rimborsabile',
    field: 'totaleRimborsabile',
    align: 'right',
    sortable: true
  },
  { name: 'stato', label: 'Stato', field: 'id', align: 'left' },
  { name: 'actions', label: '', field: 'id', align: 'right' }
])

const trancheLabel = computed(() => {
  if (!selectedTranche.value) return '(tutte)'
  return TRANCHE.find(t => t.value === selectedTranche.value)?.label || ''
})

const filteredRows = computed(() => {
  return store.rows.filter(row => {
    if (selectedAnno.value && row.annoBando !== selectedAnno.value) return false

    if (selectedTranche.value && row.tranche[selectedTranche.value].count === 0) return false

    const rendicontato = selectedTranche.value
      ? row.tranche[selectedTranche.value].rendicontato
      : row.totaleRendicontato

    if (rendicontazioneFilter.value === 'con_importi' && rendicontato === 0) return false
    if (rendicontazioneFilter.value === 'mancanti' && rendicontato > 0) return false

    return true
  })
})

const selectedTotals = computed(() => {
  return filteredRows.value.reduce((totals, row) => {
    if (selectedTranche.value) {
      totals.rendicontato += row.tranche[selectedTranche.value].rendicontato
    } else {
      totals.rendicontato += row.totaleRendicontato
    }
    totals.rimborsabile += row.totaleRimborsabile
    return totals
  }, { rendicontato: 0, rimborsabile: 0 })
})

const aspiRows = computed(() => {
  return filteredRows.value.filter(row => {
    if (row.totaleRimborsabile <= 0 || !row.iban || !row.intestatario) return false
    if (selectedTranche.value && hasPendingGiustificativi(row, selectedTranche.value)) return false
    return true
  })
})

onMounted(() => {
  store.fetchAll()
})

function hasPendingGiustificativi(row, trancheValue) {
  return row.giustificativi.some(g => {
    if (g.Stato !== 'Inviato') return false
    const rend = g.Rendicontazione
    const relTranche = rend && typeof rend === 'object' ? String(rend.Tranche || '').toLowerCase() : ''
    if (relTranche === trancheValue) return true
    const directTranche = (g.Tranche || '').toLowerCase()
    if (directTranche === trancheValue) return true
    const month = g.Data ? new Date(g.Data).getMonth() + 1 : null
    const monthMap = { 7: 'luglio', 9: 'settembre', 11: 'novembre', 2: 'febbraio' }
    return month && monthMap[month] === trancheValue
  })
}

function totalGiustificativi(row) {
  return TRANCHE.reduce((sum, t) => sum + row.tranche[t.value].count, 0)
}

function statoRiga(row) {
  const tranche = selectedTranche.value ? row.tranche[selectedTranche.value] : null
  const rendicontato = tranche ? tranche.rendicontato : row.totaleRendicontato
  if (rendicontato === 0) {
    return { label: 'Non ricevuta', color: 'grey' }
  }
  if (!row.iban || !row.intestatario) {
    return { label: 'Dati bancari mancanti', color: 'warning' }
  }
  if (selectedTranche.value && hasPendingGiustificativi(row, selectedTranche.value)) {
    return { label: 'Da verificare', color: 'orange' }
  }
  return { label: 'Pronta ASPI', color: 'positive' }
}

function openBancariDialog(row) {
  editingRow.value = row
  editIban.value = row.iban || ''
  editIntestatario.value = row.intestatario || ''
  bancariDialog.value = true
}

async function saveBancari() {
  if (!editingRow.value) return
  savingBancari.value = true
  try {
    const data = {}
    if (editIban.value !== (editingRow.value.iban || '')) data.IBAN = editIban.value
    if (editIntestatario.value !== (editingRow.value.intestatario || '')) data.Intestatario_CC = editIntestatario.value
    if (Object.keys(data).length === 0) {
      bancariDialog.value = false
      return
    }
    await verificaService.updateFamiglia(editingRow.value.idFamiglia, data)
    store.rows.forEach(r => {
      if (r.idFamiglia === editingRow.value.idFamiglia) {
        r.iban = editIban.value
        r.intestatario = editIntestatario.value
      }
    })
    $q.notify({ type: 'positive', message: 'Dati bancari aggiornati' })
    bancariDialog.value = false
  } catch {
    $q.notify({ type: 'negative', message: 'Errore nell\'aggiornamento' })
  } finally {
    savingBancari.value = false
  }
}

function assetUrl(fileId, download = false) {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  const params = download
    ? `?download=1&access_token=${token}`
    : `?access_token=${token}`
  return `${API_URL}/assets/${fileId}${params}`
}

async function handleVerify(progettoId, item) {
  verifyingId.value = item.id
  try {
    await store.verifyGiustificativo(progettoId, item.id)
    $q.notify({ type: 'positive', message: 'Giustificativo verificato' })
  } catch {
    $q.notify({ type: 'negative', message: 'Errore nella verifica' })
  } finally {
    verifyingId.value = null
  }
}

function handleReject(progettoId, item) {
  rejectProgettoId.value = progettoId
  rejectItem.value = item
  rejectNota.value = ''
  rejectDialog.value = true
}

async function confirmReject() {
  if (!rejectNota.value || !rejectItem.value) return
  rejectingId.value = rejectItem.value.id
  try {
    await store.rejectGiustificativo(rejectProgettoId.value, rejectItem.value.id, rejectNota.value)
    $q.notify({ type: 'warning', message: 'Giustificativo rifiutato' })
    rejectDialog.value = false
  } catch {
    $q.notify({ type: 'negative', message: 'Errore nel rifiuto' })
  } finally {
    rejectingId.value = null
  }
}

function escapeCsv(value) {
  const normalized = value == null ? '' : String(value)
  return `"${normalized.replace(/"/g, '""')}"`
}

function aspiLine(row) {
  return [
    row.idFamiglia,
    row.famiglia,
    row.beneficiario,
    row.intestatario,
    row.iban,
    row.totaleRimborsabile.toFixed(2).replace('.', ',')
  ]
}

function exportAspi() {
  const header = ['ID famiglia', 'Famiglia', 'Beneficiario', 'Intestatario', 'IBAN', 'Importo']
  const csv = [
    header.map(escapeCsv).join(';'),
    ...aspiRows.value.map(row => aspiLine(row).map(escapeCsv).join(';'))
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `aspi-${selectedTranche.value}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

async function copyAspiLine(row) {
  await copyToClipboard(aspiLine(row).join('\t'))
  $q.notify({ type: 'positive', message: 'Riga ASPI copiata' })
}
</script>

<style scoped>
.page-inner {
  max-width: 1280px;
  margin: 0 auto;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-cell {
  min-height: 76px;
  padding: 12px 14px;
  border: 1px solid #dedede;
  border-radius: 6px;
  background: #ffffff;
}

.verifica-table {
  background: #ffffff;
}

.expandable-content {
  background: #f8f9fa;
  border-top: 1px solid #dedede;
}

.giust-sub-list .giust-item {
  border-bottom: 1px solid #eee;
}

.giust-sub-list .giust-item:last-child {
  border-bottom: none;
}

@media (max-width: 720px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
