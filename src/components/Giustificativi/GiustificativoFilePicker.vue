<template>
  <q-file
    :model-value="modelValue"
    outlined
    dense
    :accept="FILE_ACCEPT"
    :max-file-size="FILE_MAX_SIZE"
    label="Allega file"
    @update:model-value="$emit('update:modelValue', $event)"
    @rejected="onRejected"
  >
    <template v-slot:prepend>
      <q-icon name="attach_file" />
    </template>
  </q-file>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { FILE_ACCEPT, FILE_MAX_SIZE } from 'src/utils/constants'

const $q = useQuasar()

defineProps({
  modelValue: { type: File, default: null }
})

defineEmits(['update:modelValue'])

function onRejected() {
  $q.notify({
    type: 'negative',
    message: 'Il file supera la dimensione massima consentita (5MB)',
    timeout: 3000
  })
}

function touch() {}

defineExpose({ touch })
</script>
