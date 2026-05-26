<template>
  <q-page class="q-pa-md verifica-page">
    <div class="page-inner">
      <div class="row items-center q-gutter-sm q-mb-md">
        <div>
          <div class="text-h5 text-weight-medium">Verifica rendicontazione</div>
          <div class="text-body2 text-grey-7">
            Controllo delle tranche, importi rimborsabili e dati per invio ASPI.
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
            label="Cerca famiglia o beneficiario"
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
        <template #body-cell-famiglia="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.famiglia || 'Famiglia senza nome' }}</div>
            <div class="text-caption text-grey-7">ID {{ props.row.idFamiglia || '-' }}</div>
          </q-td>
        </template>

        <template #body-cell-beneficiario="props">
          <q-td :props="props">
            <div>{{ props.row.beneficiario || '-' }}</div>
            <div class="text-caption text-grey-7">
              {{ props.row.ambito || props.row.titolo || 'Progetto' }}
            </div>
          </q-td>
        </template>

        <template #body-cell-datiBancari="props">
          <q-td :props="props">
            <q-badge
              :color="props.row.iban && props.row.intestatario ? 'positive' : 'warning'"
              outline
            >
              {{ props.row.iban && props.row.intestatario ? 'Completi' : 'Da completare' }}
            </q-badge>
            <div class="text-caption ellipsis">{{ props.row.iban || 'IBAN mancante' }}</div>
          </q-td>
        </template>

        <template #body-cell-selectedTranche="props">
          <q-td :props="props">
            <div class="text-weight-medium">
              {{ formatCurrency(props.row.tranche[selectedTranche].rendicontato) }}
            </div>
            <div class="text-caption text-grey-7">
              {{ props.row.tranche[selectedTranche].count }} giustificativi
            </div>
          </q-td>
        </template>

        <template #body-cell-rimborsabile="props">
          <q-td :props="props">
            <div class="text-positive text-weight-medium">
              {{ formatCurrency(props.row.tranche[selectedTranche].rimborsabile) }}
            </div>
          </q-td>
        </template>

        <template #body-cell-totali="props">
          <q-td :props="props">
            <div>{{ formatCurrency(props.row.totaleRendicontato) }}</div>
            <div class="text-caption text-grey-7">
              tot. rimb. {{ formatCurrency(props.row.totaleRimborsabile) }}
            </div>
          </q-td>
        </template>

        <template #body-cell-stato="props">
          <q-td :props="props">
            <q-badge :color="statoRiga(props.row).color">
              {{ statoRiga(props.row).label }}
            </q-badge>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              flat
              round
              dense
              icon="content_copy"
              @click="copyAspiLine(props.row)"
            >
              <q-tooltip>Copia riga ASPI</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { copyToClipboard, useQuasar } from 'quasar'
import { TRANCHE, useVerificaStore } from 'stores/verifica.store'
import { formatCurrency } from 'src/utils/formatters'

const $q = useQuasar()
const store = useVerificaStore()

const selectedTranche = ref('luglio')
const selectedAnno = ref(null)
const rendicontazioneFilter = ref('con_importi')
const search = ref('')
const pagination = ref({ rowsPerPage: 25, sortBy: 'idFamiglia', descending: false })

const trancheOptions = TRANCHE.map(tranche => ({
  label: tranche.label,
  value: tranche.value
}))

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
  { name: 'famiglia', label: 'Famiglia', field: 'famiglia', align: 'left', sortable: true },
  { name: 'beneficiario', label: 'Beneficiario', field: 'beneficiario', align: 'left', sortable: true },
  { name: 'annoBando', label: 'Bando', field: 'annoBando', align: 'left', sortable: true },
  { name: 'datiBancari', label: 'Dati bancari', field: 'iban', align: 'left' },
  {
    name: 'selectedTranche',
    label: `Rendicontato ${trancheLabel.value}`,
    field: row => row.tranche[selectedTranche.value].rendicontato,
    align: 'right',
    sortable: true
  },
  {
    name: 'rimborsabile',
    label: 'Rimborsabile',
    field: row => row.tranche[selectedTranche.value].rimborsabile,
    align: 'right',
    sortable: true
  },
  { name: 'totali', label: 'Totali', field: 'totaleRendicontato', align: 'right', sortable: true },
  { name: 'stato', label: 'Stato', field: 'id', align: 'left' },
  { name: 'actions', label: '', field: 'id', align: 'right' }
])

const trancheLabel = computed(() => {
  return TRANCHE.find(tranche => tranche.value === selectedTranche.value)?.label || ''
})

const filteredRows = computed(() => {
  return store.rows.filter(row => {
    if (selectedAnno.value && row.annoBando !== selectedAnno.value) return false
    const tranche = row.tranche[selectedTranche.value]
    if (rendicontazioneFilter.value === 'con_importi') return tranche.rendicontato > 0
    if (rendicontazioneFilter.value === 'mancanti') return tranche.rendicontato === 0
    return true
  })
})

const selectedTotals = computed(() => {
  return filteredRows.value.reduce((totals, row) => {
    const tranche = row.tranche[selectedTranche.value]
    totals.rendicontato += tranche.rendicontato
    totals.rimborsabile += tranche.rimborsabile
    return totals
  }, { rendicontato: 0, rimborsabile: 0 })
})

const aspiRows = computed(() => {
  return filteredRows.value.filter(row => {
    const tranche = row.tranche[selectedTranche.value]
    return tranche.rimborsabile > 0 && row.iban && row.intestatario
  })
})

onMounted(() => {
  store.fetchAll()
})

function statoRiga(row) {
  const tranche = row.tranche[selectedTranche.value]
  if (tranche.rendicontato === 0) {
    return { label: 'Non ricevuta', color: 'grey' }
  }
  if (!row.iban || !row.intestatario) {
    return { label: 'Dati bancari mancanti', color: 'warning' }
  }
  return { label: 'Pronta ASPI', color: 'positive' }
}

function escapeCsv(value) {
  const normalized = value == null ? '' : String(value)
  return `"${normalized.replace(/"/g, '""')}"`
}

function aspiLine(row) {
  const tranche = row.tranche[selectedTranche.value]
  return [
    row.idFamiglia,
    row.famiglia,
    row.beneficiario,
    row.intestatario,
    row.iban,
    tranche.rimborsabile.toFixed(2).replace('.', ',')
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
  $q.notify({ type: 'positive', message: 'Riga copiata' })
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

@media (max-width: 720px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
