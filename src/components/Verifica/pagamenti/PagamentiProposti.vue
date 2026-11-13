<template>
  <div>
    <div class="row q-gutter-sm q-mb-md">
      <q-select
        v-model="batchAssociazione"
        :options="assocOptions"
        label="Associazione"
        dense
        outlined
        class="col-12 col-sm-4 col-md-3"
        emit-value
        map-options
      />
      <div v-if="batchAssociazione" class="text-caption q-mr-md self-center">
        €{{ formatNumber(residuo(batchAssociazione)) }} disponibili
      </div>
      <q-btn
        color="primary"
        icon="playlist_add"
        label="Crea gruppo di pagamento"
        :disable="selected.length === 0 || !batchAssociazione"
        @click="openCreaBatch"
      />
      <q-btn color="primary" label="RICALCOLA" :loading="store.loading" @click="emit('ricalcola')" />
    </div>

    <PagamentiTabella
      :rows="filteredProposti"
      :columns="propostiColumns"
      :loading="store.loading"
      selectable
      :selected="selected"
      :client-pagination="{ rowsPerPage: 25 }"
      @update:selected="val => (selected = val)"
    >
      <template #top>
        <div class="full-width">
          <TableToolbar
            v-model:search="searchProposti"
            search-placeholder="Cerca famiglia, IBAN..."
            :loading="store.loading"
            refresh
            @refresh="store.fetchProposti()"
          />
        </div>
      </template>

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
              <div class="row items-center q-gutter-sm q-mb-sm">
                <q-checkbox v-model="selected" :val="props.row" dense />
                <div>
                  <div class="text-weight-medium">{{ props.row.Famiglia?.Nome_Famiglia || '—' }}</div>
                  <div class="text-caption">€{{ formatNumber(props.row.Importo) }}</div>
                </div>
              </div>
              <div class="text-caption q-mt-xs">{{ props.row.IBAN || '—' }}</div>
              <div class="text-caption">{{ props.row.Intestatario || '—' }}</div>
            </q-card-section>
          </q-card>
        </div>
      </template>
    </PagamentiTabella>

    <div v-if="selected.length > 0" class="q-mt-md q-mb-sm text-weight-medium text-right text-primary text-h6">
      Selezionato: €{{ formatNumber(selectedTotal) }}
    </div>

    <AppDialog v-model="showBatchDialog" title="Crea gruppo di pagamento">
      <q-card-section>
        <q-input v-model="batchNome" label="Nome gruppo *" outlined dense />
        <div class="text-caption q-mt-sm">
          {{ selected.length }} pagamenti selezionati, totale €{{ formatNumber(selectedTotal) }}
        </div>
        <div class="text-caption text-grey-7">Associazione: {{ batchAssociazioneLabel }}</div>
      </q-card-section>
      <template #footer>
        <q-btn v-close-popup flat dense size="sm" label="Annulla" />
        <q-btn color="primary" label="Conferma" :disable="!batchNome" :loading="store.loading" @click="creaBatch" />
      </template>
    </AppDialog>
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, computed } from 'vue'
import AppDialog from 'components/Common/AppDialog.vue'
import TableToolbar from 'components/TableToolbar.vue'
import PagamentiTabella from 'src/components/Verifica/PagamentiTabella.vue'
import { formatNumber } from 'src/utils/formatters'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { usePagamentiStore } from 'stores/pagamenti.store'

const emit = defineEmits(['ricalcola'])

const $q = useQuasar()
const store = usePagamentiStore()

const selected = ref([])
const batchAssociazione = ref(null)
const searchProposti = ref('')
const batchNome = ref('')
const showBatchDialog = ref(false)

const assocOptions = computed(() => store.associazioni.map(a => ({ label: a.Nome, value: a.Nome })))

const batchAssociazioneLabel = computed(() => {
  const a = store.associazioni.find(a => a.Nome === batchAssociazione.value)
  return a?.Nome || ''
})

const selectedTotal = computed(() => selected.value.reduce((s, p) => s + (Number.parseFloat(p.Importo) || 0), 0))

const filteredProposti = computed(() => {
  if (!searchProposti.value) return store.proposti
  const q = searchProposti.value.toLowerCase()
  return store.proposti.filter(p => {
    const fam = p.Famiglia?.Nome_Famiglia?.toLowerCase() || ''
    const iban = (p.IBAN || '').toLowerCase()
    const int = (p.Intestatario || '').toLowerCase()
    return fam.includes(q) || iban.includes(q) || int.includes(q)
  })
})

const propostiColumns = [
  { name: 'famiglia', label: 'Famiglia', align: 'left', field: row => row.Famiglia?.Nome_Famiglia || '' },
  { name: 'importo', label: 'Importo', align: 'right' },
  { name: 'IBAN', label: 'IBAN', field: 'IBAN', align: 'left' },
  { name: 'Intestatario', label: 'Intestatario', field: 'Intestatario', align: 'left' }
]

function residuo(nome) {
  return store.residuoAssociazione(nome)
}

function openCreaBatch() {
  if (selected.value.length === 0) return
  batchNome.value = ''
  showBatchDialog.value = true
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
</script>
