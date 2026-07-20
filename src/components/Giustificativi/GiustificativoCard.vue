<template>
  <q-card flat bordered class="q-mb-md" :data-testid="'giustificativo-card-' + item.id">
    <q-card-section class="q-pa-md">
      <div class="row items-center q-gutter-sm q-mb-sm">
        <q-badge :color="statoColor(item.Stato)" class="text-uppercase q-pa-xs">
          {{ statoLabel(item.Stato) }}
        </q-badge>
        <q-space />
        <q-btn
v-if="canEdit"
icon="send"
color="primary"
flat
dense
label="Invia"
@click="$emit('submit', item)" />
        <q-btn
v-if="canEdit"
icon="delete"
flat
dense
color="negative"
label="Elimina"
@click="confirmDelete" />
      </div>
    </q-card-section>
    <q-separator />
    <q-card-section class="q-gutter-y-md q-pa-md">
      <InlineEditableField
        :model-value="item.Descrizione"
        label="Descrizione"
        :readonly="!canEdit"
        @save="val => $emit('save-field', { id: item.id, field: 'Descrizione', value: val })"
      />

      <div class="row q-gutter-x-md">
        <div class="col-xs-12 col-sm-4">
          <InlineEditableField
            :model-value="item.Importo"
            label="Importo"
            type="number"
            :readonly="!canEdit"
            :format-display="formatCurrency"
            @save="val => $emit('save-field', { id: item.id, field: 'Importo', value: parseFloat(val) || 0 })"
          />
        </div>
        <div class="col-xs-12 col-sm-6">
          <InlineEditableField
            :model-value="item.Data"
            label="Data"
            type="date"
            :readonly="!canEdit"
            :format-display="formatDate"
            @save="val => $emit('save-field', { id: item.id, field: 'Data', value: val })"
          />
        </div>
      </div>

      <!-- Attachment -->
      <div>
        <div class="text-caption text-grey q-mb-xs">Allegato</div>
        <div class="row items-center q-gutter-sm">
          <template v-if="item.Allegato">
            <span class="text-caption text-grey-7 q-mr-xs">{{ item.Allegato.filename_download || 'File' }}</span>
            <q-btn
              :href="allegatoUrl(item.Allegato)"
              target="_blank"
              type="a"
              flat
              dense
              round
              icon="open_in_new"
              size="sm"
              aria-label="Apri allegato"
            >
              <q-tooltip>Apri allegato</q-tooltip>
            </q-btn>
            <q-btn
              :href="downloadUrl(item.Allegato)"
              type="a"
              flat
              dense
              round
              icon="file_download"
              size="sm"
              aria-label="Scarica allegato"
            >
              <q-tooltip>Scarica allegato</q-tooltip>
            </q-btn>
          </template>
          <span v-else class="text-grey-5 text-italic">Nessun allegato</span>

          <GiustificativoFilePicker
            v-if="canEdit"
            v-model="newFile"
            @update:model-value="onFileChange"
          />
        </div>
      </div>
      <div
        v-if="item.Stato === 'rifiutato' && item.NotaRifiuto"
        class="bg-red-1 q-pa-sm q-mx-md q-mb-md rounded-borders"
      >
        <div class="text-caption text-negative text-weight-medium q-mb-xs">Motivazione del rifiuto</div>
        <div class="text-body2">
          {{ item.NotaRifiuto }}
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref } from 'vue'
import InlineEditableField from 'components/Common/InlineEditableField.vue'
import GiustificativoFilePicker from './GiustificativoFilePicker.vue'
import { assetUrl } from 'src/utils/assets'
import { FILE_ACCEPT } from 'src/utils/constants'
import { formatCurrency, formatDate, statoLabel, statoColor } from 'src/utils/formatters'

const $q = useQuasar()

const props = defineProps({
  item: { type: Object, required: true },
  canEdit: { type: Boolean, default: false }
})

const emit = defineEmits(['save-field', 'submit', 'file-change', 'invalida'])

const newFile = ref(null)

function allegatoUrl(fileId) {
  return assetUrl(fileId)
}

function downloadUrl(fileId) {
  return assetUrl(fileId, true)
}

function confirmDelete() {
  $q.dialog({
    title: 'Eliminare giustificativo?',
    message: 'Il giustificativo verrà nascosto ma i dati rimarranno salvati.',
    cancel: { label: 'Annulla', flat: true },
    ok: { label: 'Elimina', color: 'negative' },
    persistent: true
  }).onOk(() => {
    emit('invalida', props.item.id)
  })
}

function onFileChange(file) {
  if (file) {
    emit('file-change', { id: props.item.id, file })
    newFile.value = null
  }
}
</script>
