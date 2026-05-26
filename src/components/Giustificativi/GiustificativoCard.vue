<template>
  <q-card flat bordered class="q-mb-md">
    <q-card-section class="q-pa-md">
      <div class="row items-center q-gutter-sm q-mb-sm">
        <q-badge
          :color="statoColor(item.Stato)"
          class="text-uppercase q-pa-xs"
        >
          {{ statoLabel(item.Stato) }}
        </q-badge>
        <q-badge
          v-if="trancheLabel"
          color="teal"
          outline
          class="text-uppercase q-pa-xs"
        >
          {{ trancheLabel }}
        </q-badge>
        <q-space />
        <q-btn
          v-if="canEdit"
          icon="send"
          flat
          dense
          color="primary"
          label="Invia"
          @click="$emit('submit', item)"
        />
        <q-btn
          v-if="canEdit"
          icon="delete"
          flat
          dense
          color="negative"
          label="Elimina"
          @click="confirmDelete"
        />
      </div>
    </q-card-section>
    <q-separator />
    <q-card-section class="q-gutter-y-md q-pa-md">
      <InlineEditableField
        :model-value="item.Descrizione"
        label="Descrizione"
        :readonly="!canEdit"
        @save="(val) => $emit('save-field', { id: item.id, field: 'Descrizione', value: val })"
      />

      <div class="row q-gutter-x-md">
        <div class="col-xs-12 col-sm-4">
          <InlineEditableField
            :model-value="item.Importo"
            label="Importo"
            type="number"
            :readonly="!canEdit"
            :format-display="formatCurrency"
            @save="(val) => $emit('save-field', { id: item.id, field: 'Importo', value: parseFloat(val) || 0 })"
          />
        </div>
        <div class="col-xs-12 col-sm-6">
          <InlineEditableField
            :model-value="item.Data"
            label="Data"
            type="date"
            :readonly="!canEdit"
            :format-display="formatDate"
            @save="(val) => $emit('save-field', { id: item.id, field: 'Data', value: val })"
          />
        </div>
      </div>

      <!-- Attachment -->
      <div>
        <div class="text-caption text-grey q-mb-xs">Allegato</div>
        <div class="row items-center q-gutter-sm">
          <template v-if="item.Allegato">
            <q-btn
              :href="allegatoUrl(item.Allegato)"
              target="_blank"
              type="a"
              flat
              dense
              color="primary"
              icon="open_in_new"
              label="Apri"
            />
            <q-btn
              :href="downloadUrl(item.Allegato)"
              type="a"
              flat
              dense
              color="primary"
              icon="file_download"
              label="Scarica"
            />
          </template>
          <span v-else class="text-grey-5 text-italic">Nessun allegato</span>

          <q-btn
            v-if="canEdit"
            icon="attach_file"
            flat
            dense
            size="sm"
            color="grey"
            label="Cambia file"
            @click="$refs.fileInput.pickFiles()"
          />
          <q-file
            ref="fileInput"
            v-model="newFile"
            :accept="FILE_ACCEPT"
            style="display: none"
            @update:model-value="onFileChange"
          />
        </div>
      </div>
      <div
        v-if="item.Stato === 'Rifiutato' && item.NotaRifiuto"
        class="bg-red-1 q-pa-sm q-mx-md q-mb-md rounded-borders"
        style="border: 1px solid #ffcdd2;"
      >
        <div class="text-caption text-negative text-weight-medium q-mb-xs">Motivazione del rifiuto</div>
        <div class="text-body2">{{ item.NotaRifiuto }}</div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { FILE_ACCEPT, API_URL, STORAGE_KEYS, TRANCHE_RENDICONTAZIONE } from 'src/utils/constants'
import { formatCurrency, formatDate, statoLabel, statoColor } from 'src/utils/formatters'
import InlineEditableField from 'components/Common/InlineEditableField.vue'

const $q = useQuasar()

const props = defineProps({
  item: { type: Object, required: true },
  canEdit: { type: Boolean, default: false }
})

const emit = defineEmits(['save-field', 'submit', 'file-change', 'invalida'])

const newFile = ref(null)

const trancheLabel = computed(() => {
  const value = typeof props.item.Rendicontazione === 'object'
    ? props.item.Rendicontazione?.Tranche
    : ''
  return TRANCHE_RENDICONTAZIONE.find((tranche) => tranche.value === value)?.label || value
})

function allegatoUrl(fileId) {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  return `${API_URL}/assets/${fileId}?access_token=${token}`
}

function downloadUrl(fileId) {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  return `${API_URL}/assets/${fileId}?download=1&access_token=${token}`
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
