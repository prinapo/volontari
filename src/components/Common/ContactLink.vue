<template>
  <q-btn
    v-if="value"
    flat
    dense
    no-caps
    size="sm"
    color="primary"
    :href="href"
    class="text-caption q-pa-none"
    :label="value"
  />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: v => ['email', 'tel'].includes(v)
  },
  value: {
    type: String,
    default: null
  }
})

const href = computed(() => (props.type === 'email' ? `mailto:${props.value}` : `tel:${props.value}`))
</script>
