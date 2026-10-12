<template>
  <q-dialog
    :model-value="modelValue"
    :persistent="persistent"
    :maximized="maximized"
    :full-width="fullWidth"
    :data-testid="dialogTestid"
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <q-card :class="cardClass" :style="cardStyle">
      <q-card-section class="row items-center">
        <slot name="header">
          <div class="text-h6">{{ title }}</div>
        </slot>
        <q-space />
        <slot name="header-actions" />
        <q-btn
          v-if="!hideClose"
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

      <slot />

      <template v-if="!hideFooter">
        <q-separator />
        <q-card-actions align="right" :class="footerClass">
          <slot name="footer">
            <q-btn v-close-popup flat dense size="sm" label="Annulla" />
          </slot>
        </q-card-actions>
      </template>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  persistent: { type: Boolean, default: true },
  maximized: { type: Boolean, default: false },
  fullWidth: { type: Boolean, default: false },
  width: { type: [String, Number], default: null },
  hideClose: { type: Boolean, default: false },
  hideFooter: { type: Boolean, default: false },
  cardClass: { type: String, default: '' },
  footerClass: { type: String, default: '' },
  dialogTestid: { type: String, default: undefined }
})

const emit = defineEmits(['update:modelValue'])

const cardStyle = computed(() => {
  if (props.width == null) return
  return { minWidth: typeof props.width === 'number' ? `${props.width}px` : props.width }
})
</script>
