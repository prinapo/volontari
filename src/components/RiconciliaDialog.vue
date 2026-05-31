<template>
  <q-dialog v-model="model" persistent>
    <q-card style="min-width: 520px">
      <q-card-section>
        <div class="text-h6">Riconcilia giustificativo</div>
        <div class="text-caption text-grey-7">
          {{ submission?.nome_richiedente }} {{ submission?.cognome_richiedente }}
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="q-gutter-y-sm">
        <div class="text-body2"><strong>Richiedente:</strong> {{ submission?.nome_richiedente }} {{ submission?.cognome_richiedente }} ({{ submission?.email }})</div>
        <div class="text-body2"><strong>Beneficiario:</strong> {{ submission?.nome_beneficiario }} {{ submission?.cognome_beneficiario }}</div>
        <div class="text-body2"><strong>IBAN dichiarato:</strong> {{ submission?.iban }}</div>
        <div class="text-body2"><strong>Intestatario:</strong> {{ submission?.intestatario }}</div>
        <div class="text-body2"><strong>Descrizione:</strong> {{ submission?.descrizione }}</div>
        <div class="text-body2"><strong>Importo:</strong> {{ submission?.importo ? formatCurrency(submission.importo) : '—' }}</div>
        <div class="text-body2"><strong>Data:</strong> {{ submission?.data ? formatDate(submission.data) : '—' }}</div>
        <div v-if="submission?.allegato" class="text-body2">
          <strong>Allegato:</strong>
          <a :href="assetUrl(submission.allegato)" target="_blank" class="text-primary q-ml-xs">Apri</a>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="q-gutter-y-md">
        <q-select
          v-model="selectedFamigliaId"
          :options="famigliaOptions"
          label="Seleziona Famiglia *"
          outlined
          dense
          emit-value
          map-options
          use-input
          input-debounce="300"
          @filter="filterFamiglie"
          :rules="[val => !!val || 'Seleziona una famiglia']"
          lazy-rules
        />
        <q-select
          v-model="selectedProgettoId"
          :options="progettoOptions"
          label="Seleziona Progetto *"
          outlined
          dense
          emit-value
          map-options
          :disable="!selectedFamigliaId"
          :rules="[val => !!val || 'Seleziona un progetto']"
          lazy-rules
        />
        <q-input
          v-model="note"
          label="Note (opzionale)"
          outlined
          dense
          type="textarea"
        />
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Annulla" color="negative" v-close-popup />
        <q-btn
          flat
          label="Crea giustificativo"
          color="primary"
          :disable="!selectedFamigliaId || !selectedProgettoId"
          :loading="saving"
          @click="confirmReconcile"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { verificaService } from 'src/services/verifica.service'
import { formatCurrency, formatDate } from 'src/utils/formatters'
import { API_URL, STORAGE_KEYS } from 'src/utils/constants'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  submission: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'reconcile'])

const model = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const selectedFamigliaId = ref(null)
const selectedProgettoId = ref(null)
const note = ref('')
const saving = ref(false)
const famiglieList = ref([])
const progettiList = ref([])

const famigliaOptions = computed(() =>
  famiglieList.value.map(f => ({
    label: `${f.Nome_Famiglia} — ${f.IBAN ? f.IBAN.slice(0, 4) + '...' + f.IBAN.slice(-4) : 'IBAN mancante'}`,
    value: f.id_famiglia
  }))
)

const progettoOptions = computed(() =>
  progettiList.value.map(p => ({
    label: `${p.Cognome_e__Nome_Beneficiario} (${p.AnnoBando || 'N/A'})`,
    value: p.id_progetto
  }))
)

watch(() => props.modelValue, async (val) => {
  if (val) {
    selectedFamigliaId.value = null
    selectedProgettoId.value = null
    note.value = ''
    await loadFamiglie('')
  }
})

watch(selectedFamigliaId, async (val) => {
  selectedProgettoId.value = null
  progettiList.value = []
  if (val && props.submission) {
    try {
      const res = await verificaService.findProgettoByFamiglia(val, props.submission.cognome_beneficiario)
      progettiList.value = res.data.data || []
    } catch {
      progettiList.value = []
    }
  }
})

async function loadFamiglie(search) {
  try {
    const res = await verificaService.searchFamiglie(search || '')
    famiglieList.value = res.data.data || []
  } catch {
    famiglieList.value = []
  }
}

async function filterFamiglie(search, update) {
  update(async () => {
    await loadFamiglie(search || '')
  })
}

async function confirmReconcile() {
  if (!selectedFamigliaId.value || !selectedProgettoId.value) return
  saving.value = true
  try {
    emit('reconcile', {
      submissionId: props.submission?.id,
      famigliaId: selectedFamigliaId.value,
      progettoId: selectedProgettoId.value,
      note: note.value
    })
    model.value = false
  } finally {
    saving.value = false
  }
}

function assetUrl(fileId) {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  return `${API_URL}/assets/${fileId}?access_token=${token}`
}
</script>
