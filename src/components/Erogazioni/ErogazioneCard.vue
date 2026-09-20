<template>
  <q-card flat bordered class="q-mb-md" :data-testid="'erogazione-card-' + item.id">
    <q-card-section class="q-pa-md">
      <div class="row items-center q-gutter-sm q-mb-sm">
        <q-badge :color="statoPagamentoColor(item.Stato)" class="text-uppercase q-pa-xs">
          {{ statoPagamentoLabel(item.Stato) }}
        </q-badge>
        <q-space />
        <div class="text-h6 text-primary">{{ formatCurrency(item.Importo) }}</div>
      </div>
    </q-card-section>
    <q-separator />
    <q-card-section class="q-gutter-y-sm q-pa-md">
      <div class="row items-center">
        <div class="text-caption text-grey col-6">Data proposta</div>
        <div class="text-body2 text-right col-6">{{ formatDate(item.DataProposta) }}</div>
      </div>
      <div v-if="item.DataPagamento" class="row items-center">
        <div class="text-caption text-grey col-6">Data pagamento</div>
        <div class="text-body2 text-right col-6">{{ formatDate(item.DataPagamento) }}</div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { statoPagamentoColor, statoPagamentoLabel } from 'src/utils/badges'
import { formatCurrency, formatDate } from 'src/utils/formatters'

defineProps({
  item: { type: Object, required: true }
})
</script>
