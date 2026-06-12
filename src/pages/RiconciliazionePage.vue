<template>
  <q-page class="q-pa-md riconciliazione-page">
    <div class="page-inner">
      <div class="row items-center q-gutter-sm q-mb-md">
        <div class="text-h5 text-weight-medium">
          Da riconciliare
        </div>
        <q-space />
        <q-toggle
          v-model="store.includeScartati"
          label="Mostra scartati"
          dense
          @update:model-value="onToggleScartati"
        />
        <q-btn
          flat
          round
          icon="refresh"
          :loading="store.submissionsLoading"
          data-testid="btn-refresh-riconciliazioni"
          @click="loadData"
        >
          <q-tooltip>Aggiorna</q-tooltip>
        </q-btn>
      </div>

      <q-table
        flat
        bordered
        row-key="id"
        :rows="store.submissions"
        :columns="submissionColumns"
        :loading="store.submissionsLoading"
        v-model:pagination="pagination"
        :rows-per-page-options="[10, 25, 50]"
        @request="onRequest"
      >
        <template #body-cell-data_invio="props">
          <q-td :props="props">
            {{ formatDate(props.value) || '—' }}
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

        <template #body-cell-stato_submission="props">
          <q-td :props="props">
            <q-badge v-if="props.value === 'scartato'" color="grey-6" class="q-px-sm q-py-xs">
              Scartato
            </q-badge>
            <q-badge v-else color="positive" class="q-px-sm q-py-xs">
              In attesa
            </q-badge>
          </q-td>
        </template>

        <template #body-cell-stato="props">
          <q-td :props="props">
            <q-badge
              v-if="props.value === 'linked'"
              color="positive"
              class="q-px-sm q-py-xs"
            >
              <q-icon name="check_circle" size="sm" class="q-mr-xs" />
              Contatto verificato
            </q-badge>
            <q-badge
              v-else-if="props.value === 'not_parent'"
              color="accent"
              class="q-px-sm q-py-xs"
            >
              <q-icon name="group_add" size="sm" class="q-mr-xs" />
              Non è genitore
            </q-badge>
            <q-badge
              v-else-if="props.value === 'not_linked'"
              color="warning"
              class="q-px-sm q-py-xs text-dark"
            >
              <q-icon name="link_off" size="sm" class="q-mr-xs" />
              Contatto senza famiglia
            </q-badge>
            <q-badge
              v-else-if="props.value === 'not_found'"
              color="negative"
              class="q-px-sm q-py-xs"
            >
              <q-icon name="person_off" size="sm" class="q-mr-xs" />
              Contatto da creare
            </q-badge>
            <q-badge v-else color="grey" class="q-px-sm q-py-xs">
              <q-icon name="hourglass_empty" size="sm" class="q-mr-xs" />
              Verifica in corso
            </q-badge>
          </q-td>
        </template>

        <template #body-cell-email="props">
          <q-td :props="props">
            <template v-if="props.row._detectState === 'not_found'">
              <div class="row items-center q-gutter-xs">
                <q-input
                  v-model="props.row.email"
                  dense
                  outlined
                  class="text-body2 col"
                  @blur="handleEmailEdit(props.row)"
                />
                <q-btn
                  flat
                  round
                  dense
                  icon="save"
                  color="positive"
                  size="sm"
                  data-testid="btn-save-email"
                  @click="handleEmailEdit(props.row)"
                >
                  <q-tooltip>Salva email e ricontrolla</q-tooltip>
                </q-btn>
              </div>
            </template>
            <template v-else>
              {{ props.value }}
            </template>
          </q-td>
        </template>

        <template #body-cell-telefono="props">
          <q-td :props="props">
            {{ props.value || '—' }}
          </q-td>
        </template>

        <template #body-cell-importo="props">
          <q-td :props="props">
            {{ formatCurrency(props.value) }}
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props">
            <div class="row q-gutter-xs">
              <template v-if="props.row.stato === 'scartato'">
                <q-btn
                  flat
                  icon="restore"
                  color="orange"
                  size="md"
                  data-testid="btn-restore"
                  @click="handleRipristina(props.row)"
                >
                  <q-tooltip>Recupera</q-tooltip>
                </q-btn>
              </template>
              <template v-else>
                <q-btn
                  v-if="props.row._detectState === 'linked'"
                  flat
                  icon="fact_check"
                  color="positive"
                  size="md"
                  data-testid="btn-riconcilia"
                  @click="openRiconcilia(props.row)"
                >
                  <q-tooltip>Riconcilia</q-tooltip>
                </q-btn>
                <q-btn
                  v-else-if="props.row._detectState === 'not_parent'"
                  flat
                  icon="group_add"
                  color="accent"
                  size="md"
                  data-testid="btn-associa-genitore"
                  @click="handleAssociaGenitore(props.row)"
                >
                  <q-tooltip>Associa come genitore</q-tooltip>
                </q-btn>
                <q-btn
                  v-else-if="props.row._detectState === 'not_linked'"
                  flat
                  icon="people"
                  color="warning"
                  size="md"
                  data-testid="btn-associa-famiglia"
                  @click="openAssociaFamiglia(props.row)"
                >
                  <q-tooltip>Associa famiglia</q-tooltip>
                </q-btn>
                <q-btn
                  v-else-if="props.row._detectState === 'not_found'"
                  flat
                  icon="person_add"
                  color="negative"
                  size="md"
                  data-testid="btn-crea-contatto"
                  @click="openCreaContatto(props.row)"
                >
                  <q-tooltip>Crea contatto</q-tooltip>
                </q-btn>
                <q-btn
                  v-else
                  flat
                  icon="fact_check"
                  color="grey"
                  size="md"
                  disabled
                >
                  <q-tooltip>Verifica in corso</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  icon="delete"
                  color="negative"
                  size="md"
                  data-testid="btn-scarta"
                  @click="handleScarta(props.row)"
                >
                  <q-tooltip>Scarta</q-tooltip>
                </q-btn>
              </template>
            </div>
          </q-td>
        </template>
      </q-table>

      <!-- RiconciliaDialog: 🟢 linked -->
      <q-dialog v-model="riconciliaDialog" persistent>
        <RiconciliaDialog
          v-model="riconciliaDialog"
          :submission="reconcilingSubmission"
          @reconcile="handleRiconcilia"
        />
      </q-dialog>

      <!-- ContattoDialog: 🔴 not_found -->
      <ContattoDialog
        v-model="contattoDialogVisible"
        :initial-data="contattoInitialData"
        @saved="handleContattoCreated"
      />

      <!-- AssegnaFamigliaDialog: 🟠 not_linked -->
      <AssegnaFamigliaDialog
        v-model="assegnaDialogVisible"
        :contatto="assegnaContatto"
        ruolo="Genitore"
      />
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useVerificaStore } from 'stores/verifica.store'
import { useGestioneStore } from 'stores/gestione.store'
import { notifyError, notifySuccess } from 'src/utils/notify'
import RiconciliaDialog from 'components/RiconciliaDialog.vue'
import ContattoDialog from 'components/Gestione/ContattoDialog.vue'
import AssegnaFamigliaDialog from 'components/Gestione/AssegnaFamigliaDialog.vue'
import { formatCurrency, formatDate } from 'src/utils/formatters'
import { assetUrl } from 'src/utils/assets'
import { verificaService } from 'src/services/verifica.service'

const $q = useQuasar()
const store = useVerificaStore()
const gestioneStore = useGestioneStore()

const riconciliaDialog = ref(false)
const reconcilingSubmission = ref(null)

const contattoDialogVisible = ref(false)
const submissionForContatto = ref(null)
const contattoInitialData = computed(() => {
  const s = submissionForContatto.value
  if (!s) return null
  return {
    Nome: s.nome_richiedente || '',
    Cognome: s.cognome_richiedente || '',
    Email: s.email || '',
    Numero_di_cellulare: s.telefono || ''
  }
})

const assegnaDialogVisible = ref(false)
const assegnaContatto = ref(null)

const pagination = ref({
  page: 1,
  rowsPerPage: 25,
  rowsNumber: 0
})

const submissionColumns = [
  { name: 'data_invio', label: 'Data invio', field: 'data_invio', align: 'left', sortable: true },
  { name: 'richiedente', label: 'Richiedente', field: row => `${row.nome_richiedente || ''} ${row.cognome_richiedente || ''}`, align: 'left' },
  { name: 'email', label: 'Email', field: 'email', align: 'left' },
  { name: 'telefono', label: 'Telefono', field: 'telefono', align: 'left' },
  { name: 'stato', label: 'Stato email', field: '_detectState', align: 'left' },
  { name: 'beneficiario', label: 'Beneficiario', field: row => `${row.nome_beneficiario || ''} ${row.cognome_beneficiario || ''}`, align: 'left' },
  { name: 'importo', label: 'Importo', field: 'importo', align: 'right' },
  { name: 'stato_submission', label: 'Stato', field: 'stato', align: 'left' },
  { name: 'allegato', label: 'Allegato', field: 'allegato', align: 'left' },
  { name: 'actions', label: '', field: 'id', align: 'right' }
]

onMounted(() => {
  loadData()
})

async function loadData() {
  await store.fetchSubmissions({
    page: pagination.value.page,
    limit: pagination.value.rowsPerPage
  })
  pagination.value.rowsNumber = store.submissionsTotalCount
}

async function onRequest(props) {
  const { page, rowsPerPage } = props.pagination
  pagination.value.page = page
  if (rowsPerPage) pagination.value.rowsPerPage = rowsPerPage
  await loadData()
}

function onToggleScartati(_val) {
  pagination.value.page = 1
  loadData()
}

function openRiconcilia(submission) {
  reconcilingSubmission.value = submission
  riconciliaDialog.value = true
}

function openCreaContatto(submission) {
  submissionForContatto.value = submission
  contattoDialogVisible.value = true
}

function openAssociaFamiglia(submission) {
  assegnaContatto.value = submission._foundContatto
  assegnaDialogVisible.value = true
}

async function handleAssociaGenitore(submission) {
  try {
    await gestioneStore.assignToFamiglia(
      submission._foundContatto.id_contatto,
      submission._famigliaId,
      'Genitore'
    )
    notifySuccess($q, 'Contatto associato come genitore')
    loadData()
  } catch (err) {
    notifyError($q, err, "Errore nell'associazione")
  }
}

async function handleEmailEdit(submission) {
  if (!submission.email) return
  try {
    await verificaService.updateSubmission(submission.id, { email: submission.email })
  } catch (err) {
    notifyError($q, err, 'Errore nel salvataggio email')
  }
  loadData()
}

async function handleRiconcilia(payload) {
  try {
    await store.reconcileSubmission(payload)
    notifySuccess($q, 'Giustificativo creato e riconciliato')
    riconciliaDialog.value = false
    reconcilingSubmission.value = null
  } catch (err) {
    notifyError($q, err, 'Errore nella riconciliazione')
  }
}

function handleContattoCreated() {
  contattoDialogVisible.value = false
  submissionForContatto.value = null
  loadData()
}

watch(assegnaDialogVisible, (val) => {
  if (!val) {
    assegnaContatto.value = null
    loadData()
  }
})

function handleScarta(submission) {
  $q.dialog({
    title: 'Scarta submission',
    message: 'Motivo dello scarto:',
    prompt: { model: '', type: 'text' },
    cancel: true,
    persistent: true
  }).onOk(async (note) => {
    if (!note) {
      $q.notify({ type: 'warning', message: 'Inserisci una motivazione' })
      return
    }
    try {
      await store.scartaSubmission(submission.id, note)
      $q.notify({ type: 'warning', message: 'Submission scartata' })
    } catch (err) {
      notifyError($q, err, 'Errore nello scarto')
    }
  })
}

async function handleRipristina(submission) {
  try {
    await store.ripristinaSubmission(submission.id)
    notifySuccess($q, 'Submission ripristinata in attesa')
  } catch (err) {
    notifyError($q, err, 'Errore nel ripristino')
  }
}


</script>

<style scoped>
.page-inner {
  max-width: 1280px;
  margin: 0 auto;
}
</style>
