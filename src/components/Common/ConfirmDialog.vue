<template>
  <q-dialog v-model="model" persistent>
    <q-card style="min-width: 350px">
      <q-card-section class="row items-center">
        <q-icon :name="icon" :color="iconColor" size="md" class="q-mr-sm" />
        <div>
          <div class="text-h6">
            {{ title }}
          </div>
          <div class="text-body2 text-grey">
            {{ message }}
          </div>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn v-close-popup flat :label="cancelLabel" />
        <q-btn
          :color="confirmColor"
          :label="confirmLabel"
          :loading="loading"
          @click="$emit('confirm')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Conferma' },
  message: { type: String, default: 'Sei sicuro?' },
  icon: { type: String, default: 'help_outline' },
  iconColor: { type: String, default: 'warning' },
  confirmLabel: { type: String, default: 'Conferma' },
  cancelLabel: { type: String, default: 'Annulla' },
  confirmColor: { type: String, default: 'primary' },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const model = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>
