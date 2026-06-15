<template>
  <q-dialog v-model="visible" persistent data-testid="progetto-detail-dialog">
    <q-card style="width: 100%; max-width: 900px; min-width: unset">
      <q-card-section>
        <div class="text-h6">
          {{ progetto.famiglia }}
        </div>
        <div class="text-body2 text-grey-7">
          {{ progetto.beneficiario }} — Anno {{ progetto.annoBando }}
        </div>
        <div class="text-caption text-grey-5">
          ID Progetto: {{ progetto.idProgetto }} | ID Famiglia: {{ progetto.idFamiglia }}
        </div>
      </q-card-section>
      <q-separator />

      <q-card-section>
        <div class="text-subtitle2 text-grey-8 q-mb-sm">
          Dati progetto
        </div>
        <div class="row q-col-gutter-md q-mb-sm">
          <div class="col-6">
            <div class="text-caption text-grey-7">Anno bando</div>
            <div>{{ progetto.annoBando || '—' }}</div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">Ambito</div>
            <div>{{ progetto.ambito || '—' }}</div>
          </div>
          <div class="col-12">
            <div class="text-caption text-grey-7">Titolo progetto</div>
            <div>{{ progetto.titolo || '—' }}</div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">Allocato</div>
            <div class="text-weight-medium">{{ formatCurrency(progetto.allocato) }}</div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">Stato rendicontazione</div>
            <q-badge :color="statoColor(progetto.statoRendicontazione)" outline>
              {{ statoLabel(progetto.statoRendicontazione) }}
            </q-badge>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">Data inizio</div>
            <div>{{ progetto.dataInizio || '—' }}</div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">Data fine</div>
            <div>{{ progetto.dataFine || '—' }}</div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">Età</div>
            <div>{{ progetto.eta || '—' }}</div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">Relazione con richiedente</div>
            <div>{{ progetto.relazioneRichiedente || '—' }}</div>
          </div>
        </div>
      </q-card-section>
      <q-separator />

      <q-card-section v-if="progetto.descrizioneProgetto || progetto.descrizioneCondizione || progetto.dettaglioCosti">
        <div class="text-subtitle2 text-grey-8 q-mb-sm">
          Descrizioni
        </div>
        <div v-if="progetto.descrizioneProgetto" class="q-mb-sm">
          <div class="text-caption text-grey-7">Descrizione progetto</div>
          <div class="text-body2" style="white-space: pre-wrap;">{{ progetto.descrizioneProgetto }}</div>
        </div>
        <div v-if="progetto.descrizioneCondizione" class="q-mb-sm">
          <div class="text-caption text-grey-7">Descrizione condizione</div>
          <div class="text-body2" style="white-space: pre-wrap;">{{ progetto.descrizioneCondizione }}</div>
        </div>
        <div v-if="progetto.dettaglioCosti" class="q-mb-sm">
          <div class="text-caption text-grey-7">Dettaglio costi</div>
          <div class="text-body2" style="white-space: pre-wrap;">{{ progetto.dettaglioCosti }}</div>
        </div>
      </q-card-section>
      <q-separator v-if="progetto.descrizioneProgetto || progetto.descrizioneCondizione || progetto.dettaglioCosti" />

      <q-card-section v-if="progetto.allegatiProgetto?.length || progetto.allegatiISEE?.length || progetto.allegatiGiustificativi?.length">
        <div class="text-subtitle2 text-grey-8 q-mb-sm">
          Allegati
        </div>
        <div v-if="progetto.allegatiProgetto?.length" class="q-mb-sm">
          <div class="text-caption text-grey-7">Progetto</div>
          <div v-for="f in progetto.allegatiProgetto" :key="f.directus_files_id?.id" class="q-ml-sm">
            <a :href="assetUrl(f.directus_files_id?.id)" target="_blank" class="text-body2">{{ f.directus_files_id?.filename_download || 'Apri' }}</a>
          </div>
        </div>
        <div v-if="progetto.allegatiISEE?.length" class="q-mb-sm">
          <div class="text-caption text-grey-7">ISEE</div>
          <div v-for="f in progetto.allegatiISEE" :key="f.directus_files_id?.id" class="q-ml-sm">
            <a :href="assetUrl(f.directus_files_id?.id)" target="_blank" class="text-body2">{{ f.directus_files_id?.filename_download || 'Apri' }}</a>
          </div>
        </div>
        <div v-if="progetto.allegatiGiustificativi?.length" class="q-mb-sm">
          <div class="text-caption text-grey-7">Giustificativi</div>
          <div v-for="f in progetto.allegatiGiustificativi" :key="f.directus_files_id?.id" class="q-ml-sm">
            <a :href="assetUrl(f.directus_files_id?.id)" target="_blank" class="text-body2">{{ f.directus_files_id?.filename_download || 'Apri' }}</a>
          </div>
        </div>
      </q-card-section>
      <q-separator v-if="progetto.allegatiProgetto?.length || progetto.allegatiISEE?.length || progetto.allegatiGiustificativi?.length" />

      <q-card-section>
        <div class="text-subtitle2 text-grey-8 q-mb-sm">
          Dati finanziari
        </div>
        <div class="row q-col-gutter-md">
          <div class="col-4">
            <div class="text-caption text-grey-7">N. giustificativi</div>
            <div class="text-weight-medium" data-testid="detail-totale-giustificativi">{{ progetto.giustificativi.length }}</div>
          </div>
          <div class="col-4">
            <div class="text-caption text-grey-7">Totale importo</div>
            <div class="text-weight-medium">{{ formatCurrency(progetto.totaleImporto) }}</div>
          </div>
          <div class="col-4">
            <div class="text-caption text-grey-7">Rendicontato</div>
            <div class="text-weight-medium text-primary">{{ formatCurrency(progetto.totaleRendicontato) }}</div>
          </div>
          <div class="col-4">
            <div class="text-caption text-grey-7">Rimborsabile 80%</div>
            <div class="text-weight-medium text-positive">{{ formatCurrency(progetto.totaleRimborsabile) }}</div>
          </div>
          <div class="col-4">
            <div class="text-caption text-grey-7">Residuo allocato</div>
            <div class="text-weight-medium">{{ formatCurrency(progetto.residuoAllocato) }}</div>
          </div>
        </div>
      </q-card-section>
      <q-separator />

      <q-card-section>
        <div class="text-subtitle2 text-grey-8 q-mb-sm">
          Dati bancari
        </div>
        <div class="row q-col-gutter-md">
          <div class="col-6">
            <div class="text-caption text-grey-7">IBAN</div>
            <div class="text-body2">{{ progetto.iban || '—' }}</div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">Intestatario CC</div>
            <div class="text-body2">{{ progetto.intestatario || '—' }}</div>
          </div>
        </div>
      </q-card-section>
      <q-separator />

      <q-card-section>
        <div class="text-subtitle2 text-grey-8 q-mb-sm">
          Giustificativi ({{ (progetto.giustificativi || []).length }})
        </div>
        <q-table
          v-if="(progetto.giustificativi || []).length > 0"
          flat
          dense
          :rows="progetto.giustificativi"
          :columns="giustColumns"
          row-key="id"
          hide-pagination
          data-testid="detail-giustificativi-table"
        >
          <template #body-cell-stato="props">
            <q-td :props="props">
              <q-badge :color="statoColor(props.value)" outline>
                {{ statoLabel(props.value) }}
              </q-badge>
            </q-td>
          </template>
          <template #body-cell-allegato="props">
            <q-td :props="props">
              <a
                v-if="props.value"
                :href="assetUrl(props.value)"
                target="_blank"
                class="text-body2"
              >Apri</a>
              <span v-else class="text-grey-5">—</span>
            </q-td>
          </template>
        </q-table>
        <div v-else class="text-grey-5 text-caption">
          Nessun giustificativo
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn v-close-popup flat label="Chiudi" color="primary" data-testid="detail-chiudi" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency } from 'src/utils/formatters'
import { statoLabel, statoColor } from 'src/utils/formatters'
import { assetUrl } from 'src/utils/assets'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  progetto: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const giustColumns = [
  { name: 'Descrizione', label: 'Descrizione', field: 'Descrizione', align: 'left' },
  { name: 'Importo', label: 'Importo', field: 'Importo', align: 'right', format: (v) => formatCurrency(v) },
  { name: 'Data', label: 'Data', field: 'Data', align: 'center' },
  { name: 'stato', label: 'Stato', field: 'Stato', align: 'center' },
  { name: 'allegato', label: 'Allegato', field: 'Allegato', align: 'center' }
]
</script>
