<template>
  <div v-if="g.Stato === 'inviato'" class="row q-gutter-xs">
    <q-btn
      dense
      flat
      icon="check_circle"
      :color="ACTION_VERIFY"
      size="sm"
      data-testid="btn-verify"
      aria-label="Verifica"
      :loading="verifyingId === g.id"
      @click="$emit('verify')"
    >
      <q-tooltip>Verifica</q-tooltip>
    </q-btn>
    <q-btn
      dense
      flat
      icon="cancel"
      :color="ACTION_REJECT"
      size="sm"
      data-testid="btn-reject"
      aria-label="Rifiuta"
      :loading="verifyingId === g.id"
      @click="$emit('reject')"
    >
      <q-tooltip>Rifiuta</q-tooltip>
    </q-btn>
  </div>

  <div v-else-if="g.Stato === 'verificato'" class="row items-center q-gutter-xs">
    <q-icon name="check_circle" size="sm" color="positive" />
    <span class="text-body2 text-positive">Verificato</span>
    <q-btn
      flat
      dense
      round
      size="sm"
      icon="undo"
      color="grey"
      aria-label="Ripristina"
      @click="$emit('revert')"
    >
      <q-tooltip>Ripristina come 'inviato'</q-tooltip>
    </q-btn>
  </div>

  <div v-else-if="g.Stato === 'rifiutato'">
    <div class="row items-center q-gutter-xs">
      <q-icon name="cancel" size="sm" color="negative" />
      <span class="text-body2 text-negative">Rifiutato</span>
      <q-btn
        flat
        dense
        round
        size="sm"
        icon="undo"
        color="grey"
        aria-label="Ripristina"
        @click="$emit('revert')"
      >
        <q-tooltip>Ripristina come 'inviato'</q-tooltip>
      </q-btn>
    </div>
    <div v-if="g.NotaRifiuto" class="text-caption text-grey-7 q-mt-xs">
      {{ g.NotaRifiuto }}
    </div>
  </div>

  <div v-else-if="g.Stato === 'draft'" class="row q-gutter-xs">
    <q-btn
      dense
      flat
      icon="send"
      color="primary"
      size="sm"
      data-testid="btn-send"
      aria-label="Invia"
      :loading="verifyingId === g.id"
      @click="$emit('save-draft')"
    >
      <q-tooltip>Invia</q-tooltip>
    </q-btn>
  </div>
</template>

<script setup>
import { ACTION_REJECT, ACTION_VERIFY } from 'src/utils/badges'

defineProps({
  g: { type: Object, required: true },
  verifyingId: { type: [String, Number, null], default: null }
})

defineEmits(['verify', 'reject', 'revert', 'save-draft'])
</script>