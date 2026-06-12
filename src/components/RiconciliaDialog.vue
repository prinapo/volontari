<template>
  <q-dialog v-model="model" persistent @show="initData">
    <q-card style="min-width: 800px; max-width: 900px; width: 100%;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">
          Riconcilia giustificativo
        </div>
        <q-space />
        <q-btn v-close-popup icon="close" flat round dense />
      </q-card-section>
      <q-card-section class="text-caption text-grey-7 q-pt-sm">
        {{ submission?.nome_richiedente }} {{ submission?.cognome_richiedente }} — {{ submission?.email }}
      </q-card-section>

      <q-card-section v-if="famigliaDetail?.Nome_Famiglia" class="q-pt-none q-pb-sm">
        <div class="row items-center">
          <div class="text-subtitle2 text-weight-medium">
            {{ famigliaDetail.Nome_Famiglia }}
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-scroll-area style="height: 65vh;">
        <div class="q-pa-md">
          <!-- Genitori / Volontari -->
          <div v-if="genitoriList.length > 0" class="q-mb-sm">
            <div class="text-caption text-grey-7">
              Genitori
            </div>
            <div v-for="g in genitoriList" :key="'g-'+g.id" class="text-body2 q-ml-sm">
              <q-icon name="person" size="xs" class="q-mr-xs text-grey-6" />
              {{ g.Contatto?.Nome || '' }} {{ g.Contatto?.Cognome || '' }}
              <span v-if="g._emails?.[0]" class="text-grey-7"> — {{ g._emails[0].email_address }}</span>
              <span v-if="g.Contatto?.Numero_di_cellulare" class="text-grey-7"> — Cell. {{ g.Contatto.Numero_di_cellulare }}</span>
              <span v-if="g.Contatto?.Numero_di_telefono" class="text-grey-7"> — Tel. {{ g.Contatto.Numero_di_telefono }}</span>
            </div>
          </div>
          <div v-if="volontariList.length > 0" class="q-mb-md">
            <div class="text-caption text-grey-7">
              Volontari
            </div>
            <div v-for="v in volontariList" :key="'v-'+v.id" class="text-body2 q-ml-sm">
              <q-icon name="person" size="xs" class="q-mr-xs text-grey-6" />
              {{ v.Contatto?.Nome || '' }} {{ v.Contatto?.Cognome || '' }}
              <span v-if="v._emails?.[0]" class="text-grey-7"> — {{ v._emails[0].email_address }}</span>
              <span v-if="v.Contatto?.Numero_di_cellulare" class="text-grey-7"> — Cell. {{ v.Contatto.Numero_di_cellulare }}</span>
              <span v-if="v.Contatto?.Numero_di_telefono" class="text-grey-7"> — Tel. {{ v.Contatto.Numero_di_telefono }}</span>
            </div>
          </div>

          <!-- Two-column comparison with individual save -->
          <div class="text-subtitle1 text-weight-medium q-mb-sm">
            Confronto dati
          </div>
          <q-card flat bordered>
            <div class="q-pa-sm" style="display: grid; gap: 0;">
              <div
                v-for="field in leftFields"
                :key="field.key"
                class="row items-center"
                style="min-height: 48px; border-bottom: 1px solid rgba(0,0,0,0.06);"
              >
                <!-- LEFT: submission data -->
                <div class="col-3 row items-center q-px-xs" style="padding: 4px 0;">
                  <div class="col-5 text-caption text-grey-7 text-right q-pr-sm">
                    {{ field.label }}
                  </div>
                  <div class="col-7 text-body2">
                    {{ getLeftValue(field.key) || '—' }}
                  </div>
                </div>
                <!-- Copy arrow -->
                <div class="col-1 text-center">
                  <q-btn
                    dense
                    flat
                    round
                    size="xs"
                    icon="arrow_forward"
                    color="primary"
                    @click="copyField(field.key)"
                  >
                    <q-tooltip>Copia dal richiedente</q-tooltip>
                  </q-btn>
                </div>
                <!-- RIGHT: editable value -->
                <div class="col-6 row items-center q-px-xs" style="padding: 4px 0;">
                  <div class="col-8">
                    <q-input
                      v-if="field.editable"
                      :model-value="rightValues[field.key]"
                      dense
                      outlined
                      hide-bottom-space
                      :color="isFieldDifferent(field.key) ? 'negative' : 'primary'"
                      :error="isFieldDifferent(field.key)"
                      :type="field.inputType || 'text'"
                      @update:model-value="(val) => setRightValue(field.key, val)"
                    />
                    <span v-else class="text-body2 q-ml-sm">{{ rightValues[field.key] || '—' }}</span>
                  </div>
                  <div class="col-4 text-center">
                    <q-btn
                      v-if="field.saveable && isFieldDifferent(field.key)"
                      dense
                      flat
                      round
                      size="xs"
                      icon="check"
                      color="positive"
                      @click="confirmField(field.key)"
                    >
                      <q-tooltip>Dato già corretto</q-tooltip>
                    </q-btn>
                    <q-btn
                      v-if="field.saveable"
                      dense
                      flat
                      :icon="savingField === field.key ? 'more_horiz' : 'save'"
                      :color="isFieldDifferent(field.key) ? 'positive' : 'grey-5'"
                      :disable="!isFieldDifferent(field.key) || savingField !== null"
                      :loading="savingField === field.key"
                      data-testid="btn-save-field"
                      @click="saveField(field.key)"
                    >
                      <q-tooltip>{{ isFieldDifferent(field.key) ? 'Salva' : 'Già aggiornato' }}</q-tooltip>
                    </q-btn>
                  </div>
                </div>
              </div>
            </div>
          </q-card>

          <!-- Progetto -->
          <div class="q-mt-lg">
            <div class="text-subtitle1 text-weight-medium q-mb-sm">
              Progetto
            </div>
            <q-banner v-if="progettiList.length === 0" class="bg-warning text-dark q-mb-md" rounded>
              <template #avatar>
                <q-icon name="warning" />
              </template>
              Nessun progetto trovato per questa famiglia.
            </q-banner>
            <template v-else>
              <q-select
                v-model="selectedProgettoId"
                :options="progettoOptions"
                label="Progetto"
                outlined
                dense
                emit-value
                map-options
                class="q-mb-sm"
                data-testid="select-progetto-riconcilia"
              />
              <q-card v-if="selectedProgetto" flat bordered>
                <div class="q-pa-sm" style="display: grid; gap: 0;">
                  <div
                    v-for="field in projectFields"
                    :key="field.key"
                    class="row items-center"
                    style="min-height: 48px; border-bottom: 1px solid rgba(0,0,0,0.06);"
                  >
                    <div class="col-3 row items-center q-px-xs" style="padding: 4px 0;">
                      <div class="col-6 text-caption text-grey-7 text-right q-pr-sm">
                        {{ field.label }}
                      </div>
                      <div class="col-6 text-body2">
                        {{ getSubmissionProjectValue(field.key) || '—' }}
                      </div>
                    </div>
                    <div class="col-1 text-center">
                      <q-btn
                        dense
                        flat
                        round
                        size="xs"
                        icon="arrow_forward"
                        color="primary"
                        @click="copyProjectField(field.key)"
                      >
                        <q-tooltip>Copia dal submission</q-tooltip>
                      </q-btn>
                    </div>
                    <div class="col-6 row items-center q-px-xs" style="padding: 4px 0;">
                      <div class="col-8">
                        <q-input
                          :model-value="projectValues[field.key]"
                          dense
                          outlined
                          hide-bottom-space
                          :color="isProjectFieldDifferent(field.key) ? 'negative' : 'primary'"
                          :error="isProjectFieldDifferent(field.key)"
                          :disable="!field.editable"
                          @update:model-value="(val) => setProjectValue(field.key, val)"
                        />
                      </div>
                      <div class="col-4 text-center">
                        <q-btn
                          v-if="isProjectFieldDifferent(field.key)"
                          dense
                          flat
                          round
                          size="xs"
                          icon="check"
                          color="positive"
                          @click="confirmProjectField(field.key)"
                        >
                          <q-tooltip>Dato già corretto</q-tooltip>
                        </q-btn>
                        <q-btn
                          dense
                          flat
                          :icon="savingProjectField === field.key ? 'more_horiz' : 'save'"
                          :color="isProjectFieldDifferent(field.key) ? 'positive' : 'grey-5'"
                          :disable="!isProjectFieldDifferent(field.key) || savingProjectField !== null"
                          :loading="savingProjectField === field.key"
                          @click="saveProjectField(field.key)"
                        >
                          <q-tooltip>{{ isProjectFieldDifferent(field.key) ? 'Salva' : 'Già aggiornato' }}</q-tooltip>
                        </q-btn>
                      </div>
                    </div>
                  </div>
                </div>
              </q-card>
            </template>
          </div>

          <!-- Allegato -->
          <div v-if="submission?.allegato" class="q-mt-lg">
            <div class="text-subtitle1 text-weight-medium q-mb-sm">
              Allegato
            </div>
            <q-card flat bordered>
              <q-card-section class="q-pa-sm">
                <div class="row items-center q-gutter-sm">
                  <q-icon name="attachment" size="sm" class="text-grey-6" />
                  <a :href="assetUrl(submission.allegato)" target="_blank" class="text-primary text-body2">
                    Apri allegato
                  </a>
                  <span class="text-grey-5">|</span>
                  <a :href="assetUrl(submission.allegato, true)" class="text-primary text-body2">
                    Scarica
                  </a>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Giustificativo section -->
          <div class="q-mt-lg">
            <div class="text-subtitle1 text-weight-medium q-mb-sm">
              Giustificativo
            </div>
            <q-card flat bordered>
              <q-card-section class="q-pa-sm">
                <q-input
                  v-model="giustDescrizione"
                  label="Descrizione *"
                  outlined
                  dense
                  type="textarea"
                  data-testid="riconcilia-descrizione"
                  rows="2"
                />
                <div class="row q-col-gutter-md q-mt-sm">
                  <div class="col-6">
                    <q-input
                      v-model="giustImporto"
                      label="Importo (€)"
                      outlined
                      dense
                      type="number"
                      data-testid="riconcilia-importo"
                    />
                  </div>
                  <div class="col-6">
                    <q-input
                      v-model="giustData"
                      label="Data"
                      outlined
                      dense
                      type="date"
                    />
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Notes -->
          <div class="q-mt-lg">
            <q-input
              v-model="note"
              label="Note (opzionale)"
              outlined
              dense
              type="textarea"
              rows="2"
            />
          </div>
        </div>
      </q-scroll-area>

      <q-separator />

      <q-card-actions align="right" class="q-pa-md">
        <q-btn v-close-popup flat label="Annulla" color="negative" />
        <q-btn
          flat
          label="Crea giustificativo"
          color="primary"
          :disable="!selectedProgettoId || savingField !== null"
          :loading="saving"
          data-testid="btn-crea-giustificativo"
          @click="confirmReconcile"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { verificaService } from 'src/services/verifica.service'
import { useVerificaStore } from 'stores/verifica.store'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { assetUrl } from 'src/utils/assets'

const $q = useQuasar()
const verificaStore = useVerificaStore()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  submission: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'reconcile'])

const model = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// Selections
const selectedProgettoId = ref(null)
const note = ref('')
const saving = ref(false)
const savingField = ref(null)
const savingProjectField = ref(null)

// Data
const contattoIdRef = ref(null)
const famigliaIdRef = ref(null)
const famigliaDetail = ref(null)
const genitoriList = ref([])
const volontariList = ref([])
const progettiList = ref([])

// Right-side editable values (contatto)
const rightValues = ref({
  Nome: '',
  Cognome: '',
  Email: '',
  Telefono: '',
  IBAN: '',
  Intestatario: ''
})
const confirmedFields = ref(new Set())

// Project editable values
const projectValues = ref({
  Beneficiario: '',
  AnnoBando: '',
  Allocato: '',
  Titolo: ''
})
const projectConfirmedFields = ref(new Set())

watch(selectedProgettoId, () => {
  projectConfirmedFields.value = new Set()
  initProjectValues()
})

// Giustificativo fields
const giustDescrizione = ref('')
const giustImporto = ref(null)
const giustData = ref('')

// Fields definition
const FIELD_MAP = {
  Nome: 'nome_richiedente',
  Cognome: 'cognome_richiedente',
  Email: 'email',
  Telefono: 'telefono',
  IBAN: 'iban',
  Intestatario: 'intestatario'
}

const leftFields = [
  { key: 'Nome', label: 'Nome', editable: true, saveable: true },
  { key: 'Cognome', label: 'Cognome', editable: true, saveable: true },
  { key: 'Email', label: 'Email', editable: false, saveable: false },
  { key: 'Telefono', label: 'Telefono', editable: true, saveable: true },
  { key: 'IBAN', label: 'IBAN', editable: true, saveable: true },
  { key: 'Intestatario', label: 'Intestatario', editable: true, saveable: true }
]

const PROJECT_FIELD_MAP = {
  Beneficiario: 'cognome_beneficiario'
}

const projectFields = [
  { key: 'Beneficiario', label: 'Beneficiario', editable: true }
]

// Computed
const selectedProgetto = computed(() =>
  progettiList.value.find(p => p.id_progetto === selectedProgettoId.value) || null
)

const progettoOptions = computed(() =>
  progettiList.value.map(p => ({
    label: `${p.Cognome_e__Nome_Beneficiario} (${p.AnnoBando || 'N/A'})`,
    value: p.id_progetto
  }))
)

function getSubmissionProjectValue(key) {
  const submission = props.submission
  if (!submission) return ''
  if (key === 'Beneficiario') return submission.cognome_beneficiario || ''
  return ''
}

function isProjectFieldDifferent(key) {
  if (projectConfirmedFields.value.has(key)) return false
  const left = getSubmissionProjectValue(key)
  const right = (projectValues.value[key] || '').toString().trim()
  if (!right && !left) return false
  if (!right && left) return true
  return left !== right
}

function setProjectValue(key, val) {
  projectValues.value[key] = val
  projectConfirmedFields.value.delete(key)
}

function confirmProjectField(key) {
  projectConfirmedFields.value.add(key)
}

function copyProjectField(key) {
  const srcKey = PROJECT_FIELD_MAP[key]
  if (!srcKey || !props.submission) return
  const val = props.submission[srcKey] || ''
  if (!val) return

  $q.dialog({
    title: 'Salva il dato',
    message: `Vuoi salvare "${val}" come ${key} nel progetto?`,
    cancel: { label: 'No', flat: true },
    ok: { label: 'Sì, salva', color: 'primary' },
    persistent: true
  }).onOk(async () => {
    projectValues.value[key] = val
    projectConfirmedFields.value.delete(key)
    await saveProjectField(key)
  })
}

async function saveProjectField(key) {
  if (!selectedProgetto.value) return
  savingProjectField.value = key
  try {
    const val = projectValues.value[key]
    const fieldMap = { Beneficiario: 'Cognome_e__Nome_Beneficiario' }
    const directusField = fieldMap[key]
    if (directusField && val) {
      await verificaService.updateProgetto(selectedProgetto.value.id_progetto, { [directusField]: val })
      notifySuccess($q, `${key} aggiornato`)
    }
  } catch (err) {
    notifyError($q, err, `${key}: Errore aggiornamento`)
  } finally {
    savingProjectField.value = null
  }
}

function initProjectValues() {
  if (!selectedProgetto.value) {
    projectValues.value = { Beneficiario: '' }
    return
  }
  projectValues.value = {
    Beneficiario: selectedProgetto.value.Cognome_e__Nome_Beneficiario || ''
  }
}

// Helpers
function getLeftValue(key) {
  const srcKey = FIELD_MAP[key]
  return (props.submission && srcKey ? props.submission[srcKey] : '') || ''
}

function isFieldDifferent(key) {
  if (confirmedFields.value.has(key)) return false
  const left = getLeftValue(key)
  const right = (rightValues.value[key] || '').toString().trim()
  if (!right && !left) return false
  if (!right && left) return true
  return left !== right
}

function confirmField(key) {
  confirmedFields.value.add(key)
}

function setRightValue(key, val) {
  rightValues.value[key] = val
  confirmedFields.value.delete(key)
}

function copyField(key) {
  const srcKey = FIELD_MAP[key]
  if (!srcKey || !props.submission) return
  const val = props.submission[srcKey] || ''
  if (!val) return

  const label = leftFields.find(f => f.key === key)?.label || key
  $q.dialog({
    title: 'Salva il dato',
    message: `Vuoi salvare "${val}" come ${label} nel database?`,
    cancel: { label: 'No', flat: true },
    ok: { label: 'Sì, salva', color: 'primary' },
    persistent: true
  }).onOk(async () => {
    rightValues.value[key] = val
    confirmedFields.value.delete(key)
    await saveField(key)
  })
}

async function saveField(key) {
  savingField.value = key
  try {
    const val = rightValues.value[key]
    await verificaStore.reconcileUpdateField(contattoIdRef.value, famigliaIdRef.value, key, val)
    notifySuccess($q, `${leftFields.find(f => f.key === key)?.label || key} aggiornato`)
  } catch (err) {
    notifyError($q, err, `${key}: Errore sconosciuto`)
  } finally {
    savingField.value = null
  }
}

// Data loading
async function loadFamigliaMembers(famigliaId) {
  if (!famigliaId) {
    genitoriList.value = []
    volontariList.value = []
    return
  }
  try {
    const { genitori, volontari } = await verificaStore.loadFamigliaContacts(famigliaId)
    genitoriList.value = genitori
    volontariList.value = volontari
  } catch {
    genitoriList.value = []
    volontariList.value = []
  }
}

async function loadProgetti(famigliaId) {
  if (!famigliaId) {
    progettiList.value = []
    return
  }
  try {
    const res = await verificaService.findProgettoByFamiglia(famigliaId)
    progettiList.value = res.data.data || []
  } catch (err) {
    progettiList.value = []
  }
}

async function initData() {
  if (!props.submission) return

  selectedProgettoId.value = null
  note.value = ''
  contattoIdRef.value = null
  famigliaIdRef.value = null
  famigliaDetail.value = null
  genitoriList.value = []
  volontariList.value = []
  progettiList.value = []
  rightValues.value = { Nome: '', Cognome: '', Email: '', Telefono: '', IBAN: '', Intestatario: '' }
  confirmedFields.value = new Set()
  projectValues.value = { Beneficiario: '', AnnoBando: '', Allocato: '', Titolo: '' }
  projectConfirmedFields.value = new Set()
  giustDescrizione.value = props.submission.descrizione || ''
  giustImporto.value = props.submission.importo || null
  giustData.value = toLocalDate(props.submission.data)

  const email = props.submission.email
  if (!email) {
    return
  }

  try {
    const ctx = await verificaStore.resolveSubmissionContext(email)
    contattoIdRef.value = ctx.contattoId
    famigliaIdRef.value = ctx.famigliaId
    rightValues.value = { ...ctx.rightValues }
    famigliaDetail.value = ctx.famigliaDetail

    if (ctx.famigliaId) {
      await Promise.all([
        loadFamigliaMembers(ctx.famigliaId),
        loadProgetti(ctx.famigliaId)
      ])

      if (progettiList.value.length === 1) {
        selectedProgettoId.value = progettiList.value[0].id_progetto
        initProjectValues()
      }
    } else {
      // no famigliaId
    }
  } catch (err) {
    // silent
  }
}

async function confirmReconcile() {
  if (!selectedProgettoId.value) return
  saving.value = true
  try {
    const allCopiedFields = [
      ...[...confirmedFields.value],
      ...[...projectConfirmedFields.value].map(f => `Progetto_${f}`)
    ]
    emit('reconcile', {
      submissionId: props.submission?.id,
      contattoId: contattoIdRef.value,
      emailRecordId: null,
      famigliaId: famigliaIdRef.value,
      progettoId: selectedProgettoId.value,
      note: note.value,
      descrizione: giustDescrizione.value,
      importo: parseFloat(giustImporto.value) || 0,
      data: giustData.value,
      allegato: props.submission?.allegato,
      rightValues: { ...rightValues.value },
      projectValues: { ...projectValues.value },
      copiedFields: allCopiedFields
    })
    model.value = false
  } finally {
    saving.value = false
  }
}

function toLocalDate(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr.substring(0, 10)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}


</script>
