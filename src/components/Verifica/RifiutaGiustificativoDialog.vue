<template>
  <AppDialog v-model="visible" title="Rifiuta giustificativo" card-class="q-pa-lg" footer-class="q-pa-md">
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
    <template #footer>
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
    </template>
  </AppDialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import AppDialog from 'components/Common/AppDialog.vue'

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
