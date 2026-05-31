<template>
  <q-page class="q-pa-md verifica-page">
    <div class="page-inner">
      <q-tabs v-model="verificaTab" class="q-mb-md">
        <q-tab name="rendicontazione" label="Rendicontazione" />
        <q-tab
          v-if="canVerifica"
          name="riconciliazione"
          label="Da riconciliare"
          :badge="store.submissions.length || undefined"
        />
      </q-tabs>

      <q-tab-panels v-model="verificaTab">
        <q-tab-panel name="rendicontazione">
          <div class="row items-center q-gutter-sm q-mb-md">
            <div>
              <div class="text-h5 text-weight-medium">Verifica rendicontazione</div>
              <div class="text-body2 text-grey-7">
                Controllo delle tranche, importi rimborsabili e verifica giustificativi.
              </div>
            </div>
            <q-space />
            <q-btn
              flat
              round
              icon="refresh"
              :loading="store.loading"
              @click="store.fetchAll"
            >
              <q-tooltip>Aggiorna dati</q-tooltip>
            </q-btn>
            <q-btn
              color="primary"
              icon="download"
              label="Export ASPI"
              :disable="aspiRows.length === 0"
              @click="exportAspi"
            />
          </div>

          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-sm-6 col-md-3">
              <q-input
                v-model="search"
                outlined
                dense
                debounce="300"
                label="Cerca famiglia"
              >
                <template #prepend>
                  <q-icon name="search" />
                </template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-select
                v-model="selectedTranche"
                :options="trancheOptions"
                emit-value
                map-options
                outlined
                dense
                label="Tranche"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-select
                v-model="selectedAnno"
                :options="annoOptions"
                emit-value
                map-options
                outlined
                dense
                clearable
                label="Anno bando"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-select
                v-model="rendicontazioneFilter"
                :options="rendicontazioneOptions"
                emit-value
                map-options
                outlined
                dense
                label="Rendicontazione"
              />
            </div>
          </div>

          <div class="summary-grid q-mb-md">
            <div class="summary-cell">
              <div class="text-caption text-grey-7">Famiglie/progetti</div>
              <div class="text-h6">{{ filteredRows.length }}</div>
            </div>
            <div class="summary-cell">
              <div class="text-caption text-grey-7">Rendicontato tranche</div>
              <div class="text-h6 text-primary">{{ formatCurrency(selectedTotals.rendicontato) }}</div>
            </div>
            <div class="summary-cell">
              <div class="text-caption text-grey-7">Rimborsabile 80%</div>
              <div class="text-h6 text-positive">{{ formatCurrency(selectedTotals.rimborsabile) }}</div>
            </div>
            <div class="summary-cell">
              <div class="text-caption text-grey-7">Pronte per ASPI</div>
              <div class="text-h6">{{ aspiRows.length }}</div>
            </div>
          </div>

          <q-banner v-if="store.error" class="bg-red-1 text-negative q-mb-md" rounded>
            {{ store.error }}
          </q-banner>

          <q-table
            flat
            bordered
            class="verifica-table"
            row-key="idProgetto"
            :rows="filteredRows"
            :columns="columns"
            :loading="store.loading"
            :pagination="{
              page: store.pagination.page,
              rowsPerPage: store.pagination.limit,
              rowsNumber: store.totalCount,
              sortBy: store.pagination.sortBy,
              descending: store.pagination.descending
            }"
            @request="onRequest"
            binary-state-sort
          >
            <template v-slot:header="props">
              <q-tr :props="props">
                <q-th auto-width />
                <q-th v-for="col in props.cols" :key="col.name" :props="props">
                  {{ col.label }}
                </q-th>
              </q-tr>
            </template>

            <template v-slot:body="props">
              <q-tr :props="props">
                <q-td auto-width>
                  <q-btn
                    flat
                    round
                    dense
                    :icon="props.expand ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
                    @click="toggleExpand(props)"
                  >
                    <q-tooltip>{{ props.expand ? 'Chiudi' : 'Apri dettagli' }}</q-tooltip>
                  </q-btn>
                </q-td>
                <q-td v-for="col in props.cols" :key="col.name" :props="props">
                  <template v-if="col.name === 'famiglia'">
                    <div class="text-weight-medium">{{ props.row.famiglia || 'Famiglia senza nome' }}</div>
                    <div class="text-caption text-grey-7">{{ props.row.beneficiario || '' }} — ID {{ props.row.idFamiglia || '-' }}</div>
                  </template>

                  <template v-else-if="col.name === 'datiBancari'">
                    <div class="row items-center q-gutter-xs">
                      <div class="col">
                        <q-badge
                          :color="props.row.iban && props.row.intestatario ? 'positive' : 'warning'"
                          outline
                        >
                          {{ props.row.iban && props.row.intestatario ? 'Completi' : 'Da completare' }}
                        </q-badge>
                        <div class="text-caption ellipsis">{{ props.row.iban || 'IBAN mancante' }}</div>
                      </div>
                      <q-btn
                        flat
                        round
                        dense
                        size="sm"
                        icon="edit"
                        @click="openBancariDialog(props.row)"
                      >
                        <q-tooltip>Modifica dati bancari</q-tooltip>
                      </q-btn>
                    </div>
                  </template>

                  <template v-else-if="col.name === 'allocato'">
                    <div class="text-weight-medium">{{ formatCurrency(props.row.allocato) }}</div>
                  </template>

                  <template v-else-if="col.name === 'selectedTranche'">
                    <template v-if="selectedTranche">
                      <div class="text-weight-medium">
                        {{ formatCurrency(props.row.tranche[selectedTranche].rendicontato) }}
                      </div>
                      <div class="text-caption text-grey-7">
                        {{ props.row.tranche[selectedTranche].count }} giustificativi
                      </div>
                    </template>
                    <template v-else>
                      <div class="text-weight-medium">
                        {{ formatCurrency(props.row.totaleRendicontato) }}
                      </div>
                      <div class="text-caption text-grey-7">
                        {{ totalGiustificativi(props.row) }} giustificativi
                      </div>
                    </template>
                  </template>

                  <template v-else-if="col.name === 'rimborsabile'">
                    <div class="text-positive text-weight-medium">
                      {{ formatCurrency(props.row.totaleRimborsabile) }}
                    </div>
                  </template>

                  <template v-else-if="col.name === 'stato'">
                    <q-badge :color="statoRiga(props.row).color">
                      {{ statoRiga(props.row).label }}
                    </q-badge>
                  </template>

                  <template v-else-if="col.name === 'actions'">
                    <q-btn
                      v-if="canVerifica"
                      flat
                      round
                      dense
                      icon="add_circle"
                      color="secondary"
                      @click="addingForRow = props.row"
                    >
                      <q-tooltip>Aggiungi giustificativo</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="content_copy"
                      @click="copyAspiLine(props.row)"
                    >
                      <q-tooltip>Copia riga ASPI</q-tooltip>
                    </q-btn>
                  </template>

                  <template v-else>
                    {{ col.value }}
                  </template>
                </q-td>
              </q-tr>
              <q-tr v-show="props.expand" :props="props">
                <q-td colspan="100%" class="q-pa-none">
                  <div class="expandable-content">
                    <div class="q-px-md q-pt-md q-pb-xs">
                      <div class="text-subtitle2 text-grey-8 q-mb-xs">Genitori</div>
                      <div v-if="contattiLoading && !genitoriCache[props.row.idFamiglia]" class="text-caption text-grey">
                        <q-spinner size="xs" /> Caricamento...
                      </div>
                      <div v-else-if="!genitoriCache[props.row.idFamiglia] || genitoriCache[props.row.idFamiglia].length === 0" class="text-caption text-grey">
                        Nessun genitore assegnato.
                      </div>
                      <q-list v-else dense class="q-mb-sm">
                        <q-item v-for="g in genitoriCache[props.row.idFamiglia]" :key="g.id" dense class="q-px-none q-py-xs">
                          <q-item-section>
                            <q-item-label class="text-body2">
                              {{ g.Contatto?.Nome || '' }} {{ g.Contatto?.Cognome || '' }}
                              <template v-for="em in g._emails" :key="em.email_address">
                                <q-icon name="email" size="xs" class="q-ml-sm q-mr-xs text-grey-6" />
                                <span class="text-caption text-grey-7">{{ em.email_address }}</span>
                                <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs q-mr-xs" />
                              </template>
                              <q-icon v-if="g.Contatto?.Numero_di_cellulare" name="smartphone" size="xs" class="q-ml-sm q-mr-xs text-grey-6" />
                              <span v-if="g.Contatto?.Numero_di_cellulare" class="text-caption text-grey-7">{{ g.Contatto.Numero_di_cellulare }}</span>
                              <q-icon v-if="g.Contatto?.Numero_di_telefono" name="phone" size="xs" class="q-ml-sm q-mr-xs text-grey-6" />
                              <span v-if="g.Contatto?.Numero_di_telefono" class="text-caption text-grey-7">{{ g.Contatto.Numero_di_telefono }}</span>
                            </q-item-label>
                          </q-item-section>
                        </q-item>
                      </q-list>
                      <div class="text-subtitle2 text-grey-8 q-mb-xs q-mt-md">Volontari</div>
                      <div v-if="contattiLoading && !volontariCache[props.row.idFamiglia]" class="text-caption text-grey">
                        <q-spinner size="xs" /> Caricamento...
                      </div>
                      <div v-else-if="!volontariCache[props.row.idFamiglia] || volontariCache[props.row.idFamiglia].length === 0" class="text-caption text-grey">
                        Nessun volontario assegnato.
                      </div>
                      <q-list v-else dense class="q-mb-sm">
                        <q-item v-for="v in volontariCache[props.row.idFamiglia]" :key="v.id" dense class="q-px-none q-py-xs">
                          <q-item-section>
                            <q-item-label class="text-body2">
                              {{ v.Contatto?.Nome || '' }} {{ v.Contatto?.Cognome || '' }}
                              <template v-for="em in v._emails" :key="em.email_address">
                                <q-icon name="email" size="xs" class="q-ml-sm q-mr-xs text-grey-6" />
                                <span class="text-caption text-grey-7">{{ em.email_address }}</span>
                                <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs q-mr-xs" />
                              </template>
                              <q-icon v-if="v.Contatto?.Numero_di_cellulare" name="smartphone" size="xs" class="q-ml-sm q-mr-xs text-grey-6" />
                              <span v-if="v.Contatto?.Numero_di_cellulare" class="text-caption text-grey-7">{{ v.Contatto.Numero_di_cellulare }}</span>
                              <q-icon v-if="v.Contatto?.Numero_di_telefono" name="phone" size="xs" class="q-ml-sm q-mr-xs text-grey-6" />
                              <span v-if="v.Contatto?.Numero_di_telefono" class="text-caption text-grey-7">{{ v.Contatto.Numero_di_telefono }}</span>
                            </q-item-label>
                          </q-item-section>
                        </q-item>
                      </q-list>
                      <q-separator />
                    </div>
                    <div class="text-subtitle2 q-px-md q-pt-md q-pb-xs text-grey-8">
                      Giustificativi — {{ props.row.annoBando || 'N/A' }}
                    </div>

                    <q-list v-if="props.row.giustificativi.length > 0" dense separator class="giust-sub-list">
                      <q-item
                        v-for="g in props.row.giustificativi"
                        :key="g.id"
                        class="giust-item"
                      >
                        <q-item-section class="col-3">
                          <InlineEditableField
                            :model-value="g.Descrizione"
                            label="Descrizione"
                            type="text"
                            :readonly="!canVerifica || g.Stato !== 'Inviato'"
                            :saving="savingField === `${g.id}-Descrizione`"
                            @save="(val) => handleFieldSave(props.row.idProgetto, g, 'Descrizione', val)"
                          />
                          <div v-if="g.NotaVolontario" class="text-caption text-grey-6 q-mt-xs ellipsis-2">
                            {{ g.NotaVolontario }}
                          </div>
                        </q-item-section>

                        <q-item-section class="col-2">
                          <InlineEditableField
                            :model-value="g.Importo"
                            label="Importo"
                            type="number"
                            :readonly="!canVerifica || g.Stato !== 'Inviato'"
                            :format-display="(v) => formatCurrency(v)"
                            :saving="savingField === `${g.id}-Importo`"
                            @save="(val) => handleFieldSave(props.row.idProgetto, g, 'Importo', parseFloat(val))"
                          />
                        </q-item-section>

                        <q-item-section class="col-2">
                          <InlineEditableField
                            :model-value="g.Data"
                            label="Data"
                            type="date"
                            :readonly="!canVerifica || g.Stato !== 'Inviato'"
                            :format-display="(v) => formatDate(v) || '—'"
                            :saving="savingField === `${g.id}-Data`"
                            @save="(val) => handleFieldSave(props.row.idProgetto, g, 'Data', val)"
                          />
                        </q-item-section>

                        <q-item-section class="col-2">
                          <div v-if="g.Allegato" class="row q-gutter-x-xs">
                            <a
                              :href="assetUrl(g.Allegato)"
                              target="_blank"
                              class="text-body2"
                            >Apri</a>
                            <span class="text-grey-5">|</span>
                            <a
                              :href="assetUrl(g.Allegato, true)"
                              class="text-body2"
                            >Scarica</a>
                          </div>
                          <div v-else class="text-grey-5 text-body2">
                            —
                          </div>
                        </q-item-section>

                        <q-item-section class="col-1">
                          <q-badge :color="statoColor(g.Stato)" outline>
                            {{ statoLabel(g.Stato) }}
                          </q-badge>
                        </q-item-section>

                        <q-item-section class="col-2">
                          <div v-if="g.Stato === 'Inviato'" class="row q-gutter-xs">
                            <q-btn
                              dense
                              flat
                              icon="check_circle"
                              color="primary"
                              size="sm"
                              :loading="verifyingId === g.id"
                              @click="handleVerify(props.row.idProgetto, g)"
                            >
                              <q-tooltip>Verifica</q-tooltip>
                            </q-btn>
                            <q-btn
                              dense
                              flat
                              icon="cancel"
                              color="negative"
                              size="sm"
                              @click="handleReject(props.row.idProgetto, g)"
                            >
                              <q-tooltip>Rifiuta</q-tooltip>
                            </q-btn>
                          </div>
                          <div v-else-if="g.Stato === 'Verificato'" class="text-positive row items-center q-gutter-xs">
                            <q-icon name="check_circle" size="sm" />
                            <span class="text-body2">Verificato</span>
                          </div>
                          <div v-else-if="g.Stato === 'Rifiutato'">
                            <div class="text-negative row items-center q-gutter-xs">
                              <q-icon name="cancel" size="sm" />
                              <span class="text-body2">Rifiutato</span>
                            </div>
                            <div v-if="g.NotaRifiuto" class="text-caption text-grey-7 q-mt-xs" style="max-width: 200px; white-space: normal;">
                              {{ g.NotaRifiuto }}
                            </div>
                          </div>
                        </q-item-section>
                      </q-item>
                    </q-list>

                    <div v-else class="q-pa-md text-grey-5 text-center">
                      Nessun giustificativo per questo progetto.
                    </div>
                  </div>
                </q-td>
              </q-tr>
            </template>
          </q-table>
        </q-tab-panel>

        <q-tab-panel name="riconciliazione">
          <div class="row items-center q-gutter-sm q-mb-md">
            <div class="text-h5 text-weight-medium">Da riconciliare</div>
            <q-space />
            <q-btn
              flat
              round
              icon="refresh"
              :loading="store.submissionsLoading"
              @click="store.fetchSubmissions()"
            >
              <q-tooltip>Aggiorna</q-tooltip>
            </q-btn>
            <q-btn
              v-if="store.submissions.length > 0"
              flat
              color="primary"
              icon="auto_fix_high"
              label="Riconcilia automaticamente"
              @click="handleAutoReconcileAll"
            />
          </div>

          <q-table
            flat
            bordered
            row-key="id"
            :rows="store.submissions"
            :columns="submissionColumns"
            :loading="store.submissionsLoading"
            :pagination="{ rowsPerPage: 25 }"
          >
            <template v-slot:body-cell-allegato="props">
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

            <template v-slot:body-cell-importo="props">
              <q-td :props="props">
                {{ formatCurrency(props.value) }}
              </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <div class="row q-gutter-xs">
                  <q-btn
                    dense
                    flat
                    icon="fact_check"
                    color="primary"
                    size="sm"
                    @click="openRiconcilia(props.row)"
                  >
                    <q-tooltip>Riconcilia</q-tooltip>
                  </q-btn>
                  <q-btn
                    dense
                    flat
                    icon="delete"
                    color="negative"
                    size="sm"
                    @click="handleScarta(props.row)"
                  >
                    <q-tooltip>Scarta</q-tooltip>
                  </q-btn>
                </div>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>
      </q-tab-panels>

      <q-dialog v-model="bancariDialog" persistent>
        <q-card style="min-width: 400px">
          <q-card-section>
            <div class="text-h6">Modifica dati bancari</div>
            <div class="text-caption text-grey-7">
              {{ editingRow?.famiglia }} — {{ editingRow?.beneficiario }}
            </div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <q-input
              v-model="editIban"
              outlined
              dense
              label="IBAN"
              class="q-mb-md"
              :rules="[val => !val || /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/i.test(val) || 'IBAN non valido']"
            />
            <q-input
              v-model="editIntestatario"
              outlined
              dense
              label="Intestatario conto corrente"
            />
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Annulla" color="negative" v-close-popup />
            <q-btn
              flat
              label="Salva"
              color="primary"
              :loading="savingBancari"
              @click="saveBancari"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-dialog v-model="rejectDialog" persistent>
        <q-card style="min-width: 400px">
          <q-card-section>
            <div class="text-h6">Rifiuta giustificativo</div>
            <div class="text-caption text-grey-7">
              {{ rejectItem?.Descrizione || '' }}
            </div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <q-input
              v-model="rejectNota"
              outlined
              dense
              autofocus
              label="Motivazione del rifiuto *"
              type="textarea"
              :rules="[val => !!val || 'Inserisci una motivazione']"
            />
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Annulla" color="negative" v-close-popup />
            <q-btn
              flat
              label="Rifiuta"
              color="negative"
              :disable="!rejectNota"
              :loading="rejectingId === rejectItem?.id"
              @click="confirmReject"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <GiustificativoForm
        v-model="showAddForm"
        :progetto-id="addingForRow?.idProgetto || ''"
        :famiglia-id="addingForRow?.idFamiglia || ''"
        :anno-bando="addingForRow?.annoBando || ''"
        @save="handleAddSave"
      />

      <RiconciliaDialog
        v-model="riconciliaDialog"
        :submission="reconcilingSubmission"
        @reconcile="handleRiconcilia"
      />
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { copyToClipboard, useQuasar } from 'quasar'
import { TRANCHE, useVerificaStore } from 'stores/verifica.store'
import { verificaService } from 'src/services/verifica.service'
import { formatCurrency, formatDate, statoLabel, statoColor } from 'src/utils/formatters'
import { API_URL, STORAGE_KEYS, FOLDERS } from 'src/utils/constants'
import { useAuthStore } from 'stores/auth.store'
import { filesService } from 'src/services/files.service'
import { giustificativiService } from 'src/services/giustificativi.service'
import { famiglieService } from 'src/services/famiglie.service'
import InlineEditableField from 'components/Common/InlineEditableField.vue'
import GiustificativoForm from 'components/Giustificativi/GiustificativoForm.vue'
import RiconciliaDialog from 'components/RiconciliaDialog.vue'

const $q = useQuasar()
const store = useVerificaStore()
const authStore = useAuthStore()

const selectedTranche = ref(null)
const selectedAnno = ref(null)
const rendicontazioneFilter = ref('tutte')
const search = ref('')
const verifyingId = ref(null)
const rejectingId = ref(null)
const savingField = ref(null)
const addingForRow = ref(null)
const showAddForm = computed({
  get: () => addingForRow.value !== null,
  set: (val) => { if (!val) addingForRow.value = null }
})
const verificaTab = ref('rendicontazione')
const riconciliaDialog = ref(false)
const reconcilingSubmission = ref(null)

const bancariDialog = ref(false)
const editingRow = ref(null)
const genitoriCache = ref({})
const volontariCache = ref({})
const contattiLoading = ref(false)
const editIban = ref('')
const editIntestatario = ref('')
const savingBancari = ref(false)

const rejectDialog = ref(false)
const rejectNota = ref('')
const rejectItem = ref(null)
const rejectProgettoId = ref(null)

const trancheOptions = computed(() => {
  const active = TRANCHE
    .filter(t => store.rows.some(row => row.tranche[t.value].count > 0))
    .map(t => ({ label: t.label, value: t.value }))
  return [{ label: 'Tutte', value: null }, ...active]
})

const annoOptions = computed(() => store.anniBando.map(anno => ({
  label: String(anno),
  value: anno
})))

const rendicontazioneOptions = [
  { label: 'Solo con importi', value: 'con_importi' },
  { label: 'Tutte', value: 'tutte' },
  { label: 'Solo mancanti', value: 'mancanti' }
]

const canVerifica = computed(() => authStore.canVerifica)

const submissionColumns = [
  { name: 'data_invio', label: 'Data invio', field: 'data_invio', align: 'left', sortable: true },
  { name: 'richiedente', label: 'Richiedente', field: row => `${row.nome_richiedente || ''} ${row.cognome_richiedente || ''}`, align: 'left' },
  { name: 'email', label: 'Email', field: 'email', align: 'left' },
  { name: 'beneficiario', label: 'Beneficiario', field: row => `${row.nome_beneficiario || ''} ${row.cognome_beneficiario || ''}`, align: 'left' },
  { name: 'importo', label: 'Importo', field: 'importo', align: 'right' },
  { name: 'allegato', label: 'Allegato', field: 'allegato', align: 'left' },
  { name: 'actions', label: '', field: 'id', align: 'right' }
]

const columns = computed(() => [
  { name: 'annoBando', label: 'Bando', field: 'annoBando', align: 'left', sortable: true },
  { name: 'famiglia', label: 'Famiglia', field: 'famiglia', align: 'left', sortable: true },
  { name: 'datiBancari', label: 'Dati bancari', field: 'iban', align: 'left' },
  {
    name: 'allocato',
    label: 'Allocato',
    field: 'allocato',
    align: 'right',
    sortable: true
  },
  {
    name: 'selectedTranche',
    label: `Rendicontato ${trancheLabel.value}`,
    field: row => selectedTranche.value
      ? row.tranche[selectedTranche.value].rendicontato
      : row.totaleRendicontato,
    align: 'right',
    sortable: true
  },
  {
    name: 'rimborsabile',
    label: 'Rimborsabile',
    field: 'totaleRimborsabile',
    align: 'right',
    sortable: true
  },
  { name: 'stato', label: 'Stato', field: 'id', align: 'left' },
  { name: 'actions', label: '', field: 'id', align: 'right' }
])

const trancheLabel = computed(() => {
  if (!selectedTranche.value) return '(tutte)'
  return TRANCHE.find(t => t.value === selectedTranche.value)?.label || ''
})

const filteredRows = computed(() => {
  return store.rows.filter(row => {
    if (selectedTranche.value && row.tranche[selectedTranche.value].count === 0) return false

    const rendicontato = selectedTranche.value
      ? row.tranche[selectedTranche.value].rendicontato
      : row.totaleRendicontato

    if (rendicontazioneFilter.value === 'con_importi' && rendicontato === 0) return false
    if (rendicontazioneFilter.value === 'mancanti' && rendicontato > 0) return false

    return true
  })
})

const selectedTotals = computed(() => {
  return filteredRows.value.reduce((totals, row) => {
    if (selectedTranche.value) {
      totals.rendicontato += row.tranche[selectedTranche.value].rendicontato
    } else {
      totals.rendicontato += row.totaleRendicontato
    }
    totals.rimborsabile += row.totaleRimborsabile
    return totals
  }, { rendicontato: 0, rimborsabile: 0 })
})

const aspiRows = computed(() => {
  return filteredRows.value.filter(row => {
    if (row.totaleRimborsabile <= 0 || !row.iban || !row.intestatario) return false
    if (selectedTranche.value && hasPendingGiustificativi(row, selectedTranche.value)) return false
    return true
  })
})

onMounted(() => {
  store.fetchAnni()
  if (canVerifica.value) {
    store.fetchSubmissions()
  }
  loadData()
})

let loadingData = false

async function loadData() {
  if (loadingData) return
  loadingData = true
  try {
    await store.fetchAll({
      search: search.value || undefined,
      anno: selectedAnno.value || undefined
    })
  } finally {
    loadingData = false
  }
}

async function onRequest(props) {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  const changed = page !== store.pagination.page ||
    rowsPerPage !== store.pagination.limit ||
    sortBy !== store.pagination.sortBy ||
    descending !== store.pagination.descending
  if (!changed && store.rows.length > 0) return

  store.pagination.page = page
  if (rowsPerPage) store.pagination.limit = rowsPerPage
  store.pagination.sortBy = sortBy
  store.pagination.descending = descending
  await loadData()
}

watch([search, selectedAnno], () => {
  store.pagination.page = 1
  loadData()
})

function hasPendingGiustificativi(row, trancheValue) {
  return row.giustificativi.some(g => {
    if (g.Stato !== 'Inviato') return false
    const relTranche = g._rendicontazione
      ? String(g._rendicontazione.Tranche || '').toLowerCase()
      : ''
    if (relTranche === trancheValue) return true
    const directTranche = (g.Tranche || '').toLowerCase()
    if (directTranche === trancheValue) return true
    const month = g.Data ? new Date(g.Data).getMonth() + 1 : null
    const monthMap = { 7: 'luglio', 9: 'settembre', 11: 'novembre', 2: 'febbraio' }
    return month && monthMap[month] === trancheValue
  })
}

function totalGiustificativi(row) {
  return TRANCHE.reduce((sum, t) => sum + row.tranche[t.value].count, 0)
}

function statoRiga(row) {
  const tranche = selectedTranche.value ? row.tranche[selectedTranche.value] : null
  const rendicontato = tranche ? tranche.rendicontato : row.totaleRendicontato
  if (rendicontato === 0) {
    return { label: 'Non ricevuta', color: 'grey' }
  }
  if (!row.iban || !row.intestatario) {
    return { label: 'Dati bancari mancanti', color: 'warning' }
  }
  if (selectedTranche.value && hasPendingGiustificativi(row, selectedTranche.value)) {
    return { label: 'Da verificare', color: 'orange' }
  }
  return { label: 'Pronta ASPI', color: 'positive' }
}

async function loadFamigliaContatti(famigliaId) {
  if (!famigliaId) return
  if (genitoriCache.value[famigliaId] && volontariCache.value[famigliaId]) return
  contattiLoading.value = true
  try {
    const [genRes, volRes] = await Promise.all([
      famiglieService.getGenitoriByFamiglia(famigliaId),
      famiglieService.getVolontariByFamiglia(famigliaId)
    ])
    const genitori = genRes.data.data || []
    const volontari = volRes.data.data || []
    const allIds = [
      ...genitori.map(i => i.Contatto?.id_contatto),
      ...volontari.map(i => i.Contatto?.id_contatto)
    ].filter(Boolean)
    if (allIds.length > 0) {
      const emailRes = await famiglieService.getEmailByContatto(allIds)
      const emailByContatto = {}
      for (const e of (emailRes.data.data || [])) {
        if (e.Contatto_Relation) {
          if (!emailByContatto[e.Contatto_Relation]) emailByContatto[e.Contatto_Relation] = []
          emailByContatto[e.Contatto_Relation].push({ email_address: e.email_address, Primary: e.Primary === true })
        }
      }
      for (const item of [...genitori, ...volontari]) {
        if (item.Contatto?.id_contatto) {
          item._emails = emailByContatto[item.Contatto.id_contatto] || []
        }
      }
    }
    genitoriCache.value = { ...genitoriCache.value, [famigliaId]: genitori }
    volontariCache.value = { ...volontariCache.value, [famigliaId]: volontari }
  } catch {
    genitoriCache.value = { ...genitoriCache.value, [famigliaId]: [] }
    volontariCache.value = { ...volontariCache.value, [famigliaId]: [] }
  } finally {
    contattiLoading.value = false
  }
}

function toggleExpand(props) {
  props.expand = !props.expand
  if (props.expand) loadFamigliaContatti(props.row.idFamiglia)
}

function openBancariDialog(row) {
  editingRow.value = row
  editIban.value = row.iban || ''
  editIntestatario.value = row.intestatario || ''
  bancariDialog.value = true
}

async function saveBancari() {
  if (!editingRow.value) return
  savingBancari.value = true
  try {
    const data = {}
    if (editIban.value !== (editingRow.value.iban || '')) data.IBAN = editIban.value
    if (editIntestatario.value !== (editingRow.value.intestatario || '')) data.Intestatario_CC = editIntestatario.value
    if (Object.keys(data).length === 0) {
      bancariDialog.value = false
      return
    }
    await verificaService.updateFamiglia(editingRow.value.idFamiglia, data)
    store.rows.forEach(r => {
      if (r.idFamiglia === editingRow.value.idFamiglia) {
        r.iban = editIban.value
        r.intestatario = editIntestatario.value
      }
    })
    $q.notify({ type: 'positive', message: 'Dati bancari aggiornati' })
    bancariDialog.value = false
  } catch {
    $q.notify({ type: 'negative', message: 'Errore nell\'aggiornamento' })
  } finally {
    savingBancari.value = false
  }
}

function assetUrl(fileId, download = false) {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  const params = download
    ? `?download=1&access_token=${token}`
    : `?access_token=${token}`
  return `${API_URL}/assets/${fileId}${params}`
}

async function handleVerify(progettoId, item) {
  verifyingId.value = item.id
  try {
    await store.verifyGiustificativo(progettoId, item.id)
    $q.notify({ type: 'positive', message: 'Giustificativo verificato' })
  } catch {
    $q.notify({ type: 'negative', message: 'Errore nella verifica' })
  } finally {
    verifyingId.value = null
  }
}

function handleReject(progettoId, item) {
  rejectProgettoId.value = progettoId
  rejectItem.value = item
  rejectNota.value = ''
  rejectDialog.value = true
}

async function handleFieldSave(progettoId, item, field, value) {
  savingField.value = `${item.id}-${field}`
  try {
    await store.updateGiustificativoField(progettoId, item.id, field, value)
    $q.notify({ type: 'positive', message: 'Campo aggiornato' })
  } catch {
    $q.notify({ type: 'negative', message: "Errore nell'aggiornamento" })
  } finally {
    savingField.value = null
  }
}

async function handleAddSave(formData) {
  const row = addingForRow.value
  if (!row) return
  try {
    let allegatoId = null
    if (formData.File) {
      const uploadRes = await filesService.upload(formData.File, FOLDERS.GIUSTIFICATIVI)
      allegatoId = uploadRes.data.data.id
    }
    await giustificativiService.create({
      Descrizione: formData.Descrizione,
      Importo: formData.Importo,
      Data: formData.Data,
      Tranche: formData.Tranche,
      Stato: formData.Stato,
      NotaVolontario: formData.NotaVolontario || '',
      Progetto: formData.Progetto,
      Famiglia: formData.Famiglia,
      AnnoBando: formData.AnnoBando,
      Allegato: allegatoId
    })
    $q.notify({ type: 'positive', message: 'Giustificativo creato' })
    addingForRow.value = null
    await store.fetchAll()
  } catch {
    $q.notify({ type: 'negative', message: 'Errore nella creazione' })
  }
}

function openRiconcilia(submission) {
  reconcilingSubmission.value = submission
  riconciliaDialog.value = true
}

async function handleRiconcilia({ submissionId, famigliaId, progettoId, note }) {
  try {
    await store.reconcileSubmission(submissionId, famigliaId, progettoId, note)
    $q.notify({ type: 'positive', message: 'Giustificativo creato e riconciliato' })
    riconciliaDialog.value = false
    reconcilingSubmission.value = null
  } catch {
    $q.notify({ type: 'negative', message: 'Errore nella riconciliazione' })
  }
}

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
    } catch {
      $q.notify({ type: 'negative', message: 'Errore nello scarto' })
    }
  })
}

async function handleAutoReconcileAll() {
  const count = store.submissions.length
  if (count === 0) return
  $q.dialog({
    title: 'Riconciliazione automatica',
    message: `Tentare la riconciliazione automatica per ${count} submission?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    let done = 0
    for (const s of [...store.submissions]) {
      const ok = await store.tryAutoReconcile(s.id)
      if (ok) done++
    }
    if (done > 0) {
      $q.notify({ type: 'positive', message: `${done} submission riconciliate automaticamente` })
    } else {
      $q.notify({ type: 'info', message: 'Nessuna submission riconciliabile automaticamente' })
    }
  })
}

async function confirmReject() {
  if (!rejectNota.value || !rejectItem.value) return
  rejectingId.value = rejectItem.value.id
  try {
    await store.rejectGiustificativo(rejectProgettoId.value, rejectItem.value.id, rejectNota.value)
    $q.notify({ type: 'warning', message: 'Giustificativo rifiutato' })
    rejectDialog.value = false
  } catch {
    $q.notify({ type: 'negative', message: 'Errore nel rifiuto' })
  } finally {
    rejectingId.value = null
  }
}

function escapeCsv(value) {
  const normalized = value == null ? '' : String(value)
  return `"${normalized.replace(/"/g, '""')}"`
}

function aspiLine(row) {
  return [
    row.idFamiglia,
    row.famiglia,
    row.beneficiario,
    row.intestatario,
    row.iban,
    row.totaleRimborsabile.toFixed(2).replace('.', ',')
  ]
}

function exportAspi() {
  const header = ['ID famiglia', 'Famiglia', 'Beneficiario', 'Intestatario', 'IBAN', 'Importo']
  const csv = [
    header.map(escapeCsv).join(';'),
    ...aspiRows.value.map(row => aspiLine(row).map(escapeCsv).join(';'))
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `aspi-${selectedTranche.value}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

async function copyAspiLine(row) {
  await copyToClipboard(aspiLine(row).join('\t'))
  $q.notify({ type: 'positive', message: 'Riga ASPI copiata' })
}
</script>

<style scoped>
.page-inner {
  max-width: 1280px;
  margin: 0 auto;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-cell {
  min-height: 76px;
  padding: 12px 14px;
  border: 1px solid #dedede;
  border-radius: 6px;
  background: #ffffff;
}

.verifica-table {
  background: #ffffff;
}

.expandable-content {
  background: #f8f9fa;
  border-top: 1px solid #dedede;
}

.giust-sub-list .giust-item {
  border-bottom: 1px solid #eee;
}

.giust-sub-list .giust-item:last-child {
  border-bottom: none;
}

@media (max-width: 720px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
