<template>
  <div>
    <div class="row items-center q-gutter-sm">
      <q-file
        v-show="false"
        ref="fileInput"
        v-model="internalFile"
        :accept="FILE_ACCEPT"
        :max-file-size="FILE_MAX_SIZE"
        aria-label="Allega file"
        @update:model-value="onFileChange"
        @rejected="onRejected"
      />
      <q-btn
        icon="attach_file"
        label="Allega file"
        :color="fileBtnColor"
        :flat="!internalTouched || !modelValue"
        :outline="!modelValue"
        :class="{ 'bg-green-1': modelValue }"
        @click="fileInput?.pickFiles()"
      />
      <q-btn
        v-if="modelValue"
        flat
        dense
        icon="close"
        size="xs"
        color="negative"
        aria-label="Rimuovi file"
        @click="removeFile"
      >
        <q-tooltip>Rimuovi file</q-tooltip>
      </q-btn>
    </div>
    <div v-if="modelValue" class="text-caption text-green q-mt-xs">
      {{ modelValue.name }}
    </div>
    <div v-else-if="internalTouched && !modelValue" class="text-caption text-negative q-mt-xs">
      Campo obbligatorio
    </div>
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, computed } from 'vue'
import { FILE_ACCEPT, FILE_MAX_SIZE } from 'src/utils/constants'

const $q = useQuasar()

const props = defineProps({
  modelValue: { type: File, default: null }
})

const emit = defineEmits(['update:modelValue'])

const fileInput = ref(null)
const internalFile = ref(null)
const internalTouched = ref(false)

const fileBtnColor = computed(() => {
  if (props.modelValue) return 'green'
  if (internalTouched.value) return 'negative'
  return 'grey-7'
})

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

function removeFile() {
  emit('update:modelValue', null)
}

function touch() {
  internalTouched.value = true
}

defineExpose({ touch })
</script>
