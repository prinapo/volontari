<template>
  <div>
    <div class="row items-center q-gutter-sm q-mb-md">
      <div>
        <div class="text-h5 text-weight-medium">
          Email
        </div>
        <div class="text-body2 text-grey-7">
          Trova email con caratteri maiuscoli e convertile in lowercase.
        </div>
      </div>
      <q-space />
      <q-btn
        flat
        round
        icon="refresh"
        aria-label="Scansiona"
        :loading="scanning"
        @click="handleScan"
      >
        <q-tooltip>Scansiona</q-tooltip>
      </q-btn>
    </div>

    <template v-if="!scanned">
      <q-banner class="bg-grey-2 text-grey-8 q-mb-md rounded-borders">
        <template #avatar>
          <q-icon name="info" />
        </template>
        Clicca "Scansiona" per trovare tutte le email con caratteri maiuscoli nel database.
      </q-banner>
    </template>

    <template v-if="results && totalCount === 0">
      <q-banner class="bg-positive text-white q-mb-md rounded-borders">
        <template #avatar>
          <q-icon name="check_circle" />
        </template>
        Nessuna email con caratteri maiuscoli trovata. Tutte le email sono già in lowercase.
      </q-banner>
    </template>

    <template v-if="totalCount > 0">
      <q-banner class="bg-warning text-white q-mb-md rounded-borders">
        <template #avatar>
          <q-icon name="warning" />
        </template>
        Trovate {{ totalCount }} email con caratteri maiuscoli. Seleziona quelle da convertire.
      </q-banner>

      <q-table
        v-model:selected="selected"
        :rows="allRows"
        :columns="columns"
        row-key="id"
        flat
        bordered
        selection="multiple"
        :pagination="{ rowsPerPage: 25 }"
      >
        <template #body-cell-actions="{ row }">
          <q-td>
            <q-btn
              v-if="row.current !== row.converted"
              flat
              dense
              icon="arrow_downward"
              color="primary"
              size="sm"
              @click="convertSingle(row)"
            >
              <q-tooltip>Converti questa email</q-tooltip>
            </q-btn>
            <q-icon v-else name="check_circle" color="positive" size="sm">
              <q-tooltip>Già in lowercase</q-tooltip>
            </q-icon>
          </q-td>
        </template>
      </q-table>

      <div class="row q-mt-md">
        <q-btn
          color="primary"
          label="Converti selezionati"
          :disable="selected.length === 0"
          :loading="converting"
          @click="convertSelected"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, computed } from 'vue'
import { emailCleanupService } from 'src/services/email-cleanup.service'
import { notifySuccess, notifyError } from 'src/utils/notify'

const $q = useQuasar()
const scanning = ref(false)
const converting = ref(false)
const scanned = ref(false)
const results = ref(null)
const selected = ref([])

const columns = [
  { name: 'table', label: 'Tabella', field: 'table', sortable: true },
  { name: 'id', label: 'ID', field: 'id', sortable: true },
  { name: 'current', label: 'Email attuale', field: 'current', sortable: true },
  { name: 'converted', label: 'Dopo conversione', field: 'converted', sortable: true },
  { name: 'actions', label: 'Azioni', field: 'actions' }
]

const allRows = computed(() => {
  if (!results.value) return []
  const rows = []
  for (const item of results.value.emailTable) {
    rows.push({
      id: `email_${item.id}`,
      table: 'email',
      recordId: item.id,
      current: item.email_address,
      converted: item.email_address.toLowerCase()
    })
  }
  for (const item of results.value.submissions) {
    rows.push({
      id: `sub_${item.id}`,
      table: 'InviiGiustificativiNoLogin',
      recordId: item.id,
      current: item.email,
      converted: item.email.toLowerCase()
    })
  }
  for (const item of results.value.users) {
    rows.push({
      id: `user_${item.id}`,
      table: 'directus_users',
      recordId: item.id,
      current: item.email,
      converted: item.email.toLowerCase()
    })
  }
  return rows
})

const totalCount = computed(() => allRows.value.length)

async function handleScan() {
  scanning.value = true
  try {
    results.value = await emailCleanupService.scan()
    scanned.value = true
    scanned.value = true
    notifySuccess($q, `Scansione completata: ${totalCount.value} email trovate`)
  } catch (error) {
    notifyError($q, error, 'Errore durante la scansione')
  } finally {
    scanning.value = false
  }
}

async function convertSingle(row) {
  converting.value = true
  try {
    await emailCleanupService.convert(row.table, row.recordId, row.current)
    row.current = row.converted
    notifySuccess($q, `Email convertita: ${row.converted}`)
  } catch (error) {
    notifyError($q, error, `Errore nella conversione di ${row.current}`)
  } finally {
    converting.value = false
  }
}

async function convertSelected() {
  converting.value = true
  let ok = 0
  let fail = 0
  for (const row of selected.value) {
    if (row.current === row.converted) {
      ok++
      continue
    }
    try {
      await emailCleanupService.convert(row.table, row.recordId, row.current)
      row.current = row.converted
      ok++
    } catch {
      fail++
    }
  }
  converting.value = false
  selected.value = []
  if (fail === 0) {
    notifySuccess($q, `${ok} email convertite con successo`)
  } else {
    notifyError($q, null, `${ok} convertite, ${fail} fallite`)
  }
}
</script>
