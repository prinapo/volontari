<template>
  <q-card flat bordered :class="showBancari ? '' : 'q-ma-sm'">
    <q-card-section :class="showBancari ? 'q-pa-sm' : ''">
      <template v-if="showBancari">
        <div class="row q-col-gutter-sm q-mb-sm">
          <div class="col-12">
            <InlineEditableField
              :model-value="row.IBAN"
              label="IBAN"
              :readonly="!canAdmin"
              :saving="savingField === `IBAN_${row.id_famiglia}`"
              history-collection="Famiglie"
              :history-item-id="row.id_famiglia"
              history-field="IBAN"
              :revisions="revisioni?.IBAN"
              @save="value => emit('inline-save', 'IBAN', value)"
            />
          </div>
          <div class="col-12">
            <InlineEditableField
              :model-value="row.Intestatario_CC"
              label="Intestatario CC"
              :readonly="!canAdmin"
              :saving="savingField === `Intestatario_CC_${row.id_famiglia}`"
              history-collection="Famiglie"
              :history-item-id="row.id_famiglia"
              history-field="Intestatario_CC"
              :revisions="revisioni?.Intestatario_CC"
              @save="value => emit('inline-save', 'Intestatario_CC', value)"
            />
          </div>
        </div>
        <q-separator class="q-mb-sm" />
      </template>

      <FamigliaContattiList
        :contatti="contatti"
        :loading="contattiLoading"
        @add="emit('add-contatti')"
        @remove="c => emit('remove-contatto', c)"
      />
    </q-card-section>
  </q-card>

  <div v-if="progettiLoading && !progetti" class="text-center q-py-md">
    <q-spinner size="sm" /> Caricamento progetti...
  </div>
  <q-card v-else-if="progetti?.length" flat bordered class="q-mt-sm">
    <q-card-section class="q-pa-sm">
      <div class="text-caption text-grey-7 q-mb-sm">Progetti ({{ progetti.length }})</div>
      <ProgettoDetailPanel
        v-for="prog in progetti"
        :key="prog.id_progetto"
        :prog="prog"
        :can-admin="canAdmin"
        :saving="salvandoProgId === prog.id_progetto"
        class="q-mb-sm"
        @save-field="(field, value) => emit('save-field', prog, field, value)"
        @save-percentuale="value => emit('save-percentuale', prog, value)"
      />
    </q-card-section>
  </q-card>
  <div v-else-if="!progettiLoading && !progetti" class="text-grey q-py-sm">Nessun progetto per questa famiglia.</div>
</template>

<script setup>
import InlineEditableField from 'components/Common/InlineEditableField.vue'
import FamigliaContattiList from 'components/Gestione/FamigliaContattiList.vue'
import ProgettoDetailPanel from 'components/Gestione/ProgettoDetailPanel.vue'

defineProps({
  row: { type: Object, required: true },
  canAdmin: { type: Boolean, default: false },
  showBancari: { type: Boolean, default: false },
  savingField: { type: String, default: null },
  revisioni: { type: Object, default: null },
  contatti: { type: Array, default: () => [] },
  contattiLoading: { type: Boolean, default: false },
  progetti: { type: Array, default: null },
  progettiLoading: { type: Boolean, default: false },
  salvandoProgId: { type: [String, Number], default: null }
})

const emit = defineEmits([
  'inline-save',
  'add-contatti',
  'remove-contatto',
  'save-field',
  'save-percentuale'
])
</script>
