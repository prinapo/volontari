<template>
  <q-badge v-if="fileOk === true" color="positive">OK</q-badge>
  <q-badge v-else-if="fileOk === false" color="negative">KO</q-badge>
  <span v-else class="text-grey-6">—</span>
</template>

<script setup>
defineProps({
  fileOk: { type: [Boolean, null], default: null }
})
</script>