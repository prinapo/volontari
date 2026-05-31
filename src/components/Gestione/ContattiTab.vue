<template>
  <div>
    <div class="row items-center q-mb-md q-gutter-sm">
      <q-input
        v-model="search"
        dense
        outlined
        placeholder="Cerca per nome..."
        clearable
        class="col"
        style="max-width: 320px"
        @update:model-value="onSearch"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
      </q-input>

      <q-select
        v-model="tipoFilter"
        :options="tipoOptions"
        dense
        outlined
        class="col-auto"
        style="min-width: 150px"
        @update:model-value="onFilterChange"
      />

      <q-select
        v-if="tipoFilter === 'Volontario'"
        v-model="statoFilter"
        :options="statoOptions"
        dense
        outlined
        class="col-auto"
        style="min-width: 150px"
        @update:model-value="onFilterChange"
      />

      <q-space />

      <q-btn color="primary" icon="person_add" label="Aggiungi Contatto" @click="openCreate" />
    </div>

    <q-table
      :rows="rows"
      :columns="columns"
      :pagination="pagination"
      :loading="loading"
      :total-items="totalItems"
      row-key="id_contatto"
      flat
      bordered
      binary-state-sort
      @request="onRequest"
    >
      <template #body-cell-nome="props">
        <q-td :props="props">
          {{ displayNome(props.row) }}
        </q-td>
      </template>

      <template #body-cell-email="props">
        <q-td :props="props">
          <template v-if="props.row.user_id?.email">
            <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" />
            <span class="text-caption">{{ props.row.user_id.email }}</span>
            <q-badge color="primary" label="Primaria" size="xs" class="q-ml-xs" />
          </template>
          <template v-else-if="props.row._emails?.length">
            <template v-for="em in props.row._emails" :key="em.email_address">
              <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" />
              <span class="text-caption">{{ em.email_address }}</span>
              <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs q-mr-sm" />
            </template>
          </template>
          <span v-else class="text-grey-5">—</span>
        </q-td>
      </template>

      <template #body-cell-cellulare="props">
        <q-td :props="props">
          {{ props.row.Numero_di_cellulare || '—' }}
        </q-td>
      </template>

      <template #body-cell-tipo="props">
        <q-td :props="props">
          <q-badge :color="tipoBadgeColor(computedTipo(props.row))">
            {{ computedTipo(props.row) }}
          </q-badge>
        </q-td>
      </template>

      <template #body-cell-stato="props">
        <q-td :props="props">
          <template v-if="props.row.user_id">
            <q-badge
              :color="props.row.user_id?.status === 'suspended' ? 'negative' : 'positive'"
            >
              {{ props.row.user_id?.status === 'suspended' ? 'Disattivato' : 'Attivo' }}
            </q-badge>
          </template>
          <span v-else class="text-grey">—</span>
        </q-td>
      </template>

      <template #body-cell-famiglie="props">
        <q-td :props="props">
          <q-btn
            v-if="famiglieCount[props.row.id_contatto]"
            flat
            dense
            no-caps
            :label="String(famiglieCount[props.row.id_contatto])"
            color="primary"
            @click="openFamiglie(props.row)"
          />
          <span v-else class="text-grey">0</span>
        </q-td>
      </template>

      <template #body-cell-azioni="props">
        <q-td :props="props">
          <q-btn flat dense icon="edit" @click="openEdit(props.row)" />
          <q-btn
            flat
            dense
            icon="groups"
            @click="openFamiglie(props.row)"
          />
        </q-td>
      </template>
    </q-table>

    <ContattoDialog
      v-model="showDialog"
      :edit-item="editingItem"
      @saved="onSaved"
    />

    <AssegnaFamigliaDialog
      v-model="showFamiglie"
      :contatto="famiglieTarget"
      :ruolo="famiglieTarget?.IsVolontario ? 'Volontario' : 'Genitore'"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useGestioneStore } from 'stores/gestione.store'
import { gestioneService } from 'src/services/gestione.service'
import ContattoDialog from './ContattoDialog.vue'
import AssegnaFamigliaDialog from './AssegnaFamigliaDialog.vue'

const store = useGestioneStore()

const rows = ref([])
const loading = ref(false)
const totalItems = ref(0)
const pagination = ref({
  sortBy: 'Cognome',
  descending: false,
  page: 1,
  rowsPerPage: 25,
  rowsNumber: 0
})

const search = ref('')
const tipoFilter = ref('Tutti')
const tipoOptions = ['Tutti', 'Volontario', 'Genitore', 'Contatto']
const statoFilter = ref('Tutti')
const statoOptions = ['Tutti', 'Attivi', 'Disattivati']

const showDialog = ref(false)
const editingItem = ref(null)

const showFamiglie = ref(false)
const famiglieTarget = ref(null)

const famiglieCount = ref({})

let searchTimeout = null

const columns = [
  { name: 'nome', label: 'Nome e Cognome', field: row => displayNome(row), align: 'left', sortable: true, sort: 'Cognome' },
  { name: 'email', label: 'Email', field: row => row.user_id?.email || row._emails?.[0]?.email_address || '', align: 'left' },
  { name: 'cellulare', label: 'Cellulare', field: 'Numero_di_cellulare', align: 'left' },
  { name: 'tipo', label: 'Tipo', field: '_tipo', align: 'center' },
  { name: 'stato', label: 'Stato account', align: 'center' },
  { name: 'famiglie', label: 'Famiglie', align: 'center' },
  { name: 'azioni', label: 'Azioni', align: 'center', sortable: false }
]

function displayNome(row) {
  const parts = [row.Nome, row.Cognome].filter(Boolean)
  return parts.length ? parts.join(' ') : '—'
}

function tipoBadgeColor(tipo) {
  if (tipo === 'Volontario') return 'primary'
  if (tipo === 'Genitore') return 'accent'
  return 'grey'
}

function computedTipo(row) {
  if (row.IsVolontario) return 'Volontario'
  if (row.IsGenitore) return 'Genitore'
  return 'Contatto'
}

function getQueryFilters() {
  let isVolontario = undefined
  let isGenitore = undefined

  if (tipoFilter.value === 'Volontario') {
    isVolontario = true
  } else if (tipoFilter.value === 'Genitore') {
    isGenitore = true
  } else if (tipoFilter.value === 'Contatto') {
    isVolontario = false
    isGenitore = false
  }

  return { isVolontario, isGenitore }
}

async function onRequest(props) {
  const { page, rowsPerPage, sortBy, descending } = props.pagination

  loading.value = true

  try {
    const filters = getQueryFilters()
    const sort = descending ? `-${sortBy || 'Cognome'}` : sortBy || 'Cognome'

    const res = await gestioneService.queryContatti({
      limit: rowsPerPage,
      offset: (page - 1) * rowsPerPage,
      sort,
      search: search.value || undefined,
      isVolontario: filters.isVolontario,
      isGenitore: filters.isGenitore,
      stato: tipoFilter.value === 'Volontario' ? statoFilter.value : undefined
    })

    const data = res.data.data || []
    totalItems.value = res.data.meta?.filter_count || 0

    const userIds = data.map(c => c.user_id).filter(Boolean)
    if (userIds.length > 0) {
      const usersRes = await gestioneService.getUsersByIds([...new Set(userIds)])
      const users = usersRes.data.data || []
      const userMap = {}
      users.forEach(u => { userMap[u.id] = u })
      data.forEach(c => {
        if (c.user_id && userMap[c.user_id]) {
          c.user_id = userMap[c.user_id]
        }
      })
    }

    await enrichRows(data)

    rows.value = data

    pagination.value = {
      ...pagination.value,
      page,
      rowsPerPage,
      sortBy,
      descending,
      rowsNumber: totalItems.value
    }
  } catch (err) {
    console.error('Query error:', err)
    rows.value = []
  } finally {
    loading.value = false
  }
}

async function enrichRows(data) {
  if (!data.length) return

  const ids = data.map(c => c.id_contatto)

  const [famRes, emailRes] = await Promise.all([
    gestioneService.queryFamiglieContatti(ids),
    gestioneService.getEmailByContatto(ids)
  ])

  const famItems = famRes.data.data || []
  const counts = {}
  for (const item of famItems) {
    const cid = item.Contatto
    if (!counts[cid]) counts[cid] = 0
    counts[cid]++
  }
  famiglieCount.value = counts

  const emailItems = emailRes.data.data || []
  const emailByContatto = {}
  for (const e of emailItems) {
    if (e.Contatto_Relation) {
      if (!emailByContatto[e.Contatto_Relation]) emailByContatto[e.Contatto_Relation] = []
      emailByContatto[e.Contatto_Relation].push({ email_address: e.email_address, Primary: e.Primary === true })
    }
  }
  for (const row of data) {
    if (!row.user_id?.email) {
      row._emails = emailByContatto[row.id_contatto] || []
    }
  }
}

function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1
    onRequest({
      pagination: pagination.value
    })
  }, 300)
}

function onFilterChange() {
  pagination.value.page = 1
  onRequest({
    pagination: pagination.value
  })
}

onMounted(() => {
  onRequest({
    pagination: pagination.value
  })
})

function openCreate() {
  editingItem.value = null
  showDialog.value = true
}

function openEdit(row) {
  editingItem.value = { ...row }
  showDialog.value = true
}

function openFamiglie(row) {
  famiglieTarget.value = row
  showFamiglie.value = true
}

async function onSaved() {
  await onRequest({
    pagination: pagination.value
  })
}
</script>
