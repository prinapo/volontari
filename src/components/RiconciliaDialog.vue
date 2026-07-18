<template>
  <q-dialog v-model="model" persistent :full-width="$q.screen.lt.sm" @show="initData">
    <q-card class="bg-grey-1">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Riconcilia giustificativo</div>
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

      <div class="q-pa-md">
        <!-- Genitori / Volontari -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="q-pa-sm">
            <div v-if="genitoriList.length > 0" class="q-mb-sm">
              <div class="text-caption text-grey-7">Genitori</div>
              <div v-for="g in genitoriList" :key="'g-' + g.id" class="text-body2 q-ml-sm">
                <q-icon name="person" size="xs" class="q-mr-xs text-grey-6" />
                {{ displayFullName(g.Contatto) }}
                <span v-if="g._emails?.[0]" class="text-grey-7">
                  — <ContactLink
type="email"
:value="g._emails[0].email_address"
                /></span>
                <span v-if="g.Contatto?.Numero_di_cellulare" class="text-grey-7">
                  — Cell. <ContactLink
type="tel"
:value="g.Contatto.Numero_di_cellulare"
                /></span>
                <span v-if="g.Contatto?.Numero_di_telefono" class="text-grey-7">
                  — Tel. <ContactLink
type="tel"
:value="g.Contatto.Numero_di_telefono"
                /></span>
              </div>
            </div>
            <div v-if="volontariList.length > 0" class="q-mb-sm">
              <div class="text-caption text-grey-7">Volontari</div>
              <div v-for="v in volontariList" :key="'v-' + v.id" class="text-body2 q-ml-sm">
                <q-icon name="person" size="xs" class="q-mr-xs text-grey-6" />
                {{ displayFullName(v.Contatto) }}
                <span v-if="v._emails?.[0]" class="text-grey-7">
                  — <ContactLink
type="email"
:value="v._emails[0].email_address"
                /></span>
                <span v-if="v.Contatto?.Numero_di_cellulare" class="text-grey-7">
                  — Cell. <ContactLink
type="tel"
:value="v.Contatto.Numero_di_cellulare"
                /></span>
                <span v-if="v.Contatto?.Numero_di_telefono" class="text-grey-7">
                  — Tel. <ContactLink
type="tel"
:value="v.Contatto.Numero_di_telefono"
                /></span>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Vertical comparison with individual save -->
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Confronto dati</div>
        <div class="q-pb-md">
          <div v-for="field in leftFields" :key="field.key" class="q-mb-sm">
            <q-card flat bordered>
              <q-card-section class="q-pa-sm">
                <div class="text-subtitle2 text-weight-medium q-mb-xs">
                  {{ field.label }}
                </div>

                <div class="row items-center q-gutter-x-xs q-mb-xs">
                  <span class="text-caption text-grey-6">Inserito:</span>
                  <span class="text-body1">{{ getLeftValue(field.key) || '—' }}</span>
                  <template v-if="isFieldDifferent(field.key)">
                    <q-btn
                      flat
                      round
                      dense
                      icon="content_copy"
                      color="primary"
                      size="sm"
                      aria-label="Copia dal richiedente"
                      @click="copyField(field.key)"
                    >
                      <q-tooltip>Copia e salva</q-tooltip>
                    </q-btn>
                  </template>
                  <q-icon v-else name="check_circle" color="positive" size="xs">
                    <q-tooltip>Dati corrispondenti</q-tooltip>
                  </q-icon>
                </div>

                <div class="row items-center q-gutter-x-xs no-wrap">
                  <span class="text-caption text-grey-6">Database:</span>
                  <q-input
                    v-if="field.editable && isFieldDifferent(field.key)"
                    :model-value="rightValues[field.key]"
                    outlined
                    :color="isFieldDifferent(field.key) ? 'negative' : 'primary'"
                    :error="isFieldDifferent(field.key)"
                    :type="field.inputType || 'text'"
                    dense
                    class="col"
                    @update:model-value="val => setRightValue(field.key, val)"
                  />
                  <span v-else class="text-body1">{{ rightValues[field.key] || '—' }}</span>
                  <template v-if="isFieldDifferent(field.key)">
                    <q-btn
                      icon="check"
                      color="positive"
                      round
                      flat
                      dense
                      size="sm"
                      aria-label="Dato già corretto"
                      @click="confirmField(field.key)"
                    >
                      <q-tooltip>Dato già corretto</q-tooltip>
                    </q-btn>
                  </template>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Dati Bancari - Intestatario -->
        <div class="q-mb-sm">
          <q-card flat bordered>
            <q-card-section class="q-pa-sm">
              <div class="text-subtitle2 text-weight-medium q-mb-sm">Dati Bancari - Intestatario</div>
              <div>
                <div class="row items-center q-gutter-x-xs q-mb-xs">
                  <span class="text-caption text-grey-6">Inserito:</span>
                  <span class="text-body1">{{ getLeftValue('Intestatario') || '—' }}</span>
                  <template v-if="isFieldDifferent('Intestatario')">
                    <q-btn
                      flat
                      round
                      dense
                      icon="content_copy"
                      color="primary"
                      size="sm"
                      aria-label="Copia Intestatario"
                      @click="copyField('Intestatario')"
                    >
                      <q-tooltip>Copia e salva</q-tooltip>
                    </q-btn>
                  </template>
                  <q-icon v-else name="check_circle" color="positive" size="xs">
                    <q-tooltip>Dati corrispondenti</q-tooltip>
                  </q-icon>
                </div>
                <div class="row items-center q-gutter-x-xs no-wrap">
                  <span class="text-caption text-grey-6">Database:</span>
                  <q-input
                    v-if="isFieldDifferent('Intestatario')"
                    :model-value="rightValues.Intestatario"
                    outlined
                    dense
                    class="col"
                    :error="isFieldDifferent('Intestatario')"
                    :color="isFieldDifferent('Intestatario') ? 'negative' : 'primary'"
                    @update:model-value="val => setRightValue('Intestatario', val)"
                  />
                  <span v-else class="text-body1">{{ rightValues.Intestatario || '—' }}</span>
                  <template v-if="isFieldDifferent('Intestatario')">
                    <q-btn
                      icon="check"
                      color="positive"
                      round
                      flat
                      dense
                      size="sm"
                      aria-label="Dato già corretto"
                      @click="confirmField('Intestatario')"
                    >
                      <q-tooltip>Dato già corretto</q-tooltip>
                    </q-btn>
                  </template>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Dati Bancari - IBAN -->
        <div class="q-mb-sm">
          <q-card flat bordered>
            <q-card-section class="q-pa-sm">
              <div class="text-subtitle2 text-weight-medium q-mb-sm">Dati Bancari - IBAN</div>
              <div class="q-mb-sm">
                <div class="text-caption text-grey-6 q-mb-xs">Inserito:</div>
                <div class="row items-center q-gutter-x-xs">
                  <span class="text-body1">{{ getLeftValue('IBAN') || '—' }}</span>
                  <template v-if="isFieldDifferent('IBAN')">
                    <q-btn
                      flat
                      round
                      dense
                      icon="content_copy"
                      color="primary"
                      size="sm"
                      aria-label="Copia IBAN"
                      @click="copyField('IBAN')"
                    >
                      <q-tooltip>Copia e salva</q-tooltip>
                    </q-btn>
                  </template>
                  <q-icon v-else name="check_circle" color="positive" size="xs">
                    <q-tooltip>Dati corrispondenti</q-tooltip>
                  </q-icon>
                </div>
                <div class="text-caption text-grey-6 q-mt-xs q-mb-xs">Database:</div>
                <div class="row items-center q-gutter-x-xs no-wrap">
                  <q-input
                    v-if="isFieldDifferent('IBAN')"
                    :model-value="rightValues.IBAN"
                    outlined
                    dense
                    class="col"
                    :error="isFieldDifferent('IBAN')"
                    :color="isFieldDifferent('IBAN') ? 'negative' : 'primary'"
                    @update:model-value="val => setRightValue('IBAN', val)"
                  />
                  <span v-else class="text-body1">{{ rightValues.IBAN || '—' }}</span>
                  <template v-if="isFieldDifferent('IBAN')">
                    <q-btn
                      icon="check"
                      color="positive"
                      round
                      flat
                      dense
                      size="sm"
                      aria-label="Dato già corretto"
                      @click="confirmField('IBAN')"
                    >
                      <q-tooltip>Dato già corretto</q-tooltip>
                    </q-btn>
                  </template>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Progetto -->
        <div class="q-mt-lg">
          <div class="text-subtitle1 text-weight-medium q-mb-sm">Progetto</div>
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
            <div v-if="selectedProgetto" class="q-pb-md">
              <div v-for="field in projectFields" :key="field.key" class="q-mb-sm">
                <q-card flat bordered>
                  <q-card-section class="q-pa-sm">
                    <div class="text-subtitle2 text-weight-medium q-mb-xs">
                      {{ field.label }}
                    </div>

                    <div class="row items-center q-gutter-x-xs q-mb-xs">
                      <span class="text-caption text-grey-6">Inserito:</span>
                      <span class="text-body1">{{ getSubmissionProjectValue(field.key) || '—' }}</span>
                      <template v-if="isProjectFieldDifferent(field.key)">
                        <q-btn
                      flat
                      round
                      dense
                      icon="content_copy"
                      color="primary"
                      size="sm"
                      aria-label="Copia dal submission"
                          @click="copyProjectField(field.key)"
                        >
                          <q-tooltip>Copia e salva</q-tooltip>
                        </q-btn>
                      </template>
                      <q-icon v-else name="check_circle" color="positive" size="xs">
                        <q-tooltip>Dati corrispondenti</q-tooltip>
                      </q-icon>
                    </div>

                    <div class="row items-center q-gutter-x-xs no-wrap">
                      <span class="text-caption text-grey-6">Database:</span>
                      <q-input
                        v-if="isProjectFieldDifferent(field.key)"
                        :model-value="projectValues[field.key]"
                        outlined
                        dense
                        class="col"
                        :error="isProjectFieldDifferent(field.key)"
                        :color="isProjectFieldDifferent(field.key) ? 'negative' : 'primary'"
                        :disable="!field.editable"
                        @update:model-value="val => setProjectValue(field.key, val)"
                      />
                      <span v-else class="text-body1">{{ projectValues[field.key] || '—' }}</span>
                      <template v-if="field.saveable && isProjectFieldDifferent(field.key)">
                        <q-btn
                          icon="check"
                          color="positive"
                          round
                          flat
                          dense
                          size="sm"
                          aria-label="Dato già corretto"
                          @click="confirmProjectField(field.key)"
                        >
                          <q-tooltip>Dato già corretto</q-tooltip>
                        </q-btn>
                      </template>
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </template>
        </div>

        <!-- Giustificativo section -->
        <div class="q-mt-lg">
          <div class="text-subtitle1 text-weight-medium q-mb-sm">Giustificativo</div>
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
                :rules="[val => !!val || 'Campo obbligatorio']"
              />
              <div class="row q-col-gutter-sm q-mt-sm">
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="giustImporto"
                    label="Importo (€)"
                    outlined
                    dense
                    type="number"
                    data-testid="riconcilia-importo"
                    :rules="[val => !!val || 'Inserisci un importo']"
                  />
                </div>
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="giustData"
                    class="cursor-pointer"
                    label="Data"
                    outlined
                    dense
                    readonly
                    :rules="[val => !!val || 'Inserisci una data']"
                    @click="dateProxy?.show()"
                  >
                    <template #append>
                      <q-icon name="event" class="cursor-pointer">
                        <q-popup-proxy ref="dateProxy" cover>
                          <q-date
                            v-model="giustData"
                            mask="YYYY-MM-DD"
                            today-btn
                            @update:model-value="dateProxy.hide()"
                          />
                        </q-popup-proxy>
                      </q-icon>
                    </template>
                  </q-input>
                </div>
              </div>
              <q-separator v-if="submission?.allegato" class="q-my-sm" />
              <div v-if="submission?.allegato" class="row items-center q-gutter-sm q-pt-xs">
                <span class="text-caption text-grey-7 q-mr-xs">Allegato:</span>
                <a :href="assetUrl(submission.allegato)" target="_blank" class="text-primary">
                  <q-btn flat round dense icon="open_in_new" size="sm">
                    <q-tooltip>Apri allegato</q-tooltip>
                  </q-btn>
                </a>
                <a :href="assetUrl(submission.allegato, true)" class="text-primary">
                  <q-btn flat round dense icon="file_download" size="sm">
                    <q-tooltip>Scarica allegato</q-tooltip>
                  </q-btn>
                </a>
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
rows="2" />
        </div>
      </div>

      <q-separator />

      <div v-if="hasUnresolvedDiffs" class="q-px-md q-pt-sm">
        <div class="text-caption text-negative row items-center q-gutter-x-xs">
          <q-icon name="warning" size="xs" />
          <span>Risolvi tutte le differenze nei dati prima di creare il giustificativo</span>
        </div>
      </div>

      <q-card-actions align="right" class="q-pa-md q-pb-xl">
        <q-btn
v-close-popup
flat
dense
size="sm"
label="Annulla" />
        <q-btn
          label="Crea giustificativo"
          color="primary"
          dense
          size="sm"
          :disable="!selectedProgettoId || savingField !== null || hasUnresolvedDiffs"
          :loading="saving"
          data-testid="btn-crea-giustificativo"
          @click="confirmReconcile"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, computed, watch } from 'vue'
import ContactLink from 'components/Common/ContactLink.vue'
import { verificaService } from 'src/services/verifica.service'
import { assetUrl } from 'src/utils/assets'
import { displayFullName } from 'src/utils/formatters'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { useVerificaStore } from 'stores/verifica.store'

const $q = useQuasar()
const verificaStore = useVerificaStore()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  submission: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'reconcile'])

const model = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
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
  Cognome_Beneficiario: '',
  Nome_Beneficiario: '',
  Intestatario: '',
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
const dateProxy = ref(null)

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
  { key: 'Telefono', label: 'Telefono', editable: true, saveable: true }
]

const PROJECT_FIELD_MAP = {
  Cognome_Beneficiario: submission => submission.cognome_beneficiario || '',
  Nome_Beneficiario: submission => submission.nome_beneficiario || '',
  Intestatario: submission => submission.intestatario || ''
}

const projectFields = [
  { key: 'Cognome_Beneficiario', label: 'Cognome', editable: true, saveable: true },
  { key: 'Nome_Beneficiario', label: 'Nome', editable: true, saveable: true },
  { key: 'Intestatario', label: 'Intestatario', editable: true, saveable: true }
]

// Computed
const selectedProgetto = computed(
  () => progettiList.value.find(p => p.id_progetto === selectedProgettoId.value) || null
)

const progettoOptions = computed(() =>
  progettiList.value.map(p => ({
    label: `${[p.Cognome_Beneficiario, p.Nome_Beneficiario].filter(Boolean).join(' ')} (${p.AnnoBando || 'N/A'})`,
    value: p.id_progetto
  }))
)

const hasUnresolvedDiffs = computed(() => {
  const fieldKeys = leftFields.map(f => f.key)
  const bancariKeys = ['IBAN', 'Intestatario']
  const projectKeys = projectFields.map(f => f.key)
  for (const key of [...fieldKeys, ...bancariKeys]) {
    if (isFieldDifferent(key)) return true
  }
  for (const key of projectKeys) {
    if (isProjectFieldDifferent(key)) return true
  }
  return false
})

function getSubmissionProjectValue(key) {
  const submission = props.submission
  if (!submission) return ''
  if (key === 'Cognome_Beneficiario') return submission.cognome_beneficiario || ''
  if (key === 'Nome_Beneficiario') return submission.nome_beneficiario || ''
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
  const srcMapping = PROJECT_FIELD_MAP[key]
  if (!srcMapping || !props.submission) return
  const val = typeof srcMapping === 'function' ? srcMapping(props.submission) : props.submission[srcMapping] || ''
  if (!val) return

  projectValues.value[key] = val
  projectConfirmedFields.value.delete(key)
  saveProjectField(key)
}

async function saveProjectField(key) {
  if (!selectedProgetto.value) return
  savingProjectField.value = key
  try {
    const val = projectValues.value[key]
    const fieldMap = {
      Cognome_Beneficiario: 'Cognome_Beneficiario',
      Nome_Beneficiario: 'Nome_Beneficiario',
      Intestatario: 'Interstatario_CC'
    }
    const directusField = fieldMap[key]
    if (directusField && val) {
      await verificaService.updateProgetto(selectedProgetto.value.id_progetto, { [directusField]: val })
      notifySuccess($q, `${key} aggiornato`)
    }
  } catch (error) {
    notifyError($q, error, `${key}: Errore aggiornamento`)
  } finally {
    savingProjectField.value = null
  }
}

function initProjectValues() {
  if (!selectedProgetto.value) {
    projectValues.value = { Cognome_Beneficiario: '', Nome_Beneficiario: '', Intestatario: '' }
    return
  }
  projectValues.value = {
    Cognome_Beneficiario: selectedProgetto.value.Cognome_Beneficiario || '',
    Nome_Beneficiario: selectedProgetto.value.Nome_Beneficiario || '',
    Intestatario: selectedProgetto.value.Interstatario_CC || ''
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

  rightValues.value[key] = val
  confirmedFields.value.delete(key)
  saveField(key)
}

async function saveField(key) {
  savingField.value = key
  try {
    const val = rightValues.value[key]
    await verificaStore.reconcileUpdateField(contattoIdRef.value, famigliaIdRef.value, key, val)
    notifySuccess($q, `${leftFields.find(f => f.key === key)?.label || key} aggiornato`)
  } catch (error) {
    notifyError($q, error, `${key}: Errore sconosciuto`)
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
  } catch {
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
  projectValues.value = {
    Cognome_Beneficiario: '',
    Nome_Beneficiario: '',
    Intestatario: '',
    AnnoBando: '',
    Allocato: '',
    Titolo: ''
  }
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
      await Promise.all([loadFamigliaMembers(ctx.famigliaId), loadProgetti(ctx.famigliaId)])

      if (progettiList.value.length === 1) {
        selectedProgettoId.value = progettiList.value[0].id_progetto
        initProjectValues()
      }
    } else {
      // no famigliaId
    }
    if (!contattoIdRef.value && !famigliaIdRef.value) {
      notifyError($q, null, 'Impossibile caricare i dati del contatto. Verifica che l\'email sia corretta.')
    }
  } catch {
    notifyError($q, null, 'Errore nel caricamento dei dati per la riconciliazione.')
  }
}

async function confirmReconcile() {
  if (!selectedProgettoId.value) return
  saving.value = true
  try {
    const allCopiedFields = [...confirmedFields.value, ...[...projectConfirmedFields.value].map(f => `Progetto_${f}`)]
    emit('reconcile', {
      submissionId: props.submission?.id,
      contattoId: contattoIdRef.value,
      emailRecordId: null,
      famigliaId: famigliaIdRef.value,
      progettoId: selectedProgettoId.value,
      note: note.value,
      descrizione: giustDescrizione.value,
      importo: Number.parseFloat(giustImporto.value) || 0,
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
  if (Number.isNaN(d.getTime())) return isoStr.slice(0, 10)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
</script>
