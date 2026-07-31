<template>
  <div>
    <div class="text-h5 text-weight-medium">Sync produzione</div>
    <div class="text-body2 text-grey-7 q-mb-md">
      Scarica i dati reali da produzione e caricali in questo ambiente di sviluppo. La lettura da produzione è in sola-lettura.
    </div>

    <div class="row q-gutter-md q-mb-md">
      <q-btn
        color="primary"
        icon="cloud_download"
        label="Scarica da produzione"
        :loading="downloading"
        :disable="importing"
        @click="handleDownload"
      />
      <q-btn
        v-if="snapshot"
        color="negative"
        icon="cloud_upload"
        label="Carica in dev"
        :loading="importing"
        :disable="downloading"
        @click="confirmOpen = true"
      />
      <q-btn
        v-if="result"
        flat
        color="grey"
        icon="refresh"
        label="Nuovo sync"
        @click="reset"
      />
    </div>

    <q-card v-if="snapshot" flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row items-center q-gutter-sm">
          <q-icon name="download_done" color="positive" size="md" />
          <div>
            <div class="text-subtitle1 text-weight-medium">Snapshot scaricato</div>
            <div class="text-body2 text-grey-7">
              {{ formattedDate }} — da {{ snapshot.source || 'produzione' }}
            </div>
          </div>
        </div>
        <div class="row q-gutter-sm q-mt-sm">
          <q-chip v-for="entry in summaryEntries" :key="entry.label" outline color="primary">
            {{ entry.label }}: <strong>{{ entry.value }}</strong>
          </q-chip>
        </div>
        <div v-if="result" class="text-body2 text-positive q-mt-sm">
          Dati caricati in dev. Backup del precedente ambiente: {{ result.backupFile }}
        </div>
      </q-card-section>
    </q-card>

    <ConfirmDialog
      v-model="confirmOpen"
      title="Caricare i dati in dev?"
      icon="warning"
      icon-color="negative"
      :message="confirmMessage"
      confirm-label="Carica e sovrascrivi"
      confirm-color="negative"
      :loading="importing"
      @confirm="handleImport"
    />
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { computed, ref } from 'vue'
import ConfirmDialog from 'components/Common/ConfirmDialog.vue'
import { syncService } from 'src/services/sync.service'
import { notifyError, notifySuccess } from 'src/utils/notify'

const $q = useQuasar()

const downloading = ref(false)
const importing = ref(false)
const snapshot = ref(null)
const result = ref(null)
const confirmOpen = ref(false)

const COUNT_LABELS = {
  Famiglie: 'Famiglie',
  Progetti: 'Progetti',
  Pagamenti: 'Pagamenti',
  Giustificativi: 'Giustificativi',
  contatti: 'Contatti',
  Rendicontazioni: 'Rendicontazioni',
  utenti: 'Utenti',
  file: 'File'
}

const summaryEntries = computed(() => {
  if (!snapshot.value?.counts) return []
  return Object.entries(COUNT_LABELS)
    .filter(([key]) => snapshot.value.counts[key] !== undefined)
    .map(([key, label]) => ({ label, value: snapshot.value.counts[key] }))
})

const formattedDate = computed(() => {
  const raw = snapshot.value?.exportedAt
  if (!raw) return ''
  return new Date(raw).toLocaleString('it-IT')
})

const confirmMessage = computed(() => {
  if (!snapshot.value) return ''
  const counts = snapshot.value.counts || {}
  const parts = []
  for (const key of ['Famiglie', 'Progetti', 'Pagamenti', 'Giustificativi', 'contatti', 'utenti']) {
    if (counts[key] !== undefined) parts.push(`${key}: ${counts[key]}`)
  }
  return `L'operazione SOVRASCRIVE tutti i dati attuali di dev (${parts.join(', ')}). Viene creato automaticamente un backup del DB attuale. Continuare?`
})

async function handleDownload() {
  downloading.value = true
  try {
    snapshot.value = await syncService.download()
    result.value = null
    notifySuccess($q, 'Dati scaricati da produzione')
  } catch (error) {
    notifyError($q, error, 'Download fallito')
  } finally {
    downloading.value = false
  }
}

async function handleImport() {
  confirmOpen.value = false
  importing.value = true
  try {
    result.value = await syncService.importSnapshot(snapshot.value.dir)
    notifySuccess($q, 'Dati caricati in dev')
  } catch (error) {
    notifyError($q, error, 'Import fallito')
  } finally {
    importing.value = false
  }
}

function reset() {
  snapshot.value = null
  result.value = null
}
</script>
