<template>
  <q-expansion-item dense dense-toggle expand-separator header-class="expansion-header">
    <template #header>
      <q-item-section>
        <q-item-label>
          {{ prog.AnnoBando }} — {{ prog.Cognome_Beneficiario }} {{ prog.Nome_Beneficiario }}
          <q-badge :color="prog.StatoProgetto === 'chiuso' ? 'grey-6' : 'positive'" outline class="q-ml-sm">
            {{ prog.StatoProgetto === 'chiuso' ? 'Chiuso' : 'Aperto' }}
          </q-badge>
        </q-item-label>
        <q-item-label caption>
          Allocato {{ formatCurrencyOrDash(prog.Allocato) }}
          <span v-if="prog.MassimaPercentualeErogabile != null"> — {{ prog.MassimaPercentualeErogabile }}%</span>
          <span v-else> — 80% (default)</span>
        </q-item-label>
      </q-item-section>
    </template>
    <q-card flat bordered>
      <q-card-section class="q-pa-sm text-break">
        <q-separator class="q-mb-sm" />
        <div class="row q-col-gutter-sm">
          <div class="col-6 col-sm-3">
            <InlineEditableField :model-value="prog.Cognome_Beneficiario || ''" label="Cognome" :readonly="!canAdmin" @save="v => save('Cognome_Beneficiario', v)" />
          </div>
          <div class="col-6 col-sm-3">
            <InlineEditableField :model-value="prog.Nome_Beneficiario || ''" label="Nome" :readonly="!canAdmin" @save="v => save('Nome_Beneficiario', v)" />
          </div>
          <div class="col-6 col-sm-3">
            <InlineEditableField :model-value="prog.Eta" label="Età" :readonly="!canAdmin" @save="v => save('Eta', v)" />
          </div>
          <div class="col-6 col-sm-3">
            <InlineEditableField :model-value="prog.AnnoBando" label="Anno bando" :readonly="!canAdmin" @save="v => save('AnnoBando', v)" />
          </div>
          <div class="col-auto">
            <InlineEditableField :model-value="prog.Titolo_Progetto || ''" label="Titolo progetto" :readonly="!canAdmin" @save="v => save('Titolo_Progetto', v)" />
          </div>
          <div class="col-6 col-sm-3">
            <InlineEditableField :model-value="prog.Ambito || ''" label="Ambito" :readonly="!canAdmin" @save="v => save('Ambito', v)" />
          </div>
        </div>
        <div class="row">
          <div class="col-12 col-sm-6">
            <q-list dense class="q-mt-sm">
              <q-item dense class="q-px-none q-py-xs">
                <q-item-section class="col-7 col-sm-8"><div class="text-caption text-grey">Costo annuale</div></q-item-section>
                <q-item-section side class="col-5 col-sm-4"><div class="text-body2 text-right">{{ formatCurrencyOrDash(prog.Costo_Annuale) }}</div></q-item-section>
              </q-item>
              <q-item dense class="q-px-none q-py-xs">
                <q-item-section class="col-7 col-sm-8"><div class="text-caption text-grey">Altri finanziamenti</div></q-item-section>
                <q-item-section side class="col-5 col-sm-4"><div class="text-body2 text-right">{{ formatCurrencyOrDash(prog.Altri_Fianziamenti) }}</div></q-item-section>
              </q-item>
              <q-item dense class="q-px-none q-py-xs">
                <q-item-section class="col-7 col-sm-8"><div class="text-caption text-grey">Carico famiglia</div></q-item-section>
                <q-item-section side class="col-5 col-sm-4"><div class="text-body2 text-right">{{ formatCurrencyOrDash(prog.Costo_Carico_Famiglia) }}</div></q-item-section>
              </q-item>
              <q-item dense class="q-px-none q-py-xs">
                <q-item-section class="col-7 col-sm-8"><div class="text-caption text-grey">Erogazione richiesta</div></q-item-section>
                <q-item-section side class="col-5 col-sm-4"><div class="text-body2 text-right">{{ formatCurrencyOrDash(prog.Erogazione_Richiesta) }}</div></q-item-section>
              </q-item>
              <q-item dense class="q-px-none q-py-xs">
                <q-item-section class="col-7 col-sm-8"><div class="text-caption text-grey">Allocato</div></q-item-section>
                <q-item-section side class="col-5 col-sm-4"><div class="text-body2 text-right">{{ formatCurrencyOrDash(prog.Allocato) }}</div></q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
        <div class="row q-col-gutter-sm">
          <div class="col-6 col-sm-3">
            <InlineEditableField :model-value="prog.Interstatario_CC || ''" label="Intestatario CC" :readonly="!canAdmin" @save="v => save('Interstatario_CC', v)" />
          </div>
          <div class="col-6 col-sm-3">
            <InlineEditableField :model-value="prog.IBAN || ''" label="IBAN" :readonly="!canAdmin" @save="v => save('IBAN', v)" />
          </div>
          <div class="col-6 col-sm-3">
            <InlineEditableField :model-value="prog.ISEE" label="ISEE" :readonly="!canAdmin" @save="v => save('ISEE', v)" />
          </div>
          <div class="col-6 col-sm-3">
            <InlineEditableField :model-value="prog.Indice_ISEE" label="Indice ISEE" :readonly="!canAdmin" @save="v => save('Indice_ISEE', v)" />
          </div>
          <div class="col-6 col-sm-3">
            <InlineEditableField :model-value="prog.Indice_Gravita_Disabilita" label="Indice gravità disabilità" :readonly="!canAdmin" @save="v => save('Indice_Gravita_Disabilita', v)" />
          </div>
          <div class="col-6 col-sm-3">
            <InlineEditableField :model-value="prog.Punteggio_Complessivo || ''" label="Punteggio complessivo" :readonly="!canAdmin" @save="v => save('Punteggio_Complessivo', v)" />
          </div>
          <div class="col-6 col-sm-3">
            <InlineEditableField :model-value="prog.Data_Inizio_Progetto || ''" label="Data inizio" :readonly="!canAdmin" @save="v => save('Data_Inizio_Progetto', v)" />
          </div>
          <div class="col-6 col-sm-3">
            <InlineEditableField :model-value="prog.Data_Fine_Progetto || ''" label="Data fine" :readonly="!canAdmin" @save="v => save('Data_Fine_Progetto', v)" />
          </div>
          <div class="col-6 col-sm-3">
            <InlineEditableField :model-value="prog.DataChiusura || ''" label="Data chiusura" :readonly="!canAdmin" @save="v => save('DataChiusura', v)" />
          </div>
          <div class="col-6 col-sm-3">
            <InlineEditableField :model-value="prog.MotivoChiusura || ''" label="Motivo chiusura" :readonly="!canAdmin" @save="v => save('MotivoChiusura', v)" />
          </div>
          <div class="col-6 col-sm-3">
            <InlineEditableField :model-value="prog.StatoRendicontazione || ''" label="Stato rendicontazione" readonly />
          </div>
          <div class="col-6 col-sm-3">
            <InlineEditableField :model-value="prog.Relazione_con_il_soggetto_richiedente || ''" label="Relazione con richiedente" :readonly="!canAdmin" @save="v => save('Relazione_con_il_soggetto_richiedente', v)" />
          </div>
        </div>
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-12">
            <InlineEditableField :model-value="prog.Descrizione_Progetto || ''" label="Descrizione progetto" type="textarea" :readonly="!canAdmin" @save="v => save('Descrizione_Progetto', v)" />
          </div>
          <div class="col-12 col-sm-12">
            <InlineEditableField :model-value="prog.Descrizione_Condizione || ''" label="Descrizione condizione" type="textarea" :readonly="!canAdmin" @save="v => save('Descrizione_Condizione', v)" />
          </div>
          <div class="col-12 col-sm-12">
            <InlineEditableField :model-value="prog.Dettaglio_Costi || ''" label="Dettaglio costi" type="textarea" :readonly="!canAdmin" @save="v => save('Dettaglio_Costi', v)" />
          </div>
        </div>
        <div class="row q-col-gutter-sm">
          <div class="col-6 col-sm-3">
            <q-checkbox :model-value="prog.Progetto_Sostegno_Scolastico" label="Sostegno scolastico" dense @update:model-value="v => save('Progetto_Sostegno_Scolastico', v)" />
          </div>
          <div class="col-6 col-sm-3">
            <q-checkbox :model-value="prog.Continuazione" label="Continuazione" dense @update:model-value="v => save('Continuazione', v)" />
          </div>
          <div class="col-6 col-sm-3">
            <div class="text-caption text-grey-7 q-mb-xs">Massimo erogabile</div>
            <q-input
              :model-value="prog.MassimaPercentualeErogabile"
              type="number"
              dense
              outlined
              min="0"
              max="100"
              step="1"
              suffix="%"
              :loading="saving"
              @update:model-value="v => emit('save-percentuale', v)"
            />
          </div>
        </div>
        <q-separator class="q-my-sm" />
        <div class="text-caption text-grey-7">Dati calcolati automaticamente</div>
        <q-list dense class="q-mt-xs">
          <q-item dense class="q-px-none q-py-xs">
            <q-item-section class="col-7 col-sm-8"><div class="text-caption text-grey">Totale importo</div></q-item-section>
            <q-item-section side class="col-5 col-sm-4"><div class="text-body2 text-right">{{ formatCurrency(prog.TotaleImporto) }}</div></q-item-section>
          </q-item>
          <q-item dense class="q-px-none q-py-xs">
            <q-item-section class="col-7 col-sm-8"><div class="text-caption text-grey">Totale verificato</div></q-item-section>
            <q-item-section side class="col-5 col-sm-4"><div class="text-body2 text-right">{{ formatCurrency(prog.TotaleVerificato) }}</div></q-item-section>
          </q-item>
          <q-item dense class="q-px-none q-py-xs">
            <q-item-section class="col-7 col-sm-8"><div class="text-caption text-grey">Totale proposto</div></q-item-section>
            <q-item-section side class="col-5 col-sm-4"><div class="text-body2 text-right">{{ formatCurrency(prog.TotaleProposto) }}</div></q-item-section>
          </q-item>
          <q-item dense class="q-px-none q-py-xs">
            <q-item-section class="col-7 col-sm-8"><div class="text-caption text-grey">Totale pagato</div></q-item-section>
            <q-item-section side class="col-5 col-sm-4"><div class="text-body2 text-right">{{ formatCurrency(prog.TotalePagato) }}</div></q-item-section>
          </q-item>
          <q-item dense class="q-px-none q-py-xs">
            <q-item-section class="col-7 col-sm-8"><div class="text-caption text-grey">Residuo allocato</div></q-item-section>
            <q-item-section side class="col-5 col-sm-4"><div class="text-body2 text-right">{{ formatCurrency(prog.ResiduoAllocato) }}</div></q-item-section>
          </q-item>
          <q-item dense class="q-px-none q-py-xs">
            <q-item-section class="col-7 col-sm-8"><div class="text-caption text-grey">Totale pagamento</div></q-item-section>
            <q-item-section side class="col-5 col-sm-4"><div class="text-body2 text-right">{{ formatCurrency(prog.TotalePagamento) }}</div></q-item-section>
          </q-item>
          <q-item dense class="q-px-none q-py-xs">
            <q-item-section class="col-7 col-sm-8"><div class="text-caption text-grey">Totale giustificativi</div></q-item-section>
            <q-item-section side class="col-5 col-sm-4"><div class="text-body2 text-right">{{ prog.TotaleGiustificativi ?? 0 }}</div></q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-expansion-item>
</template>

<script setup>
import InlineEditableField from 'components/Common/InlineEditableField.vue'
import { formatCurrency, formatCurrencyOrDash } from 'src/utils/formatters'

defineProps({
  prog: { type: Object, required: true },
  canAdmin: { type: Boolean, default: false },
  saving: { type: Boolean, default: false }
})

const emit = defineEmits(['save-field', 'save-percentuale'])

function save(field, value) {
  emit('save-field', field, value)
}
</script>