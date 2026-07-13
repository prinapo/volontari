<template>
  <div class="row items-center q-gutter-sm q-mb-md">
    <div>
      <div class="text-h5 text-weight-medium">
        Errori
      </div>
      <div class="text-body2 text-grey-7">
        Errori API registrati dalle richieste del frontend.
      </div>
    </div>
    <q-space />
    <q-btn
      flat
      round
      icon="refresh"
      aria-label="Aggiorna"
      :loading="errorLogStore.loading"
      @click="errorLogStore.fetchAll">
      <q-tooltip>Aggiorna</q-tooltip>
    </q-btn>
  </div>

  <q-table
    :rows="errorLogStore.items"
    :columns="erroriColumns"
    row-key="id"
    flat
    bordered
    hide-pagination
    :pagination="{ rowsPerPage: 0 }"
    :loading="errorLogStore.loading"
    :grid="$q.screen.lt.sm"
  >
    <template #body-cell-level="props">
      <q-td :props="props">
        <q-badge :color="props.value === 'error' ? 'negative' : props.value === 'warning' ? 'warning' : 'grey'">
          {{ props.value }}
        </q-badge>
      </q-td>
    </template>
    <template #body-cell-message="props">
      <q-td :props="props">
        <div
          class="ellipsis cursor-pointer text-primary"
          style="max-width: 300px"
          role="button"
          tabindex="0"
          @click="showErrorDetail(props.value)"
          @keydown.enter.prevent="showErrorDetail(props.value)"
        >
          {{ props.value || '' }}
        </div>
      </q-td>
    </template>
    <template #body-cell-read="props">
      <q-td :props="props">
        <q-btn
          v-if="!props.value"
          flat
          dense
          icon="mark_email_read"
          size="sm"
          color="grey"
          aria-label="Segna come letto"
          @click="errorLogStore.markAsRead(props.row.id)"
        >
          <q-tooltip>Segna come letto</q-tooltip>
        </q-btn>
        <q-icon v-else name="check" color="positive" size="sm" />
      </q-td>
    </template>
    <template #body-cell-actions="props">
      <q-td :props="props">
        <q-btn
          flat
          dense
          icon="delete"
          color="negative"
          size="sm"
          aria-label="Elimina"
          @click="errorLogStore.delete(props.row.id)">
          <q-tooltip>Elimina</q-tooltip>
        </q-btn>
      </q-td>
    </template>
    <template #item="props">
      <div class="q-pa-xs col-12">
        <q-card flat bordered>
          <q-card-section>
            <div class="row items-center q-gutter-x-sm">
              <q-badge :color="props.row.level === 'error' ? 'negative' : 'warning'">{{ props.row.level }}</q-badge>
              <span class="text-caption text-grey-7">{{ props.row.timestamp }}</span>
              <q-space />
              <q-btn
                v-if="!props.row.read"
                flat
                dense
                icon="mark_email_read"
                size="sm"
                @click="errorLogStore.markAsRead(props.row.id)"><q-tooltip>Segna letto</q-tooltip></q-btn>
            </div>
            <div class="text-caption q-mt-xs">{{ props.row.method }} {{ props.row.status }}</div>
            <div class="text-body2 q-mt-xs">{{ props.row.message }}</div>
            <div v-if="props.row.responseBody" class="text-caption bg-grey-1 q-pa-xs q-mt-xs rounded-borders" style="max-height: 100px; overflow: auto; white-space: pre-wrap; font-family: monospace; font-size: 11px;">
              {{ props.row.responseBody }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </template>
  </q-table>

  <!-- Error detail dialog -->
  <q-dialog v-model="errorDetail.visible">
    <q-card>
      <q-card-section class="row items-center">
        <div class="text-h6">
          Dettaglio errore
        </div>
        <q-space />
        <q-btn
          v-close-popup
          icon="close"
          flat
          round
          dense
          aria-label="Chiudi">
          <q-tooltip>Chiudi</q-tooltip>
        </q-btn>
      </q-card-section>
      <q-separator />
      <q-card-section class="q-pt-none text-body2" style="white-space: pre-wrap; word-break: break-word;">
        {{ errorDetail.text }}
      </q-card-section>
      <q-card-actions align="right">
        <q-btn v-close-popup flat label="Chiudi" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useErrorLogStore } from 'stores/error-log.store'

const errorLogStore = useErrorLogStore()

const errorDetail = ref({ visible: false, text: '' })
function showErrorDetail(text) {
  errorDetail.value = { visible: true, text: text || '' }
}

const erroriColumns = [
  { name: 'timestamp', label: 'Data', field: 'timestamp', align: 'left' },
  { name: 'level', label: 'Livello', field: 'level', align: 'center' },
  { name: 'method', label: 'Metodo', field: 'method', align: 'center' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'message', label: 'Messaggio', field: 'message', align: 'left' },
  { name: 'read', label: 'Letto', field: 'read', align: 'center' },
  { name: 'actions', label: '', align: 'center' }
]

onMounted(() => {
  errorLogStore.fetchAll()
})
</script>
