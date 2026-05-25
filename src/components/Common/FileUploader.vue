<template>
  <q-file
    v-model="file"
    :label="label"
    :accept="accept"
    :max-file-size="maxSize"
    filled
    clearable
    @update:model-value="onFileChange"
  >
    <template v-slot:prepend>
      <q-icon name="attach_file" />
    </template>
    <template v-slot:hint>
      Formati: {{ accept }}
    </template>
  </q-file>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  accept: { type: String, default: '.jpg,.jpeg,.png,.gif,.heic,.pdf' },
  maxSize: { type: Number, default: 5 * 1024 * 1024 },
  label: { type: String, default: 'Allega file' }
})

const emit = defineEmits(['file-selected', 'file-removed'])

const file = ref(null)

function onFileChange(val) {
  if (val) {
    emit('file-selected', val)
  } else {
    emit('file-removed')
  }
}
</script>
