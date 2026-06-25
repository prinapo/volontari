<template>
  <div>
    <div class="row items-center q-gutter-sm">
      <input
        ref="fileInput"
        type="file"
        :accept="FILE_ACCEPT"
        hidden
        @change="onFileChange"
      >
      <q-btn
        icon="attach_file"
        label="Allega file"
        :color="fileBtnColor"
        :flat="!internalTouched || !modelValue"
        :outline="!modelValue"
        :class="{ 'bg-green-1': modelValue }"
        @click="fileInput?.click()"
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
import { ref, computed } from 'vue'
import { FILE_ACCEPT, FILE_MAX_SIZE } from 'src/utils/constants'

const props = defineProps({
  modelValue: { type: File, default: null }
})

const emit = defineEmits(['update:modelValue'])

const fileInput = ref(null)
const internalTouched = ref(false)

const fileBtnColor = computed(() => {
  if (props.modelValue) return 'green'
  if (internalTouched.value) return 'negative'
  return 'grey-7'
})

function onFileChange(event) {
  const file = event.target.files?.[0]
  if (file) {
    if (file.size > FILE_MAX_SIZE) return
    emit('update:modelValue', file)
    internalTouched.value = true
  }
  event.target.value = ''
}

function removeFile() {
  emit('update:modelValue', null)
  if (fileInput.value) fileInput.value.value = ''
}

function touch() {
  internalTouched.value = true
}

defineExpose({ touch })
</script>
