<template>
  <PagamentiTabella
    :rows="filteredFalliti"
    :columns="fallitiColumns"
    :loading="store.loading"
    selectable
    :selected="selectedFalliti"
    :client-pagination="{ rowsPerPage: 25 }"
    @update:selected="val => (selectedFalliti = val)"
  >
    <template #top>
      <div class="full-width">
        <div v-if="selectedFalliti.length > 0" class="row items-center q-gutter-sm q-mb-sm">
          <span class="text-caption">{{ selectedFalliti.length }} selezionati</span>
          <q-btn color="warning" icon="restore" label="Ripristina a Bonifici" @click="handleRipristinaProposti" />
        </div>
        <TableToolbar
          v-model:search="searchFalliti"
          search-placeholder="Cerca famiglia, IBAN..."
          :loading="store.loading"
          refresh
          @refresh="store.fetchFalliti()"
        />
      </div>
    </template>

    <template #body-cell-iban="props">
      <q-td :props="props">
        <q-input
          :model-value="props.row.IBAN"
          dense
          outlined
          :rules="IBAN_RULES"
          @update:model-value="val => editFallito(props.row, 'IBAN', sanitizeIBAN(val))"
        />
      </q-td>
    </template>
    <template #body-cell-intestatario="props">
      <q-td :props="props">
        <q-input
          :model-value="props.row.Intestatario"
          dense
          outlined
          @update:model-value="val => editFallito(props.row, 'Intestatario', val)"
        />
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
            <div class="text-caption text-weight-medium q-mb-xs">€{{ formatNumber(props.row.Importo) }}</div>
            <q-input
              :model-value="props.row.IBAN"
              label="IBAN"
              dense
              outlined
              class="q-mb-sm"
              :rules="IBAN_RULES"
              @update:model-value="val => editFallito(props.row, 'IBAN', sanitizeIBAN(val))"
            />
            <q-input
              :model-value="props.row.Intestatario"
              label="Intestatario"
              dense
              outlined
              class="q-mb-sm"
              @update:model-value="val => editFallito(props.row, 'Intestatario', val)"
            />
            <div v-if="props.row.NoteEsito" class="text-caption text-grey-7">Note: {{ props.row.NoteEsito }}</div>
          </q-card-section>
        </q-card>
      </div>
    </template>
  </PagamentiTabella>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, computed } from 'vue'
import TableToolbar from 'components/TableToolbar.vue'
import PagamentiTabella from 'src/components/Verifica/PagamentiTabella.vue'
import { formatNumber } from 'src/utils/formatters'
import { IBAN_RULES, sanitizeIBAN } from 'src/utils/iban-validator'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { usePagamentiStore } from 'stores/pagamenti.store'

const $q = useQuasar()
const store = usePagamentiStore()

const selectedFalliti = ref([])
const searchFalliti = ref('')
const editingFalliti = ref({})

const filteredFalliti = computed(() => {
  if (!searchFalliti.value) return store.falliti
  const q = searchFalliti.value.toLowerCase()
  return store.falliti.filter(p => {
    const fam = p.Famiglia?.Nome_Famiglia?.toLowerCase() || ''
    const iban = (p.IBAN || '').toLowerCase()
    const note = (p.NoteEsito || '').toLowerCase()
    return fam.includes(q) || iban.includes(q) || note.includes(q)
  })
})

const fallitiColumns = [
  { name: 'famiglia', label: 'Famiglia', align: 'left', field: row => row.Famiglia?.Nome_Famiglia || '' },
  { name: 'iban', label: 'IBAN', align: 'left' },
  { name: 'intestatario', label: 'Intestatario', align: 'left' },
  { name: 'importo', label: 'Importo', align: 'right' },
  { name: 'note', label: 'Note', field: 'NoteEsito', align: 'left' }
]

function editFallito(row, field, val) {
  editingFalliti.value[row.id] = { ...editingFalliti.value[row.id], [field]: val }
}

async function handleRipristinaProposti() {
  try {
    const count = selectedFalliti.value.length
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
    selectedFalliti.value = []
    editingFalliti.value = {}
    await store.fetchFalliti()
    notifySuccess($q, `${count} pagamenti ripristinati a Bonifici`)
  } catch (error) {
    notifyError($q, error, 'Errore ripristino')
  }
}
</script>
