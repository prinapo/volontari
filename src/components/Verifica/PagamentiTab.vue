<template>
  <div>
    <div class="row items-center q-gutter-sm q-mb-md">
      <q-tabs
        v-model="subTab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        narrow-indicator
      >
        <q-tab name="proposti" label="Bonifici da fare" />
        <q-tab name="incorso" label="Da riscontrare" />
        <q-tab name="falliti" label="Falliti" />
        <q-tab name="liste" label="Liste esportazione" />
      </q-tabs>
      <q-space />

      <!-- Indicatori capienza -->
      <template v-if="subTab === 'proposti'">
        <q-select
          v-model="batchAssociazione"
          :options="assocOptions"
          label="Associazione"
          dense
          outlined
          class="col-auto"
          style="min-width: 200px"
          emit-value
          map-options
        />
        <div v-if="batchAssociazione" class="text-caption q-mr-md">
          €{{ formatNumber(residuo(batchAssociazione)) }} disponibili
        </div>
        <q-btn
          color="primary"
          icon="playlist_add"
          label="Crea gruppo di pagamento"
          :disable="selected.length === 0 || !batchAssociazione"
          @click="openCreaBatch"
        />
        <q-btn
          flat
          dense
          icon="refresh"
          size="sm"
          color="primary"
          label="Ricalcola proposte"
          :loading="store.loading"
          @click="ricalcolaProposte"
        />
      </template>
    </div>

    <!-- Sotto-vista: Proposti -->
    <template v-if="subTab === 'proposti'">
      <q-table
        v-model:selected="selected"
        :rows="store.proposti"
        :columns="propostiColumns"
        row-key="id"
        flat
        bordered
        class="bg-white"
        selection="multiple"
        :loading="store.loading"
        :grid="$q.screen.lt.sm"
        :dense="$q.screen.lt.md"
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

      <div v-if="selected.length > 0" class="q-mt-md q-mb-sm text-weight-medium text-right text-primary text-h6">
        Selezionato: €{{ formatNumber(selectedTotal) }}
      </div>
    </template>

    <!-- Sotto-vista: In corso / Da riscontrare -->
    <template v-if="subTab === 'incorso'">
      <div class="row items-center q-gutter-sm q-mb-md">
        <q-select
          v-model="batchFilter"
          :options="batchOptions"
          label="Filtra per gruppo"
          dense
outlined
          clearable
          class="col-auto"
          style="min-width: 250px"
          emit-value
map-options
        />
      </div>

      <q-table
        :rows="filteredInCorso"
        :columns="incorsoColumns"
        row-key="id"
        flat
        bordered
        class="bg-white"
        :loading="store.loading"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        :grid="$q.screen.lt.sm"
        :dense="$q.screen.lt.md"
      >
        <template #body-cell-importo="props">
          <q-td :props="props">€{{ formatNumber(props.row.Importo) }}</q-td>
        </template>
        <template #body-cell-azioni="props">
          <q-td :props="props">
            <div class="row q-gutter-xs no-wrap">
              <q-btn
v-if="props.row.Stato === 'in_pagamento'"
flat
dense
icon="check_circle"
color="positive"
size="sm"
aria-label="Segna pagato"
@click="handlePagato(props.row)">
                <q-tooltip>Pagato</q-tooltip>
              </q-btn>
              <q-btn
v-if="props.row.Stato === 'in_pagamento'"
flat
dense
icon="cancel"
color="negative"
size="sm"
aria-label="Segna fallito"
@click="handleFallito(props.row)">
                <q-tooltip>Fallito</q-tooltip>
              </q-btn>
              <q-btn
v-if="props.row.Stato === 'in_pagamento'"
flat
dense
icon="block"
color="grey"
size="sm"
aria-label="Rimuovi dal gruppo"
@click="handleAnnullato(props.row)">
                <q-tooltip>Rimuovi dal gruppo</q-tooltip>
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
                  <q-btn
 flat
 dense
 icon="check_circle"
 color="positive"
 size="sm"
 aria-label="Segna pagato"
 @click="handlePagato(props.row)"><q-tooltip>Pagato</q-tooltip></q-btn>
                  <q-btn
 flat
 dense
 icon="cancel"
 color="negative"
 size="sm"
 aria-label="Segna fallito"
 @click="handleFallito(props.row)"><q-tooltip>Fallito</q-tooltip></q-btn>
                  <q-btn
 flat
 dense
 icon="block"
 color="grey"
 size="sm"
 aria-label="Rimuovi dal gruppo"
 @click="handleAnnullato(props.row)"><q-tooltip>Rimuovi dal gruppo</q-tooltip></q-btn>
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
        v-model:selected="selectedFalliti"
        :rows="store.falliti"
        :columns="fallitiColumns"
        row-key="id"
        flat
        bordered
        class="bg-white"
        selection="multiple"
        :loading="store.loading"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        :grid="$q.screen.lt.sm"
        :dense="$q.screen.lt.md"
      >
        <template #body-cell-iban="props">
          <q-td :props="props">
            <q-input :model-value="props.row.IBAN" dense outlined :rules="IBAN_RULES" @update:model-value="val => editFallito(props.row, 'IBAN', sanitizeIBAN(val))" />
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
                <div class="row items-center q-gutter-sm q-mb-sm">
                  <q-checkbox v-model="selectedFalliti" :val="props.row" dense />
                  <div class="text-weight-medium">{{ props.row.Famiglia?.Nome_Famiglia || '—' }}</div>
                </div>
                <q-input
 :model-value="props.row.IBAN"
 label="IBAN"
 dense
 outlined
 class="q-mb-sm"
 :rules="IBAN_RULES"
 @update:model-value="val => editFallito(props.row, 'IBAN', sanitizeIBAN(val))" />
                <q-input :model-value="props.row.Intestatario" label="Intestatario" dense outlined @update:model-value="val => editFallito(props.row, 'Intestatario', val)" />
              </q-card-section>
            </q-card>
          </div>
        </template>
      </q-table>

      <div v-if="selectedFalliti.length > 0" class="row items-center q-gutter-sm q-mt-md">
        <span class="text-caption">{{ selectedFalliti.length }} selezionati</span>
        <q-btn color="primary" icon="restore" label="Ripristina a Bonifici" @click="handleRipristinaProposti" />
      </div>
    </template>

    <!-- Sotto-vista: Liste esportazione -->
    <template v-if="subTab === 'liste'">
      <div class="text-caption text-grey-7 q-mb-md">
        Le liste vengono generate automaticamente alla creazione di un gruppo di pagamento.
      </div>

      <q-table
        :rows="store.liste"
        :columns="listeColumns"
        row-key="id"
        flat
        bordered
        class="bg-white"
        :loading="store.loading"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        :grid="$q.screen.lt.sm"
        :dense="$q.screen.lt.md"
      >
        <template #body-cell-data="props">
          <q-td :props="props">{{ formatDate(props.row.DataCreazione) }}</q-td>
        </template>
        <template #body-cell-totale="props">
          <q-td :props="props">€{{ formatNumber(props.row.Totale) }}</q-td>
        </template>
        <template #body-cell-azioni="props">
          <q-td :props="props">
            <q-btn
              flat
              round
              dense
              icon="download"
              color="primary"
              type="a"
              aria-label="Scarica CSV"
              :disable="!props.row.File"
              :href="assetUrl(props.row.File, true)"
              :download="`${(props.row.Nome || '').replaceAll(/[^\w-]/g, '_')}.csv`"
              target="_blank"
            >
              <q-tooltip>Scarica CSV</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              icon="delete"
              color="negative"
              aria-label="Elimina lista"
              @click="confermaEliminaLista(props.row)"
            >
              <q-tooltip>Elimina lista</q-tooltip>
            </q-btn>
          </q-td>
        </template>
        <template #item="props">
          <div class="q-pa-xs col-12">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-weight-medium">{{ props.row.Nome || '—' }}</div>
                <div class="text-caption">{{ formatDate(props.row.DataCreazione) }}</div>
                <div class="row items-center q-gutter-sm q-mt-sm">
                  <span>€{{ formatNumber(props.row.Totale) }}</span>
                  <q-btn
                    flat
round
dense
icon="download"
color="primary"
size="sm"
                    type="a"
aria-label="Scarica CSV"
                    :disable="!props.row.File"
                    :href="assetUrl(props.row.File, true)"
                    :download="`${(props.row.Nome || '').replaceAll(/[^\w-]/g, '_')}.csv`"
                    target="_blank"
                  >
                    <q-tooltip>Scarica CSV</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
round
dense
icon="delete"
color="negative"
size="sm"
                    aria-label="Elimina lista"
                    @click="confermaEliminaLista(props.row)"
                  >
                    <q-tooltip>Elimina lista</q-tooltip>
                  </q-btn>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </template>
      </q-table>
    </template>

    <!-- Dialog Crea Batch -->
    <q-dialog v-model="showBatchDialog" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <div class="text-h6">Crea gruppo di pagamento</div>
          <q-space /><q-btn
v-close-popup
flat
round
dense
icon="close"
aria-label="Chiudi">
            <q-tooltip>Chiudi</q-tooltip>
          </q-btn>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-input v-model="batchNome" label="Nome gruppo *" outlined dense />
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
import { useQuasar } from 'quasar'
import { ref, computed, onMounted, watch } from 'vue'
import { assetUrl } from 'src/utils/assets'
import { formatDate } from 'src/utils/formatters'
import { IBAN_RULES, sanitizeIBAN } from 'src/utils/iban-validator'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { usePagamentiStore } from 'stores/pagamenti.store'
import { useVerificaStore } from 'stores/verifica.store'

const $q = useQuasar()
const store = usePagamentiStore()
const verificaStore = useVerificaStore()

const subTab = ref('proposti')
const selected = ref([])
const selectedFalliti = ref([])
const batchAssociazione = ref(null)
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
  selected.value.reduce((s, p) => s + (Number.parseFloat(p.Importo) || 0), 0)
)

const filteredInCorso = computed(() => {
  if (!batchFilter.value) return store.inCorso
  return store.inCorso.filter(p => (p.Batch?.id || p.Batch) === batchFilter.value)
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
  { name: 'gruppo', label: 'Gruppo', align: 'left', field: row => row.Batch?.Nome || '—' },
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

const listeColumns = [
  { name: 'nome', label: 'Nome', align: 'left', field: 'Nome' },
  { name: 'data', label: 'Data creazione', align: 'left' },
  { name: 'righe', label: 'Righe', align: 'right', field: 'ConteggioRighe' },
  { name: 'totale', label: 'Totale', align: 'right' },
  { name: 'azioni', label: 'Azioni', align: 'center' }
]

function formatNumber(v) { return (Number.parseFloat(v) || 0).toFixed(2) }

function residuo(nome) { return store.residuoAssociazione(nome) }

async function ricalcolaProposte() {
  if (verificaStore.rows.length === 0) {
    notifyError($q, null, 'Nessun progetto caricato. Apri prima la tabella Rendicontazione.')
    return
  }
  await store.ricalcolaPropostiDaProgetti(verificaStore.rows)
  if (store.error) notifyError($q, store.error, 'Errore ricalcolo')
}

function openCreaBatch() {
  if (selected.value.length === 0) return
  batchNome.value = ''
  showBatchDialog.value = true
}

function editFallito(row, field, val) {
  editingFalliti.value[row.id] = { ...editingFalliti.value[row.id], [field]: val }
}

async function creaBatch() {
  try {
    await store.creaBatch({
      nome: batchNome.value,
      associazione: batchAssociazione.value,
      pagamentoIds: selected.value.map(p => p.id)
    })
    notifySuccess($q, 'Gruppo creato. La lista è disponibile in "Liste esportazione".')
    showBatchDialog.value = false
    selected.value = []
  } catch (error) {
    notifyError($q, error, 'Errore creazione gruppo')
  }
}

async function handleRipristinaProposti() {
  try {
    for (const p of selectedFalliti.value) {
      const edits = editingFalliti.value[p.id]
      if (edits?.IBAN || edits?.Intestatario) {
        await store.correggiDati(p.id, {
          iban: edits.IBAN || p.IBAN,
          intestatario: edits.Intestatario || p.Intestatario
        })
      }
      await store.ripristinaProposto(p.id)
    }
    notifySuccess($q, `${selectedFalliti.value.length} pagamenti ripristinati a Bonifici`)
    selectedFalliti.value = []
    editingFalliti.value = {}
  } catch (error) {
    notifyError($q, error, 'Errore ripristino')
  }
}

async function handlePagato(pagamento) {
  try {
    await store.segnaPagato(pagamento.id)
    notifySuccess($q, 'Pagamento segnato come pagato')
  } catch (error) {
    notifyError($q, error, 'Errore')
  }
}

async function handleFallito(pagamento) {
  $q.dialog({
    title: 'Segna come fallito',
    message: 'Motivo del fallimento:',
    prompt: { model: '', type: 'text' },
    cancel: { label: 'Annulla', flat: true },
    ok: { label: 'Conferma', color: 'negative' },
    persistent: true
  }).onOk(async (note) => {
    if (!note) {
      notifyError($q, new Error('Il motivo è obbligatorio'), 'Errore')
      return
    }
    try {
      await store.segnaFallito(pagamento.id, note)
      notifySuccess($q, 'Pagamento segnato come fallito')
    } catch (error) {
      notifyError($q, error, 'Errore')
    }
  })
}

async function handleAnnullato(pagamento) {
  try {
    await store.segnaAnnullato(pagamento.id)
    notifySuccess($q, 'Rimosso dal gruppo')
  } catch (error) {
    notifyError($q, error, 'Errore')
  }
}

async function confermaEliminaLista(row) {
  $q.dialog({
    title: 'Elimina lista',
    message: `Eliminare la lista "${row.Nome || ''}"?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await store.eliminaLista(row.id, row.File)
      notifySuccess($q, 'Lista eliminata')
    } catch (error) {
      notifyError($q, error, 'Errore eliminazione')
    }
  })
}

onMounted(async () => {
  await store.init()
  if (store.proposti.length === 0) {
    // Attendi che la verifica store abbia caricato i progetti
    if (verificaStore.rows.length === 0) {
      await new Promise(resolve => {
        const unwatch = watch(() => verificaStore.rows.length, val => {
          if (val > 0) {
            unwatch()
            resolve()
          }
        })
      })
    }
    await ricalcolaProposte()
  }
})
</script>
