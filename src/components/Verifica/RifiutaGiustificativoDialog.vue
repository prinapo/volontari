<template>
  <q-dialog v-model="visible" persistent>
    <q-card class="q-pa-lg">
      <q-card-section class="row items-center">
        <div class="text-h6">Rifiuta giustificativo</div>
        <q-space />
        <q-btn
v-close-popup
icon="close"
flat
round
dense
aria-label="Chiudi">
          <q-tooltip>Chiudi</q-tooltip>
        </q-btn>
      </q-card-section>
      <q-separator />
      <q-card-section>
        <div class="text-caption text-grey-7 q-mb-sm">
          {{ item?.Descrizione || '' }}
        </div>
        <q-input
          v-model="nota"
          outlined
          dense
          label="Motivazione del rifiuto *"
          type="textarea"
          :rules="[val => !!val || 'Inserisci una motivazione']"
        />
      </q-card-section>
      <q-card-actions align="right" class="q-pa-md">
        <q-btn v-close-popup flat dense size="sm" label="Annulla" />
        <q-btn
          label="Rifiuta"
          color="negative"
          dense
          size="sm"
          :disable="!nota"
          :loading="saving"
          @click="confirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  item: { type: Object, default: null },
  saving: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const nota = ref('')

function confirm() {
  if (!nota.value) return
  emit('confirm', nota.value)
}

function reset() {
  nota.value = ''
}

defineExpose({ reset })
</script>
