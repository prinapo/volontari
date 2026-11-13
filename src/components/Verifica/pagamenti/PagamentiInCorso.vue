<template>
  <PagamentiTabella
    :rows="store.inCorso"
    :columns="incorsoColumns"
    :loading="store.loading"
    selectable
    :selected="selectedInCorso"
    :client-pagination="{ rowsPerPage: 25 }"
    @update:selected="val => (selectedInCorso = val)"
  >
    <template #top>
      <div class="full-width">
        <div v-if="selectedInCorso.length > 0" class="row items-center q-gutter-sm q-mb-sm">
          <span class="text-caption">{{ selectedInCorso.length }} selezionati</span>
          <q-btn
            color="positive"
            icon="check_circle"
            label="Segna pagato"
            size="sm"
            :disable="!allInPagamento"
            @click="handleBatchPagato"
          >
            <q-tooltip>Segna come pagati tutti i selezionati</q-tooltip>
          </q-btn>
          <q-btn
            color="negative"
            icon="cancel"
            label="Segna fallito"
            size="sm"
            :disable="!allInPagamento"
            @click="handleBatchFallito"
          >
            <q-tooltip>Segna come falliti tutti i selezionati</q-tooltip>
          </q-btn>
          <q-btn
            color="grey"
            icon="block"
            label="Rimuovi dal gruppo"
            size="sm"
            :disable="!allInPagamento"
            @click="handleBatchAnnullato"
          >
            <q-tooltip>Rimuovi dal gruppo tutti i selezionati</q-tooltip>
          </q-btn>
          <div v-if="selectedInCorso.length > 0 && !allInPagamento" class="text-negative text-caption q-ml-sm">
            Alcuni selezionati hanno stato diverso da 'in pagamento' e non possono essere elaborati.
          </div>
        </div>
        <TableToolbar
          v-model:search="searchInCorso"
          search-placeholder="Cerca famiglia, IBAN, batch..."
          :loading="store.loading"
          refresh
          @refresh="loadInCorso"
        >
          <template #filters>
            <q-select
              v-model="batchFilter"
              :options="batchOptions"
              label="Filtra per gruppo"
              dense
              outlined
              clearable
              class="col-12 col-sm-6 col-md-4"
              emit-value
              map-options
            />
          </template>
        </TableToolbar>
      </div>
    </template>

    <template #body-cell-importo="props">
      <q-td :props="props">€{{ formatNumber(props.row.Importo) }}</q-td>
    </template>
    <template #body-cell-azioni="props">
      <q-td :props="props">
        <div class="row q-gutter-xs no-wrap">
          <q-btn
            v-if="props.row.Stato === 'in_pagamento'"
            flat
            round
            dense
            icon="check_circle"
            color="positive"
            size="sm"
            aria-label="Segna pagato"
            @click="handlePagato(props.row)"
          >
            <q-tooltip>Pagato</q-tooltip>
          </q-btn>
          <q-btn
            v-if="props.row.Stato === 'in_pagamento'"
            flat
            round
            dense
            icon="cancel"
            color="negative"
            size="sm"
            aria-label="Segna fallito"
            @click="handleFallito(props.row)"
          >
            <q-tooltip>Fallito</q-tooltip>
          </q-btn>
          <q-btn
            v-if="props.row.Stato === 'in_pagamento'"
            flat
            round
            dense
            icon="block"
            color="grey"
            size="sm"
            aria-label="Rimuovi dal gruppo"
            @click="handleAnnullato(props.row)"
          >
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
            <div class="row items-center q-gutter-sm q-mb-sm">
              <q-checkbox v-model="selectedInCorso" :val="props.row" dense />
              <div>
                <div class="text-weight-medium">{{ props.row.Famiglia?.Nome_Famiglia || '—' }}</div>
                <div class="text-caption">€{{ formatNumber(props.row.Importo) }}</div>
              </div>
            </div>
            <div class="text-caption q-mt-xs">Gruppo: {{ props.row.Batch?.Nome || '—' }}</div>
            <div class="text-caption">IBAN: {{ props.row.IBAN || '—' }}</div>
            <div class="text-caption">
              Intestatario: {{ props.row.Intestatario || props.row.Famiglia?.Intestatario_CC || '—' }}
            </div>
            <div v-if="props.row.Stato === 'pagato'" class="row items-center q-gutter-xs q-mt-sm">
              <q-badge color="positive">Pagato</q-badge>
            </div>
            <div v-else class="row q-gutter-xs q-mt-sm">
              <q-btn
                flat
                round
                dense
                icon="check_circle"
                color="positive"
                size="sm"
                aria-label="Segna pagato"
                @click="handlePagato(props.row)"
                ><q-tooltip>Pagato</q-tooltip></q-btn
              >
              <q-btn
                flat
                round
                dense
                icon="cancel"
                color="negative"
                size="sm"
                aria-label="Segna fallito"
                @click="handleFallito(props.row)"
                ><q-tooltip>Fallito</q-tooltip></q-btn
              >
              <q-btn
                flat
                round
                dense
                icon="block"
                color="grey"
                size="sm"
                aria-label="Rimuovi dal gruppo"
                @click="handleAnnullato(props.row)"
                ><q-tooltip>Rimuovi dal gruppo</q-tooltip></q-btn
              >
            </div>
          </q-card-section>
        </q-card>
      </div>
    </template>
  </PagamentiTabella>
</template>

<script setup>
import { debounce, useQuasar } from 'quasar'
import { ref, computed, watch } from 'vue'
import TableToolbar from 'components/TableToolbar.vue'
import PagamentiTabella from 'src/components/Verifica/PagamentiTabella.vue'
import { runBulk } from 'src/utils/bulk'
import { formatNumber } from 'src/utils/formatters'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { usePagamentiStore } from 'stores/pagamenti.store'

const $q = useQuasar()
const store = usePagamentiStore()

const selectedInCorso = ref([])
const batchFilter = ref(null)
const searchInCorso = ref('')

const batchOptions = computed(() => {
  const seen = new Set()
  const opts = []
  for (const p of store.inCorso) {
    const b = p.Batch
    if (b?.id && !seen.has(b.id)) {
      seen.add(b.id)
      opts.push({ label: b.Nome, value: b.id })
    }
  }
  return opts
})

const allInPagamento = computed(
  () => selectedInCorso.value.length > 0 && selectedInCorso.value.every(p => p.Stato === 'in_pagamento')
)

const incorsoColumns = [
  { name: 'famiglia', label: 'Famiglia', align: 'left', field: row => row.Famiglia?.Nome_Famiglia || '' },
  { name: 'importo', label: 'Importo', align: 'right' },
  { name: 'gruppo', label: 'Gruppo', align: 'left', field: row => row.Batch?.Nome || '—' },
  { name: 'IBAN', label: 'IBAN', field: 'IBAN', align: 'left' },
  {
    name: 'Intestatario',
    label: 'Intestatario',
    field: row => row.Intestatario || row.Famiglia?.Intestatario_CC || '—',
    align: 'left'
  },
  { name: 'stato', label: 'Stato', field: 'Stato', align: 'center' },
  { name: 'azioni', label: 'Azioni', align: 'center' }
]

function loadInCorso() {
  store.fetchInCorso(searchInCorso.value, batchFilter.value)
}

const debouncedLoadInCorso = debounce(loadInCorso, 300)

watch(searchInCorso, debouncedLoadInCorso)
watch(batchFilter, () => loadInCorso())

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
  }).onOk(async note => {
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

async function handleBatchPagato() {
  const { successi, errori } = await runBulk(selectedInCorso.value, p => store.segnaPagato(p.id))
  if (errori > 0) {
    notifyError($q, null, `${successi} pagamenti segnati, ${errori} errori`)
  } else {
    notifySuccess($q, `${selectedInCorso.value.length} pagamenti segnati come pagati`)
  }
  selectedInCorso.value = []
}

async function handleBatchFallito() {
  $q.dialog({
    title: 'Segna come fallito',
    message: 'Motivo del fallimento per tutti i selezionati:',
    prompt: { model: '', type: 'text' },
    cancel: { label: 'Annulla', flat: true },
    ok: { label: 'Conferma', color: 'negative' },
    persistent: true
  }).onOk(async note => {
    if (!note) {
      notifyError($q, new Error('Il motivo è obbligatorio'), 'Errore')
      return
    }
    const { successi, errori } = await runBulk(selectedInCorso.value, p => store.segnaFallito(p.id, note))
    if (errori > 0) {
      notifyError($q, null, `${successi} segnati, ${errori} errori`)
    } else {
      notifySuccess($q, `${selectedInCorso.value.length} pagamenti segnati come falliti`)
    }
    selectedInCorso.value = []
  })
}

async function handleBatchAnnullato() {
  const { successi, errori } = await runBulk(selectedInCorso.value, p => store.segnaAnnullato(p.id))
  if (errori > 0) {
    notifyError($q, null, `${successi} rimossi, ${errori} errori`)
  } else {
    notifySuccess($q, `${selectedInCorso.value.length} pagamenti rimossi dal gruppo`)
  }
  selectedInCorso.value = []
}
</script>
