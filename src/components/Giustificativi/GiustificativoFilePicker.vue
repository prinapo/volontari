<template>
  <q-file
    v-model="internalFile"
    :accept="FILE_ACCEPT"
    :max-file-size="FILE_MAX_SIZE"
    outlined
    dense
    clearable
    label="Allega file"
    aria-label="Allega file"
    @update:model-value="onFileChange"
    @rejected="onRejected"
  />
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref } from 'vue'
import { FILE_ACCEPT, FILE_MAX_SIZE } from 'src/utils/constants'

const $q = useQuasar()

const props = defineProps({
  modelValue: { type: File, default: null }
})

const emit = defineEmits(['update:modelValue'])

const internalFile = ref(null)
const internalTouched = ref(false)

function onFileChange(file) {
  if (file) {
    emit('update:modelValue', file)
    internalTouched.value = true
  }
  internalFile.value = null
}

function onRejected() {
  $q.notify({
    type: 'negative',
    message: 'Il file supera la dimensione massima consentita (5MB)',
    timeout: 3000
  })
}

function touch() {
  internalTouched.value = true
}

defineExpose({ touch })
</script>
