<template>
  <div>
    <div class="row items-center q-gutter-sm q-mb-md">
      <q-btn-toggle
        v-model="subTab"
        :options="[
          { label: 'Bonifici da fare', value: 'proposti' },
          { label: 'Da riscontrare', value: 'incorso' },
          { label: 'Falliti', value: 'falliti' }
        ]"
        dense
        outline
        color="primary"
      />
      <q-space />

      <!-- Indicatori capienza -->
      <template v-if="subTab === 'proposti'">
        <div v-for="a in store.associazioni" :key="a.Nome" class="text-caption q-mr-md">
          <strong>{{ a.Nome }}</strong>: €{{ formatNumber(residuo(a.Nome)) }} disponibili
        </div>
      </template>
    </div>

    <!-- Sotto-vista: Proposti -->
    <template v-if="subTab === 'proposti'">
      <q-table
        :rows="store.proposti"
        :columns="propostiColumns"
        row-key="id"
        flat bordered
        selection="multiple"
        v-model:selected="selected"
        :loading="store.loading"
        :grid="$q.screen.lt.sm"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
      >
        <template #body-cell-importo="props">
          <q-td :props="props">€{{ formatNumber(props.row.Importo) }}</q-td>
        </template>
        <template #body-cell-famiglia="props">
          <q-td :props="props">{{ props.row.Famiglia?.Nome_Famiglia || '—' }}</q-td>
        </template>
        <template #item="props">
          <div class="q-pa-xs col-12">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-weight-medium">{{ props.row.Famiglia?.Nome_Famiglia || '—' }}</div>
                <div class="text-caption">€{{ formatNumber(props.row.Importo) }}</div>
              </q-card-section>
            </q-card>
          </div>
        </template>
      </q-table>

      <div class="row items-center q-gutter-sm q-mt-md">
        <q-select
          v-model="batchAssociazione"
          :options="assocOptions"
          label="Associazione"
          dense outlined
          class="col-auto"
          style="min-width: 200px"
          emit-value map-options
        />
        <q-btn
          color="primary"
          icon="playlist_add"
          label="Crea gruppo di pagamento"
          :disable="selected.length === 0 || !batchAssociazione"
          @click="openCreaBatch"
        />
      </div>
    </template>

    <!-- Sotto-vista: In corso / Da riscontrare -->
    <template v-if="subTab === 'incorso'">
      <div class="row items-center q-gutter-sm q-mb-md">
        <q-select
          v-model="batchFilter"
          :options="batchOptions"
          label="Filtra per gruppo"
          dense outlined
          clearable
          class="col-auto"
          style="min-width: 250px"
          emit-value map-options
        />
        <q-btn flat icon="download" label="Esporta CSV" :disable="!batchFilter" @click="exportCsv" />
      </div>

      <q-table
        :rows="filteredInCorso"
        :columns="incorsoColumns"
        row-key="id"
        flat bordered
        :loading="store.loading"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        :grid="$q.screen.lt.sm"
      >
        <template #body-cell-importo="props">
          <q-td :props="props">€{{ formatNumber(props.row.Importo) }}</q-td>
        </template>
        <template #body-cell-azioni="props">
          <q-td :props="props">
            <div class="row q-gutter-xs no-wrap">
              <q-btn v-if="props.row.Stato === 'in_pagamento'" flat dense icon="check_circle" color="positive" size="sm" aria-label="Segna pagato" @click="handlePagato(props.row)">
                <q-tooltip>Pagato</q-tooltip>
              </q-btn>
              <q-btn v-if="props.row.Stato === 'in_pagamento'" flat dense icon="cancel" color="negative" size="sm" aria-label="Segna fallito" @click="handleFallito(props.row)">
                <q-tooltip>Fallito</q-tooltip>
              </q-btn>
              <q-btn v-if="props.row.Stato === 'in_pagamento'" flat dense icon="block" color="grey" size="sm" aria-label="Annulla" @click="handleAnnullato(props.row)">
                <q-tooltip>Annullato</q-tooltip>
              </q-btn>
              <q-badge v-if="props.row.Stato === 'pagato'" color="positive">Pagato</q-badge>
            </div>
          </q-td>
        </template>
        <template #item="props">
          <div class="q-pa-xs col-12">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-weight-medium">{{ props.row.Famiglia?.Nome_Famiglia || '—' }}</div>
                <div class="text-caption">€{{ formatNumber(props.row.Importo) }}</div>
                <q-badge v-if="props.row.Stato === 'pagato'" color="positive">Pagato</q-badge>
                <div v-else class="row q-gutter-xs q-mt-sm">
                  <q-btn flat dense icon="check_circle" color="positive" size="sm" @click="handlePagato(props.row)"><q-tooltip>Pagato</q-tooltip></q-btn>
                  <q-btn flat dense icon="cancel" color="negative" size="sm" @click="handleFallito(props.row)"><q-tooltip>Fallito</q-tooltip></q-btn>
                  <q-btn flat dense icon="block" color="grey" size="sm" @click="handleAnnullato(props.row)"><q-tooltip>Annullato</q-tooltip></q-btn>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </template>
      </q-table>
    </template>

    <!-- Sotto-vista: Falliti -->
    <template v-if="subTab === 'falliti'">
      <q-table
        :rows="store.falliti"
        :columns="fallitiColumns"
        row-key="id"
        flat bordered
        selection="multiple"
        v-model:selected="selectedFalliti"
        :loading="store.loading"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        :grid="$q.screen.lt.sm"
      >
        <template #body-cell-iban="props">
          <q-td :props="props">
            <q-input :model-value="props.row.IBAN" dense outlined @update:model-value="val => editFallito(props.row, 'IBAN', val)" />
          </q-td>
        </template>
        <template #body-cell-intestatario="props">
          <q-td :props="props">
            <q-input :model-value="props.row.Intestatario" dense outlined @update:model-value="val => editFallito(props.row, 'Intestatario', val)" />
          </q-td>
        </template>
        <template #body-cell-importo="props">
          <q-td :props="props">€{{ formatNumber(props.row.Importo) }}</q-td>
        </template>
        <template #item="props">
          <div class="q-pa-xs col-12">
            <q-card flat bordered>
              <q-card-section>
                <q-input :model-value="props.row.IBAN" label="IBAN" dense outlined @update:model-value="val => editFallito(props.row, 'IBAN', val)" class="q-mb-sm" />
                <q-input :model-value="props.row.Intestatario" label="Intestatario" dense outlined @update:model-value="val => editFallito(props.row, 'Intestatario', val)" />
              </q-card-section>
            </q-card>
          </div>
        </template>
      </q-table>

      <div v-if="selectedFalliti.length > 0" class="row items-center q-gutter-sm q-mt-md">
        <span class="text-caption">{{ selectedFalliti.length }} selezionati</span>
        <q-select v-model="batchAssociazioneFalliti" :options="assocOptions" label="Associazione" dense outlined class="col-auto" style="min-width: 200px" emit-value map-options />
        <q-btn color="primary" icon="playlist_add" label="Includi in nuovo batch" :disable="!batchAssociazioneFalliti" @click="creaBatchDaFalliti" />
      </div>
    </template>

    <!-- Dialog Crea Batch -->
    <q-dialog v-model="showBatchDialog" persistent>
      <q-card style="width: 100%; max-width: 450px">
        <q-card-section class="row items-center">
          <div class="text-h6">Crea gruppo di pagamento</div>
          <q-space /><q-btn v-close-popup flat round dense icon="close" />
        </q-card-section>
        <q-card-section>
          <q-input v-model="batchNome" label="Nome gruppo *" outlined dense autofocus />
          <div class="text-caption q-mt-sm">
            {{ selected.length }} pagamenti selezionati, totale €{{ formatNumber(selectedTotal) }}
          </div>
          <div class="text-caption text-grey-7">
            Associazione: {{ batchAssociazioneLabel }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Annulla" />
          <q-btn color="primary" label="Conferma" :disable="!batchNome" :loading="store.loading" @click="creaBatch" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { usePagamentiStore } from 'stores/pagamenti.store'
import { notifyError, notifySuccess } from 'src/utils/notify'

const $q = useQuasar()
const store = usePagamentiStore()

const subTab = ref('proposti')
const selected = ref([])
const selectedFalliti = ref([])
const batchAssociazione = ref(null)
const batchAssociazioneFalliti = ref(null)
const batchFilter = ref(null)
const batchNome = ref('')
const showBatchDialog = ref(false)
const editingFalliti = ref({})

const assocOptions = computed(() =>
  store.associazioni.map(a => ({ label: a.Nome, value: a.Nome }))
)

const batchOptions = computed(() =>
  store.batches.map(b => ({ label: b.Nome, value: b.id }))
)

const batchAssociazioneLabel = computed(() => {
  const a = store.associazioni.find(a => a.Nome === batchAssociazione.value)
  return a?.Nome || ''
})

const selectedTotal = computed(() =>
  selected.value.reduce((s, p) => s + (parseFloat(p.Importo) || 0), 0)
)

const filteredInCorso = computed(() => {
  if (!batchFilter.value) return store.inCorso
  return store.inCorso.filter(p => p.Batch === batchFilter.value)
})

const propostiColumns = [
  { name: 'famiglia', label: 'Famiglia', align: 'left' },
  { name: 'importo', label: 'Importo', align: 'right' },
  { name: 'IBAN', label: 'IBAN', field: 'IBAN', align: 'left' },
  { name: 'Intestatario', label: 'Intestatario', field: 'Intestatario', align: 'left' }
]

const incorsoColumns = [
  { name: 'famiglia', label: 'Famiglia', align: 'left', field: row => row.Famiglia?.Nome_Famiglia || '' },
  { name: 'importo', label: 'Importo', align: 'right' },
  { name: 'IBAN', label: 'IBAN', field: 'IBAN', align: 'left' },
  { name: 'stato', label: 'Stato', field: 'Stato', align: 'center' },
  { name: 'azioni', label: 'Azioni', align: 'center' }
]

const fallitiColumns = [
  { name: 'famiglia', label: 'Famiglia', align: 'left', field: row => row.Famiglia?.Nome_Famiglia || '' },
  { name: 'iban', label: 'IBAN', align: 'left' },
  { name: 'intestatario', label: 'Intestatario', align: 'left' },
  { name: 'importo', label: 'Importo', align: 'right' },
  { name: 'note', label: 'Note', field: 'NoteEsito', align: 'left' }
]

function formatNumber(v) { return (parseFloat(v) || 0).toFixed(2) }

function residuo(nome) { return store.residuoAssociazione(nome) }

function openCreaBatch() {
  if (selected.value.length === 0) return
  batchNome.value = ''
  showBatchDialog.value = true
}

function editFallito(row, field, val) {
  editingFalliti.value[row.id] = { ...(editingFalliti.value[row.id] || {}), [field]: val }
}

async function creaBatch() {
  try {
    await store.creaBatch({
      nome: batchNome.value,
      associazione: batchAssociazione.value,
      pagamentoIds: selected.value.map(p => p.id)
    })
    notifySuccess($q, 'Gruppo di pagamento creato')
    showBatchDialog.value = false
    selected.value = []
  } catch (err) {
    notifyError($q, err, 'Errore creazione gruppo')
  }
}

async function creaBatchDaFalliti() {
  try {
    const ids = selectedFalliti.value.map(p => p.id)
    // Per ogni fallito, salva correzioni prima di includere nel batch
    for (const p of selectedFalliti.value) {
      const edits = editingFalliti.value[p.id]
      if (edits?.IBAN || edits?.Intestatario) {
        await store.correggiDati(p.id, {
          iban: edits.IBAN || p.IBAN,
          intestatario: edits.Intestatario || p.Intestatario
        })
      }
    }
    await store.creaBatch({
      nome: `Falliti ${new Date().toLocaleDateString()}`,
      associazione: batchAssociazioneFalliti.value,
      pagamentoIds: ids
    })
    notifySuccess($q, 'Batch creato con pagamenti falliti')
    selectedFalliti.value = []
  } catch (err) {
    notifyError($q, err, 'Errore creazione batch da falliti')
  }
}

async function handlePagato(pagamento) {
  try {
    await store.segnaPagato(pagamento.id)
    notifySuccess($q, 'Pagamento segnato come pagato')
  } catch (err) {
    notifyError($q, err, 'Errore')
  }
}

async function handleFallito(pagamento) {
  try {
    const note = prompt('Motivo del fallimento:')
    if (note === null) return
    await store.segnaFallito(pagamento.id, note)
    notifySuccess($q, 'Pagamento segnato come fallito')
  } catch (err) {
    notifyError($q, err, 'Errore')
  }
}

async function handleAnnullato(pagamento) {
  try {
    const motivo = prompt('Motivo dell\'annullamento:')
    if (motivo === null) return
    await store.segnaAnnullato(pagamento.id, motivo)
    notifySuccess($q, 'Pagamento annullato')
  } catch (err) {
    notifyError($q, err, 'Errore')
  }
}

async function exportCsv() {
  const rows = filteredInCorso.value
  if (rows.length === 0) return
  let csv = 'Famiglia,Importo,IBAN,Intestatario,Stato\n'
  for (const r of rows) {
    csv += `"${r.Famiglia?.Nome_Famiglia || ''}",${r.Importo},"${r.IBAN || ''}","${r.Intestatario || ''}",${r.Stato}\n`
  }
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `batch-${batchFilter.value || 'tutti'}.csv`
  a.click(); URL.revokeObjectURL(url)
}

onMounted(() => {
  store.init()
})
</script>
