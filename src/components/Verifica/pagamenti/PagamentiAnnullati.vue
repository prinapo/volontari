<template>
  <PagamentiTabella :rows="filteredAnnullati" :columns="annullatiColumns" :loading="store.loading">
    <template #top>
      <div class="full-width">
        <TableToolbar
          v-model:search="searchAnnullati"
          search-placeholder="Cerca famiglia, IBAN, motivo..."
          :loading="store.loading"
          refresh
          @refresh="store.fetchAnnullati()"
        >
          <template #filters>
            <q-select
              v-model="motivoAnnullati"
              :options="motiviAnnullati"
              label="Filtra per motivo"
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
    <template #body-cell-data="props">
      <q-td :props="props">{{ formatDate(props.row.DataProposta) }}</q-td>
    </template>
    <template #item="props">
      <div class="q-pa-xs col-12">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-weight-medium">{{ props.row.Famiglia?.Nome_Famiglia || '—' }}</div>
            <div class="text-caption">€{{ formatNumber(props.row.Importo) }}</div>
            <div v-if="props.row.NoteEsito" class="text-caption text-grey-7">Motivo: {{ props.row.NoteEsito }}</div>
          </q-card-section>
        </q-card>
      </div>
    </template>
  </PagamentiTabella>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import TableToolbar from 'components/TableToolbar.vue'
import PagamentiTabella from 'src/components/Verifica/PagamentiTabella.vue'
import { formatDate, formatNumber } from 'src/utils/formatters'
import { usePagamentiStore } from 'stores/pagamenti.store'

const store = usePagamentiStore()

const searchAnnullati = ref('')
const motivoAnnullati = ref(null)
const motiviAnnullati = [
  { label: 'Rimosso dal gruppo', value: 'Rimosso dal gruppo' },
  { label: 'Proposta annullata: importo non più dovuto', value: 'Proposta annullata: importo non più dovuto' }
]

const filteredAnnullati = computed(() => {
  return store.annullati.filter(p => {
    if (motivoAnnullati.value && (p.NoteEsito || '') !== motivoAnnullati.value) return false
    if (!searchAnnullati.value) return true
    const q = searchAnnullati.value.toLowerCase()
    const fam = p.Famiglia?.Nome_Famiglia?.toLowerCase() || ''
    const iban = (p.IBAN || '').toLowerCase()
    const note = (p.NoteEsito || '').toLowerCase()
    return fam.includes(q) || iban.includes(q) || note.includes(q)
  })
})

const annullatiColumns = [
  { name: 'famiglia', label: 'Famiglia', align: 'left', field: row => row.Famiglia?.Nome_Famiglia || '' },
  { name: 'importo', label: 'Importo', align: 'right' },
  { name: 'IBAN', label: 'IBAN', field: 'IBAN', align: 'left' },
  { name: 'Intestatario', label: 'Intestatario', field: 'Intestatario', align: 'left' },
  { name: 'data', label: 'Data', align: 'left' },
  { name: 'note', label: 'Motivo', field: 'NoteEsito', align: 'left' }
]

onMounted(() => store.fetchAnnullati())
</script>
