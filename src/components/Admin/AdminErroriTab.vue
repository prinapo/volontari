<template>
  <div>
    <div class="text-h5 text-weight-medium">Errori</div>
    <div class="text-body2 text-grey-7 q-mb-md">Errori API registrati dalle richieste del frontend.</div>

    <q-table
      v-model:pagination="pagination"
      v-model:selected="selected"
      :rows="rows"
      :columns="erroriColumns"
      row-key="id"
      flat
      bordered
      :loading="loading"
      selection="multiple"
      :grid="$q.screen.lt.sm"
      @request="onRequest"
    >
      <template #top>
        <div class="full-width">
          <div v-if="selected.length > 0" class="row items-center q-gutter-sm q-mb-sm">
            <span class="text-caption">{{ selected.length }} selezionati</span>
            <q-btn
              flat
              dense
              size="sm"
              color="grey"
              icon="mark_email_read"
              label="Segna come letti"
              :loading="bulkLoading"
              @click="handleBulkMarkRead"
            >
              <q-tooltip>Segna come letti tutti i selezionati</q-tooltip>
            </q-btn>
            <q-btn
              flat
              dense
              size="sm"
              color="negative"
              icon="delete"
              label="Elimina"
              :loading="bulkLoading"
              @click="handleBulkDelete"
            >
              <q-tooltip>Elimina tutti i selezionati</q-tooltip>
            </q-btn>
          </div>
          <TableToolbar
            v-model:search="searchTerm"
            search-placeholder="Cerca..."
            :loading="loading"
            refresh
            @update:search="onSearchChange"
            @refresh="loadData"
          />
        </div>
      </template>

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
          round
          dense
          icon="mark_email_read"
          size="sm"
          color="grey"
          aria-label="Segna come letto"
          @click="handleMarkAsRead(props.row.id)"
        >
          <q-tooltip>Segna come letto</q-tooltip>
        </q-btn>
        <q-icon v-else name="check_circle" color="positive" size="sm" />
      </q-td>
    </template>
    <template #body-cell-actions="props">
      <q-td :props="props">
        <q-btn
          flat
          round
          dense
          icon="delete"
          color="negative"
          size="sm"
          aria-label="Elimina"
          @click="handleDelete(props.row.id)"
        >
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
                round
                dense
                icon="mark_email_read"
                color="grey"
                size="sm"
                aria-label="Segna come letto"
                @click="handleMarkAsRead(props.row.id)"
                ><q-tooltip>Segna come letto</q-tooltip></q-btn
              >
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                size="sm"
                aria-label="Elimina"
                @click="handleDelete(props.row.id)"
              >
                <q-tooltip>Elimina</q-tooltip>
              </q-btn>
            </div>
            <div class="text-caption q-mt-xs">{{ props.row.method }} {{ props.row.status }}</div>
            <div class="text-body2 q-mt-xs">{{ props.row.message }}</div>
            <div
              v-if="props.row.responseBody"
              class="text-caption bg-grey-1 q-pa-xs q-mt-xs rounded-borders"
              style="max-height: 100px; overflow: auto; white-space: pre-wrap"
            >
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
        <div class="text-h6">Dettaglio errore</div>
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
      <q-card-section class="q-pt-none text-body2 text-pre-wrap">
        {{ errorDetail.text }}
      </q-card-section>
      <q-card-actions align="right">
        <q-btn v-close-popup flat dense size="sm" label="Chiudi" />
      </q-card-actions>
    </q-card>
  </q-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import TableToolbar from 'components/TableToolbar.vue'
import { useServerTable } from 'src/composables/useServerTable'
import { errorLogService } from 'src/services/error-log.service'
import { useErrorLogStore } from 'stores/error-log.store'

const errorLogStore = useErrorLogStore()

const selected = ref([])
const bulkLoading = ref(false)

const {
  rows,
  loading,
  pagination,
  searchTerm,
  onRequest,
  onSearchChange,
  loadData
} = useServerTable(
  async (params) => {
    const res = await errorLogService.getAll({
      page: params.page,
      limit: params.limit,
      sort: params.sort || '-timestamp',
      search: params.search,
      meta: 'filter_count'
    })
    const data = res.data.data || []
    const total = res.data.meta?.filter_count || 0
    return { rows: data, total }
  },
  { perPage: 25 }
)

const errorDetail = ref({ visible: false, text: '' })
function showErrorDetail(text) {
  errorDetail.value = { visible: true, text: text || '' }
}

async function handleMarkAsRead(id) {
  await errorLogStore.markAsRead(id)
  loadData()
}

async function handleDelete(id) {
  await errorLogStore.delete(id)
  loadData()
}

async function handleBulkMarkRead() {
  bulkLoading.value = true
  try {
    const unread = selected.value.filter(r => !r.read)
    for (const row of unread) {
      await errorLogStore.markAsRead(row.id)
    }
    selected.value = []
    loadData()
  } finally {
    bulkLoading.value = false
  }
}

async function handleBulkDelete() {
  bulkLoading.value = true
  try {
    for (const row of selected.value) {
      await errorLogStore.delete(row.id)
    }
    selected.value = []
    loadData()
  } finally {
    bulkLoading.value = false
  }
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
  loadData()
})
</script>
