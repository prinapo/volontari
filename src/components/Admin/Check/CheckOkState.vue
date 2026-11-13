<template>
  <div class="text-center q-py-md">
    <q-icon name="check_circle" color="positive" size="48px" />
    <div class="text-h6 text-positive q-mt-sm">{{ message }}</div>
    <div v-if="caption" class="text-body2 text-grey-7">{{ caption }}</div>
  </div>
</template>

<script setup>
defineProps({
  message: { type: String, default: 'Nessuna anomalia trovata' },
  caption: { type: String, default: '' }
})
</script>
