<template>
  <div class="row items-center q-gutter-sm q-mb-md">
    <div>
      <div class="text-h5 text-weight-medium">Associazioni</div>
      <div class="text-body2 text-grey-7">Gestisci i budget annuali delle associazioni.</div>
    </div>
    <q-space />
    <q-input
      v-model="searchTerm"
      dense
      outlined
      placeholder="Cerca associazione..."
      clearable
      debounce="300"
      class="col-12 col-sm"
      @update:model-value="onSearchChange"
    >
      <template #prepend>
        <q-icon name="search" />
      </template>
    </q-input>
    <q-btn color="primary" icon="add" label="Nuova associazione" @click="openNewAssociazioneDialog" />
    <q-btn
flat
round
dense
size="sm"
icon="refresh"
aria-label="Aggiorna"
      @click="loadData">
      <q-tooltip>Aggiorna</q-tooltip>
    </q-btn>
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
  <q-dialog v-model="showNewAssociazioneDialog" persistent>
    <q-card>
      <q-card-section class="row items-center">
        <div class="text-h6">Nuova associazione</div>
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
      <q-card-actions align="right">
        <q-btn v-close-popup flat dense size="sm" label="Annulla" />
        <q-btn
          color="primary"
          label="Crea"
          :disable="!newAssociazioneNome"
          :loading="savingAssociazione"
          @click="createAssociazione"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, reactive, onMounted } from 'vue'
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
  { perPage: 25 }
)

const assocBudgetCache = reactive({})
const savingAssoc = ref(false)
const assocColumns = [
  { name: 'nome', label: 'Associazione', field: 'Nome', align: 'left' },
  { name: 'budget', label: 'Budget (€)', align: 'left' },
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
