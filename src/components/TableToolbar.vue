<template>
  <div class="row items-center q-gutter-sm">
    <!-- Search + refresh pair (solo se search prop è passata) -->
    <div v-if="search !== undefined" class="col-12 col-sm">
      <div class="row items-center q-gutter-sm">
        <q-btn
          v-if="refresh"
          flat
          round
          dense
          size="sm"
          icon="refresh"
          :loading="loading"
          :data-testid="refreshTestId"
          aria-label="Aggiorna"
          @click="$emit('refresh')"
        >
          <q-tooltip>Aggiorna</q-tooltip>
        </q-btn>
        <q-input
          :model-value="search"
          dense
          outlined
          :placeholder="searchPlaceholder"
          :aria-label="searchAriaLabel"
          clearable
          debounce="300"
          class="col-12 col-sm"
          @update:model-value="$emit('update:search', $event)"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
    </div>

    <!-- Refresh standalone (senza search) -->
    <q-btn
      v-else-if="refresh"
      flat
      round
      dense
      size="sm"
      icon="refresh"
      :loading="loading"
      :data-testid="refreshTestId"
      aria-label="Aggiorna"
      @click="$emit('refresh')"
    >
      <q-tooltip>Aggiorna</q-tooltip>
    </q-btn>

    <!-- Filtri slot -->
    <slot name="filters" />

    <q-space class="gt-xs" />
  </div>
</template>

<script setup>
defineProps({
  search: { type: String, default: undefined },
  searchPlaceholder: { type: String, default: 'Cerca...' },
  searchAriaLabel: { type: String, default: 'Cerca' },
  loading: { type: Boolean, default: false },
  refresh: { type: Boolean, default: false },
  refreshTestId: { type: String, default: undefined }
})

defineEmits(['update:search', 'refresh'])
</script>
