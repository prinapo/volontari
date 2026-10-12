<template>
  <div>
    <div class="text-subtitle2 text-grey-8 q-mb-xs">Dati bancari</div>
    <div v-if="intestatario" class="text-caption text-grey-7 q-mb-xs">
      Intestatario: {{ intestatario }}
    </div>
    <div class="row items-center q-gutter-xs">
      <q-badge :color="iban && intestatario ? 'positive' : 'warning'" outline>
        {{ iban && intestatario ? 'Completi' : 'Da completare' }}
      </q-badge>
      <span class="text-body2">{{ iban || 'IBAN mancante' }}</span>
      <q-btn
        flat
        round
        dense
        size="sm"
        icon="edit"
        color="grey-6"
        data-testid="btn-edit-bancari"
        aria-label="Modifica dati bancari"
        @click="$emit('edit')"
      >
        <q-tooltip>Modifica dati bancari</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<script setup>
defineProps({
  iban: { type: String, default: '' },
  intestatario: { type: String, default: '' }
})

defineEmits(['edit'])
</script>