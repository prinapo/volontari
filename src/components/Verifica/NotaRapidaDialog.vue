<template>
  <AppDialog v-model="visible" title="Aggiungi nota">
    <q-card-section>
      <NotaInput
        v-model="testo"
        label="Nota"
        placeholder="Scrivi una nota per il progetto..."
        testid-input="nota-rapida-input"
        :show-button="false"
      />
    </q-card-section>
    <template #footer>
      <q-btn
v-close-popup
flat
dense
size="sm"
label="Annulla"
data-testid="nota-rapida-annulla" />
      <q-btn
        color="primary"
        label="Aggiungi nota"
        :loading="saving"
        :disable="!testo.trim()"
        data-testid="nota-rapida-salva"
        @click="handleSubmit"
      />
    </template>
  </AppDialog>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { computed, ref, watch } from 'vue'
import AppDialog from 'components/Common/AppDialog.vue'
import NotaInput from 'src/components/Note/NotaInput.vue'
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
    await store.createNota(props.progettoId, value)
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