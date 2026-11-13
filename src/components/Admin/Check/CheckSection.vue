<template>
  <q-banner v-if="check" class="bg-grey-2 text-dark rounded-borders" :class="bannerClass" rounded>
    <template #avatar>
      <q-icon :name="icon" color="primary" />
    </template>
    <div class="text-weight-medium q-mb-xs">{{ title }}</div>
    <div class="text-body2 text-grey-7 q-mb-sm">
      <slot name="summary" />
    </div>
    <slot />
    <template #action>
      <q-btn
flat
round
dense
size="sm"
icon="refresh"
:loading="loading"
@click="emit('run')">
        <q-tooltip>Riesegui verifica</q-tooltip>
      </q-btn>
    </template>
  </q-banner>

  <q-btn
    v-else
    flat
    round
    dense
    size="sm"
    :icon="icon"
    color="primary"
    :class="buttonClass"
    :loading="loading"
    @click="emit('run')"
  >
    {{ checkLabel }}
  </q-btn>
</template>

<script setup>
const emit = defineEmits(['run'])

defineProps({
  check: { type: Boolean, default: false },
  icon: { type: String, required: true },
  title: { type: String, required: true },
  checkLabel: { type: String, required: true },
  loading: { type: Boolean, default: false },
  bannerClass: { type: String, default: '' },
  buttonClass: { type: String, default: '' }
})
</script>
