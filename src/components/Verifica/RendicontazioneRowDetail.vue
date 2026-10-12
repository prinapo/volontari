<template>
  <div>
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-6">
        <DatiBancariPanel :iban="row.iban" :intestatario="row.intestatario" @edit="$emit('edit-bancari')" />
      </div>
      <div class="col-6">
        <div class="text-subtitle2 text-grey-8 q-mb-xs">Rimborsabile {{ row.percentualeRimborso }}%</div>
        <div class="text-positive text-weight-medium">
          {{ formatCurrency(row.totaleRimborsabile) }}
        </div>
      </div>
    </div>

    <div class="row items-center q-gutter-x-sm q-mb-sm">
      <div class="text-caption text-grey-7">Pagato:</div>
      <div class="text-body2 text-weight-medium">{{ formatCurrency(row.totalePagato) }}</div>
      <div class="text-caption text-grey-7">/ {{ formatCurrency(row.allocato) }}</div>
      <q-space />
      <q-badge :color="statoProgettoColor(row.statoProgetto)" outline>
        {{ statoProgettoLabel(row.statoProgetto) }}
      </q-badge>
    </div>
    <div v-if="statoRiga" class="row items-center q-gutter-x-sm q-mb-sm">
      <q-badge :color="statoRiga.color">
        {{ statoRiga.label }}
      </q-badge>
    </div>
    <q-separator class="q-mb-md" />

    <ContattiFamigliaPanel :genitori="genitori" :volontari="volontari" :loading="contattiLoading" />
    <q-separator class="q-mt-sm" />

    <div class="text-subtitle2 text-grey-8 q-mb-sm q-mt-md">
      Giustificativi — {{ row.annoBando || 'N/A' }}
    </div>
    <template v-if="row.giustificativi?.length">
      <GiustificativoRow
        v-for="g in row.giustificativi"
        :key="g.id"
        :g="g"
        :layout="giustLayout"
        :can-verifica="canVerifica"
        :saving-field="savingField"
        :verifying-id="verifyingId"
        @save-field="(field, val) => $emit('save-field', g, field, val)"
        @verify="$emit('verify', g)"
        @reject="$emit('reject', g)"
        @revert="$emit('revert', g)"
        @send-draft="$emit('send-draft', g)"
      />
    </template>
    <div v-else class="text-caption text-grey q-mt-sm">Nessun giustificativo presente.</div>

    <div class="q-mt-md">
      <NoteProgettoPanel :progetto-id="row.idProgetto" />
    </div>
  </div>
</template>

<script setup>
import ContattiFamigliaPanel from 'components/Common/ContattiFamigliaPanel.vue'
import DatiBancariPanel from 'components/Common/DatiBancariPanel.vue'
import GiustificativoRow from 'src/components/Giustificativi/GiustificativoRow.vue'
import NoteProgettoPanel from 'src/components/Note/NoteProgettoPanel.vue'
import { statoProgettoColor, statoProgettoLabel } from 'src/utils/badges'
import { formatCurrency } from 'src/utils/formatters'

defineProps({
  row: { type: Object, required: true },
  canVerifica: { type: Boolean, default: false },
  genitori: { type: Array, default: undefined },
  volontari: { type: Array, default: undefined },
  contattiLoading: { type: Boolean, default: false },
  savingField: { type: [String, null], default: null },
  verifyingId: { type: [String, Number, null], default: null },
  giustLayout: { type: String, default: 'cards' },
  statoRiga: { type: Object, default: null }
})

defineEmits(['edit-bancari', 'save-field', 'verify', 'reject', 'revert', 'send-draft'])
</script>