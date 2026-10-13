<template>
  <div>
    <div class="text-h5 text-weight-medium">Associazioni</div>
    <div class="text-body2 text-grey-7 q-mb-md">Gestisci i budget annuali delle associazioni.</div>
    <div class="row q-gutter-sm q-mb-md">
      <q-btn color="primary" icon="add" label="Nuova associazione" @click="openNewAssociazioneDialog" />
    </div>

    <q-table
      v-model:pagination="pagination"
      :rows="rows"
      :columns="assocColumns"
      row-key="id"
      flat
      bordered
      :loading="loading"
      :grid="$q.screen.lt.sm"
      @request="onRequest"
    >
      <template #top>
        <div class="full-width">
          <TableToolbar
            v-model:search="searchTerm"
            search-placeholder="Cerca associazione..."
            :loading="loading"
            refresh
            @update:search="onSearchChange"
            @refresh="loadData"
          />
        </div>
      </template>

      <template #body-cell-budget="props">
      <q-td :props="props">
        <q-input
          :model-value="
            assocBudgetCache[props.row.id] !== undefined ? assocBudgetCache[props.row.id] : props.row.Budget
          "
          outlined
          dense
          type="number"
          min="0"
          step="0.01"
          @update:model-value="val => editAssocBudget(props.row, val)"
        />
      </q-td>
    </template>
    <template #body-cell-actions="props">
      <q-td :props="props">
        <q-btn
          v-if="assocBudgetCache[props.row.id] !== undefined"
icon="save"
color="positive"
round
flat
dense
size="sm"
          :loading="savingAssoc"
          @click="saveAssocBudget(props.row)"
        >
          <q-tooltip>Salva</q-tooltip>
        </q-btn>
      </q-td>
    </template>
    <template #item="props">
      <div class="q-pa-xs col-12">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-weight-medium">{{ props.row.Nome }}</div>
            <div class="row items-center q-gutter-sm q-mt-sm">
              <q-input
                :model-value="
                  assocBudgetCache[props.row.id] !== undefined ? assocBudgetCache[props.row.id] : props.row.Budget
                "
                outlined
                dense
                type="number"
                min="0"
                step="0.01"
                label="Budget (€)"
                @update:model-value="val => editAssocBudget(props.row, val)"
              />
              <q-btn
                v-if="assocBudgetCache[props.row.id] !== undefined"
                icon="save"
                color="positive"
                round
                flat
                dense
                size="sm"
                :loading="savingAssoc"
                @click="saveAssocBudget(props.row)"
              >
                <q-tooltip>Salva</q-tooltip>
              </q-btn>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </template>
  </q-table>

  <!-- Nuova Associazione Dialog -->
  <AppDialog v-model="showNewAssociazioneDialog" title="Nuova associazione">
    <q-card-section>
      <q-input v-model="newAssociazioneNome" label="Nome *" outlined dense class="q-mb-md" />
      <q-input
v-model="newAssociazioneBudget"
label="Budget (€)"
outlined
dense
type="number"
min="0"
step="0.01" />
    </q-card-section>
    <template #footer>
      <q-btn v-close-popup flat dense size="sm" label="Annulla" />
      <q-btn
        color="primary"
        label="Crea"
        :disable="!newAssociazioneNome"
        :loading="savingAssociazione"
        @click="createAssociazione"
      />
    </template>
  </AppDialog>
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, reactive, onMounted } from 'vue'
import AppDialog from 'components/Common/AppDialog.vue'
import TableToolbar from 'components/TableToolbar.vue'
import { useServerTable } from 'src/composables/useServerTable'
import { associazioniService } from 'src/services/associazioni.service'
import { notifyError, notifySuccess } from 'src/utils/notify'

const $q = useQuasar()

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
    const res = await associazioniService.getAll({
      page: params.page,
      limit: params.limit,
      sort: params.sort || 'Nome',
      search: params.search,
      meta: 'filter_count'
    })
    const data = res.data.data || []
    const total = res.data.meta?.filter_count || 0
    return { rows: data, total }
  },
  { perPage: 25, sortMap: { budget: 'Budget' } }
)

const assocBudgetCache = reactive({})
const savingAssoc = ref(false)
const assocColumns = [
  { name: 'nome', label: 'Associazione', field: 'Nome', align: 'left', sortable: true },
  { name: 'budget', label: 'Budget (€)', field: 'Budget', align: 'left', sortable: true },
  { name: 'actions', label: '', align: 'center' }
]

function editAssocBudget(row, val) {
  assocBudgetCache[row.id] = Number.parseFloat(val) || 0
}

async function saveAssocBudget(row) {
  const val = assocBudgetCache[row.id]
  if (val === undefined) return
  savingAssoc.value = true
  try {
    await associazioniService.update(row.id, { Budget: val })
    notifySuccess($q, 'Budget aggiornato')
    delete assocBudgetCache[row.id]
    await loadData()
  } catch (error) {
    notifyError($q, error, 'Errore aggiornamento budget')
  } finally {
    savingAssoc.value = false
  }
}

const showNewAssociazioneDialog = ref(false)
const newAssociazioneNome = ref('')
const newAssociazioneBudget = ref(0)
const savingAssociazione = ref(false)

function openNewAssociazioneDialog() {
  newAssociazioneNome.value = ''
  newAssociazioneBudget.value = 0
  showNewAssociazioneDialog.value = true
}

async function createAssociazione() {
  if (!newAssociazioneNome.value) return
  savingAssociazione.value = true
  try {
    const data = { Nome: newAssociazioneNome.value }
    if (newAssociazioneBudget.value > 0) {
      data.Budget = newAssociazioneBudget.value
    }
    await associazioniService.create(data)
    notifySuccess($q, 'Associazione creata')
    showNewAssociazioneDialog.value = false
    await loadData()
  } catch (error) {
    notifyError($q, error, 'Errore creazione associazione')
  } finally {
    savingAssociazione.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
