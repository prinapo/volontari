<template>
  <q-dialog v-model="visible" persistent>
    <q-card>
      <q-card-section class="row items-center">
        <div class="text-h6">Aggiungi nota</div>
        <q-space />
        <q-btn
          v-close-popup
          flat
          round
          dense
          icon="close"
          aria-label="Chiudi"
        >
          <q-tooltip>Chiudi</q-tooltip>
        </q-btn>
      </q-card-section>
      <q-separator />
      <q-card-section>
        <q-input
          v-model="testo"
          label="Nota"
          outlined
          dense
          autogrow
          type="textarea"
          placeholder="Scrivi una nota per il progetto..."
          data-testid="nota-rapida-input"
          @keydown.enter.exact.prevent="handleSubmit"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          v-close-popup
          flat
          dense
          size="sm"
          label="Annulla"
          data-testid="nota-rapida-annulla"
        />
        <q-btn
          color="primary"
          label="Aggiungi nota"
          :loading="saving"
          :disable="!testo.trim()"
          data-testid="nota-rapida-salva"
          @click="handleSubmit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { computed, ref, watch } from 'vue'
import { useNoteStore } from 'src/stores/note.store'
import { notifyError, notifySuccess } from 'src/utils/notify'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  progettoId: { type: [Number, String], required: true }
})

const emit = defineEmits(['update:modelValue'])

const $q = useQuasar()
const store = useNoteStore()
const testo = ref('')

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const saving = computed(() => store.saving)

async function handleSubmit() {
  const value = testo.value.trim()
  if (!value) return
  try {
    await store.createNota(props.progettoId, value, 'verificatore')
    testo.value = ''
    emit('update:modelValue', false)
    notifySuccess($q, 'Nota aggiunta')
  } catch (error) {
    notifyError($q, error, 'Errore nell\'aggiunta della nota')
  }
}

watch(
  () => props.modelValue,
  open => {
    if (open) testo.value = ''
  }
)
</script>