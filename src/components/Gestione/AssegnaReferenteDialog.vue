<template>
  <q-dialog v-model="visible" persistent style="min-width: 500px; max-width: 800px">
    <q-card>
      <q-card-section class="row items-center">
        <div class="text-h6">
          Assegna Referente
        </div>
        <q-space />
        <q-btn v-close-popup icon="close" flat round dense />
      </q-card-section>

      <q-card-section v-if="volontario">
        <div class="text-body2 q-mb-md">
          Volontario: <strong>{{ volontario.Nome }} {{ volontario.Cognome }}</strong>
        </div>

        <div class="text-subtitle2 q-mb-sm">Referenti assegnati</div>
        <div v-if="assignedReferenti.length === 0" class="text-caption text-grey q-mb-sm">
          Nessun referente assegnato
        </div>
        <div v-for="r in assignedReferenti" :key="r.id" class="row items-center q-gutter-xs q-mb-xs">
          <span class="text-body2 col">{{ r.Nome }} {{ r.Cognome }}</span>
          <q-btn flat round dense icon="delete" color="negative" size="sm" @click="removeReferente(r)" />
        </div>

        <q-separator class="q-my-md" />

        <div class="text-subtitle2 q-mb-sm">Aggiungi referente</div>
        <div class="row items-center q-gutter-sm">
          <q-select
            v-model="selectedReferente"
            :options="referenteOptions"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            use-input
            input-debounce="300"
            dense
            outlined
            class="col"
            label="Cerca referente..."
            @filter="filterReferenti"
          />
          <q-btn
            color="primary"
            icon="person_add"
            :disable="!selectedReferente"
            @click="addReferente"
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
import { referentiService } from 'src/services/referenti.service'
import { contattiService } from 'src/services/contatti.service'
import { notifyError, notifySuccess } from 'src/utils/notify'

const props = defineProps({
  modelValue: Boolean,
  volontario: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const $q = useQuasar()
const store = useGestioneStore()

const visible = ref(false)
const assignedReferenti = ref([])
const selectedReferente = ref(null)
const referenteOptions = ref([])

watch(() => props.modelValue, async (val) => {
  visible.value = val
  if (val && props.volontario) {
    await loadAssigned()
  }
})

async function loadAssigned() {
  if (!props.volontario?.id_contatto) return
  try {
    const res = await referentiService.getByVolontario(props.volontario.id_contatto)
    assignedReferenti.value = (res.data.data || []).map(r => ({
      id: r.id,
      id_contatto: r.Referente?.id_contatto,
      Nome: r.Referente?.Nome || '',
      Cognome: r.Referente?.Cognome || ''
    }))
  } catch {
    assignedReferenti.value = []
  }
}

async function filterReferenti(val, update) {
  if (!val || val.length < 2) {
    update(() => { referenteOptions.value = [] })
    return
  }
  try {
    const res = await contattiService.query({ search: val, isReferente: true, limit: 20 })
    const rows = res.data.data || []
    update(() => {
      referenteOptions.value = rows
        .filter(r => !assignedReferenti.value.some(a => a.id_contatto === r.id_contatto))
        .map(r => ({
          label: `${r.Nome} ${r.Cognome}`,
          value: r.id_contatto
        }))
    })
  } catch {
    update(() => { referenteOptions.value = [] })
  }
}

async function addReferente() {
  if (!selectedReferente.value || !props.volontario?.id_contatto) return
  const ok = await store.assignReferente(props.volontario.id_contatto, selectedReferente.value)
  if (ok) {
    notifySuccess($q, 'Referente assegnato al volontario')
    selectedReferente.value = null
    await loadAssigned()
    emit('saved')
  } else {
    notifyError($q, store.error || 'Errore nell\'assegnazione')
  }
}

async function removeReferente(referente) {
  const ok = await store.removeReferente(referente.id)
  if (ok) {
    notifySuccess($q, 'Referente rimosso dal volontario')
    await loadAssigned()
    emit('saved')
  } else {
    notifyError($q, store.error || 'Errore nella rimozione')
  }
}

watch(visible, (val) => {
  if (!val) emit('update:modelValue', false)
})
</script>
