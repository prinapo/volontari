<template>
  <!-- layout 'cards': usato nella card mobile (#item) di RendicontazioneTab -->
  <q-card v-if="layout === 'cards'" flat bordered>
    <q-card-section class="q-pa-sm">
      <div class="row q-col-gutter-xs items-start">
        <div class="col-12">
          <InlineEditableField
            :model-value="g.Descrizione"
            label="Descrizione"
            type="text"
            :readonly="!canVerifica || g.Stato !== 'inviato'"
            :saving="isSaving('Descrizione')"
            @save="val => $emit('save-field', 'Descrizione', val)"
          />
          <div v-if="g.NotaVolontario" class="text-caption text-grey-6 ellipsis-2">
            {{ g.NotaVolontario }}
          </div>
        </div>

        <div class="col-6 col-sm-3">
          <InlineEditableField
            :model-value="g.Importo"
            label="Importo"
            type="number"
            :readonly="!canVerifica || g.Stato !== 'inviato'"
            :format-display="v => formatCurrency(v)"
            :saving="isSaving('Importo')"
            @save="val => $emit('save-field', 'Importo', parseFloat(val))"
          />
        </div>
        <div class="col-6 col-sm-3">
          <InlineEditableField
            :model-value="g.Data"
            label="Data"
            type="date"
            :readonly="!canVerifica || g.Stato !== 'inviato'"
            :format-display="v => formatDate(v) || '—'"
            :saving="isSaving('Data')"
            @save="val => $emit('save-field', 'Data', val)"
          />
        </div>
        <div class="col-6 col-sm-3">
          <div class="text-caption text-grey">Allegato</div>
          <AllegatoButtons :allegato="g.Allegato" />
        </div>
        <div class="col-3 col-sm-1">
          <q-badge :color="statoColor(g.Stato)" outline>
            {{ statoLabel(g.Stato) }}
          </q-badge>
        </div>
        <div class="col-12 col-sm-5">
          <GiustificativoActions
            :g="g"
            :verifying-id="verifyingId"
            @save-draft="$emit('send-draft')"
            @verify="$emit('verify')"
            @reject="$emit('reject')"
            @revert="$emit('revert')"
          />
        </div>
      </div>
    </q-card-section>
  </q-card>

  <!-- layout 'list': usato nella riga espansa desktop -->
  <q-item v-else class="giust-item">
    <q-item-section class="col-3">
      <InlineEditableField
        :model-value="g.Descrizione"
        label="Descrizione"
        type="text"
        :readonly="!canVerifica || g.Stato !== 'inviato'"
        :saving="isSaving('Descrizione')"
        @save="val => $emit('save-field', 'Descrizione', val)"
      />
      <div v-if="g.NotaVolontario" class="text-caption text-grey-6 q-mt-xs ellipsis-2">
        {{ g.NotaVolontario }}
      </div>
    </q-item-section>

    <q-item-section class="col-2">
      <InlineEditableField
        :model-value="g.Importo"
        label="Importo"
        type="number"
        :readonly="!canVerifica || g.Stato !== 'inviato'"
        :format-display="v => formatCurrency(v)"
        :saving="isSaving('Importo')"
        @save="val => $emit('save-field', 'Importo', parseFloat(val))"
      />
    </q-item-section>

    <q-item-section class="col-2">
      <InlineEditableField
        :model-value="g.Data"
        label="Data"
        type="date"
        :readonly="!canVerifica || g.Stato !== 'inviato'"
        :format-display="v => formatDate(v) || '—'"
        :saving="isSaving('Data')"
        @save="val => $emit('save-field', 'Data', val)"
      />
    </q-item-section>

    <q-item-section class="col-2">
      <AllegatoButtons :allegato="g.Allegato" />
    </q-item-section>

    <q-item-section class="col-1">
      <q-badge :color="statoColor(g.Stato)" outline>
        {{ statoLabel(g.Stato) }}
      </q-badge>
    </q-item-section>

    <q-item-section class="col-2">
      <GiustificativoActions
        :g="g"
        :verifying-id="verifyingId"
        @save-draft="$emit('send-draft')"
        @verify="$emit('verify')"
        @reject="$emit('reject')"
        @revert="$emit('revert')"
      />
    </q-item-section>
  </q-item>
</template>

<script setup>
import AllegatoButtons from 'components/Common/AllegatoButtons.vue'
import InlineEditableField from 'components/Common/InlineEditableField.vue'
import GiustificativoActions from 'src/components/Verifica/GiustificativoActions.vue'
import { statoColor, statoLabel } from 'src/utils/badges'
import { formatCurrency, formatDate } from 'src/utils/formatters'

const props = defineProps({
  g: { type: Object, required: true },
  layout: { type: String, default: 'cards' },
  canVerifica: { type: Boolean, default: false },
  savingField: { type: [String, null], default: null },
  verifyingId: { type: [String, Number, null], default: null }
})

defineEmits(['save-field', 'verify', 'reject', 'revert', 'send-draft'])

function isSaving(field) {
  return props.savingField === `${props.g.id}-${field}`
}
</script>