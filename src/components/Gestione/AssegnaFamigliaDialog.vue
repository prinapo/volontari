<template>
  <q-dialog v-model="visible" persistent style="min-width: 600px; max-width: 800px">
    <q-card>
      <q-card-section class="row items-center">
        <div class="text-h6">
          Associa a famiglia
        </div>
        <q-space />
        <q-btn v-close-popup icon="close" flat round dense />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="famiglie"
          :columns="famigliaColumns"
          row-key="id"
          flat
          bordered
          :loading="loading"
          :pagination="{ rowsPerPage: 10 }"
        >
          <template #body-cell-azioni="slotProps">
            <q-td :props="slotProps">
              <q-btn
                flat
                dense
                icon="delete"
                color="negative"
                @click="handleRemove(slotProps.row)"
              >
                <q-tooltip>Rimuovi</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>

        <div class="row items-center q-mt-md q-gutter-sm">
          <q-select
            v-model="selectedRuolo"
            :options="ruoloOptions"
            emit-value
            map-options
            dense
            outlined
            label="Ruolo"
            class="col"
            style="max-width: 200px"
          />
          <q-select
            v-model="selectedFamiglia"
            :options="famigliaOptions"
            option-label="Nome_Famiglia"
            option-value="id_famiglia"
            emit-value
            map-options
            dense
            outlined
            use-input
            input-debounce="300"
            label="Aggiungi famiglia..."
            class="col"
            style="max-width: 400px"
            @filter="filterFamiglie"
          />
          <q-btn
            color="primary"
            icon="add"
            label="Assegna"
            :disable="!selectedFamiglia"
            @click="handleAssign"
          />
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn v-close-popup flat label="Chiudi" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useGestioneStore } from 'stores/gestione.store'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { gestioneService } from 'src/services/gestione.service'

const props = defineProps({
  modelValue: Boolean,
  contatto: { type: Object, default: null },
  ruolo: { type: String, default: 'Volontario' }
})

const emit = defineEmits(['update:modelValue'])

const $q = useQuasar()
const store = useGestioneStore()

const visible = ref(false)
const loading = ref(false)
const famiglie = ref([])
const selectedFamiglia = ref(null)
const famigliaOptions = ref([])
const selectedRuolo = ref(props.ruolo)

const ruoloOptions = [
  { label: 'Volontario', value: 'Volontario' },
  { label: 'Genitore', value: 'Genitore' }
]

const famigliaColumns = [
  { name: 'nome', label: 'Famiglia', field: row => row.Famiglia?.Nome_Famiglia || '', align: 'left' },
  { name: 'ruolo', label: 'Ruolo', field: 'Ruolo_nella_Famiglia', align: 'left' },
  { name: 'azioni', label: '', align: 'center' }
]

watch(() => props.modelValue, async (val) => {
  visible.value = val
  if (val && props.contatto) {
    await loadFamiglie()
  }
})

watch(visible, (val) => {
  if (!val) emit('update:modelValue', false)
})

async function loadFamiglie() {
  loading.value = true
  try {
    const res = await gestioneService.getFamiglieByContatto(props.contatto.id_contatto)
    famiglie.value = res.data.data || []
  } catch {
    famiglie.value = []
  } finally {
    loading.value = false
  }
}

async function filterFamiglie(search, update) {
  update(async () => {
    if (!search) {
      try {
        const res = await gestioneService.getFamiglie({ limit: -1 })
        famigliaOptions.value = res.data.data || []
      } catch {
        famigliaOptions.value = []
      }
      return
    }
    try {
      const res = await gestioneService.searchFamiglie(search)
      famigliaOptions.value = res.data.data || []
    } catch {
      famigliaOptions.value = []
    }
  })
}

async function handleAssign() {
  if (!selectedFamiglia.value) return
  const ok = await store.assignToFamiglia(
    props.contatto.id_contatto,
    selectedFamiglia.value,
    selectedRuolo.value
  )
  if (ok) {
    notifySuccess($q, 'Famiglia assegnata')
    selectedFamiglia.value = null
    await loadFamiglie()
  } else if (store.error) {
    notifyError($q, store.error)
  }
}

async function handleRemove(row) {
  const ok = await store.removeFromFamiglia(row.id, props.contatto.id_contatto, row.Ruolo_nella_Famiglia)
  if (ok) {
    notifySuccess($q, 'Famiglia rimossa')
    await loadFamiglie()
  } else if (store.error) {
    notifyError($q, store.error)
  }
}
</script>
