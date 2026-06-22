<template>
  <q-page class="q-pa-md deduplica-page">
    <div class="page-inner">
      <div class="row items-center q-gutter-sm q-mb-md">
        <div>
          <div class="text-h5 text-weight-medium">Gestione duplicati</div>
          <div class="text-body2 text-grey-7">
            Gruppi di email duplicate trovate nella tabella email.
            <q-btn
              flat
              dense
              size="sm"
              icon="refresh"
              :loading="store.loading"
              class="q-ml-sm"
              aria-label="Aggiorna"
              @click="store.fetchDuplicates"
            >
              <q-tooltip>Aggiorna</q-tooltip>
            </q-btn>
          </div>
        </div>
        <q-space />
        <q-btn
          flat
          dense
          icon="shield"
          :color="idBadgeColor"
          :label="`ID duplicati (${store.idDuplicateGroups.length})`"
          class="q-mr-sm"
          @click="showIdDuplicates"
        >
          <q-tooltip>Controlla ID duplicati in tutte le tabelle</q-tooltip>
        </q-btn>
      </div>

      <q-banner v-if="store.error" class="bg-red-1 text-negative q-mb-md" rounded>
        {{ store.error }}
      </q-banner>

      <div v-if="!store.loading && store.duplicateGroups.length === 0" class="text-center text-grey-5 q-py-xl">
        <q-icon name="check_circle" size="64px" />
        <div class="text-h6 q-mt-md">Nessun duplicato trovato</div>
        <div class="text-body2">Tutti i contatti hanno email univoche.</div>
      </div>

      <div class="q-gutter-y-sm">
        <q-card
          v-for="(group, gi) in store.duplicateGroups"
          :key="gi"
          flat
          bordered
          class="cursor-pointer group-card"
          @click="openGroup(group)"
        >
          <q-card-section class="row items-center q-gutter-sm">
            <div class="col">
              <div class="text-body1 text-weight-medium">
                {{ group.email }}
              </div>
              <div class="row q-gutter-xs q-mt-xs">
                <q-badge v-if="group.types.includes('cross-contatto')" color="primary" outline>
                  {{ group.contattoIds.length }} contatti
                </q-badge>
                <q-badge v-if="group.types.includes('same-contatto')" color="warning" outline>
                  Email duplicate
                </q-badge>
                <q-badge v-if="group.types.includes('orphan')" color="negative" outline> Senza contatto </q-badge>
              </div>
              <div class="text-caption text-grey-7 q-mt-xs">
                <template v-if="group.types.includes('cross-contatto')">
                  {{ group.contattoIds.map(id => formatContatto(group.contattiData[id].contatto)).join(' — ') }}
                </template>
                <template v-else-if="group.types.includes('same-contatto')">
                  {{
                    Object.entries(group.contattiData)
                      .filter(([id]) => group.contattiData[id].emailEntries.length > 1)
                      .map(([id, d]) => `${formatContatto(d.contatto)} (${d.emailEntries.length} copie)`)
                      .join(', ')
                  }}.
                </template>
                <template v-else-if="group.types.includes('orphan')">
                  {{ group.orphanEntries.length }} email senza contatto.
                </template>
              </div>
            </div>
            <q-btn flat round icon="chevron_right" color="primary" aria-label="Apri gruppo">
              <q-tooltip>Apri gruppo</q-tooltip>
            </q-btn>
          </q-card-section>
        </q-card>
      </div>

      <q-dialog v-model="comparisonDialog" maximized persistent>
        <q-card v-if="selectedGroup" class="comparison-card">
          <q-card-section class="row items-center">
            <div class="col">
              <div class="text-h6">
                {{ selectedGroup.email }}
              </div>
              <div class="row q-gutter-xs q-mt-xs">
                <q-badge v-if="selectedGroup.types.includes('cross-contatto')" color="primary" outline>
                  {{ selectedGroup.contattoIds.length }} contatti
                </q-badge>
                <q-badge v-if="selectedGroup.types.includes('same-contatto')" color="warning" outline>
                  Email duplicate
                </q-badge>
                <q-badge v-if="selectedGroup.types.includes('orphan')" color="negative" outline>
                  Senza contatto
                </q-badge>
              </div>
            </div>
            <q-btn v-close-popup icon="close" flat round dense aria-label="Chiudi">
              <q-tooltip>Chiudi</q-tooltip>
            </q-btn>
          </q-card-section>

          <q-separator />

          <q-card-section class="scroll deduplica-scroll-70">
            <template v-if="selectedGroup.types.includes('cross-contatto')">
              <div v-for="(pair, pi) in crossPairs" :key="pi" class="q-mb-lg">
                <div class="text-subtitle2 q-mb-sm">
                  {{ formatContatto(pair.aData.contatto) }} (principale) ↔
                  {{ formatContatto(pair.bData.contatto) }}
                </div>

                <q-table
                  flat
                  bordered
                  :rows="pair.fieldRows"
                  :columns="fieldColumns"
                  row-key="field"
                  hide-pagination
                  :pagination="{ rowsPerPage: 0 }"
                  :grid="$q.screen.lt.sm"
                >
                  <template #item="props">
                    <div class="q-pa-xs col-12">
                      <q-card flat bordered>
                        <q-card-section class="q-py-sm">
                          <div class="text-caption text-weight-medium">
                            {{ props.row.field }}
                          </div>
                          <div class="row q-gutter-sm items-center q-mt-xs">
                            <div class="col">
                              <span class="text-caption">A: {{ props.row.a }}</span>
                            </div>
                            <div class="col">
                              <span class="text-caption">B: {{ props.row.b }}</span>
                            </div>
                            <div>
                              <q-radio
                                v-if="props.row.differs"
                                v-model="pair.fieldChoices[props.row.field]"
                                :val="'a'"
                                label="Principale"
                                size="xs"
                              />
                              <q-radio
                                v-if="props.row.differs"
                                v-model="pair.fieldChoices[props.row.field]"
                                :val="'b'"
                                label="Secondario"
                                size="xs"
                              />
                              <span v-else class="text-grey">=</span>
                            </div>
                          </div>
                        </q-card-section>
                      </q-card>
                    </div>
                  </template>
                </q-table>

                <div class="row q-col-gutter-md q-mt-sm">
                  <div class="col-6">
                    <q-card flat bordered>
                      <q-card-section class="text-caption text-weight-medium">
                        Email di {{ formatContatto(pair.aData.contatto) }}
                      </q-card-section>
                      <q-card-section class="q-pt-none">
                        <div
                          v-for="e in pair.aData.emailEntries"
                          :key="e.id"
                          class="row items-center q-gutter-xs q-py-xs"
                        >
                          <div class="col">
                            <a :href="'mailto:' + e.email_address" class="text-primary">{{ e.email_address }}</a>
                          </div>
                          <q-badge v-if="e.Primary === true" color="primary" label="Primaria" size="xs" />
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                  <div class="col-6">
                    <q-card flat bordered>
                      <q-card-section class="text-caption text-weight-medium row items-center">
                        <div class="col">Email di {{ formatContatto(pair.bData.contatto) }}</div>
                        <q-btn
                          flat
                          dense
                          size="sm"
                          icon="forward"
                          color="primary"
                          label="Sposta in Principale"
                          @click="moveBEmailsToA(pair)"
                        />
                      </q-card-section>
                      <q-card-section class="q-pt-none">
                        <div
                          v-for="e in pair.bData.emailEntries"
                          :key="e.id"
                          class="row items-center q-gutter-xs q-py-xs"
                        >
                          <div class="col">
                            <a :href="'mailto:' + e.email_address" class="text-primary">{{ e.email_address }}</a>
                          </div>
                          <q-badge v-if="e.Primary === true" color="primary" label="Primaria" size="xs" />
                          <q-btn
                            flat
                            dense
                            icon="delete"
                            size="xs"
                            color="negative"
                            aria-label="Elimina"
                            @click="handleDeleteEmail(e.id)"
                          >
                            <q-tooltip>Elimina</q-tooltip>
                          </q-btn>
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                </div>

                <div class="row q-col-gutter-md q-mt-sm">
                  <div class="col-6">
                    <q-card flat bordered>
                      <q-card-section class="text-caption text-weight-medium">
                        Famiglie di {{ formatContatto(pair.aData.contatto) }}
                      </q-card-section>
                      <q-card-section class="q-pt-none">
                        <div v-for="fc in pair.aData.famiglieContatti" :key="fc.id" class="text-caption q-py-xs">
                          Famiglia #{{ fc.Famiglia }} — {{ fc.Ruolo_nella_Famiglia }}
                        </div>
                        <div v-if="!pair.aData.famiglieContatti.length" class="text-grey-5 text-caption">
                          Nessuna famiglia
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                  <div class="col-6">
                    <q-card flat bordered>
                      <q-card-section class="text-caption text-weight-medium row items-center">
                        <div class="col">Famiglie di {{ formatContatto(pair.bData.contatto) }}</div>
                        <q-btn
                          v-if="pair.bData.famiglieContatti.length"
                          flat
                          dense
                          size="sm"
                          icon="forward"
                          color="primary"
                          label="Sposta in Principale"
                          @click="moveBFamiliesToA(pair)"
                        />
                      </q-card-section>
                      <q-card-section class="q-pt-none">
                        <div v-for="fc in pair.bData.famiglieContatti" :key="fc.id" class="text-caption q-py-xs">
                          Famiglia #{{ fc.Famiglia }} — {{ fc.Ruolo_nella_Famiglia }}
                        </div>
                        <div v-if="!pair.bData.famiglieContatti.length" class="text-grey-5 text-caption">
                          Nessuna famiglia
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                </div>

                <div v-if="pair.bData.contatto?.user_id" class="q-mt-sm">
                  <q-card flat bordered>
                    <q-card-section class="text-caption row items-center">
                      <div class="col">
                        <strong>Account Directus:</strong> {{ formatContatto(pair.bData.contatto) }} ha un account.
                      </div>
                      <q-btn
                        flat
                        dense
                        size="sm"
                        icon="forward"
                        color="primary"
                        label="Sposta in Principale"
                        :disable="pair.moveUser"
                        @click="pair.moveUser = true"
                      />
                      <q-icon v-if="pair.moveUser" name="check" color="positive" size="sm" class="q-ml-xs" />
                    </q-card-section>
                  </q-card>
                </div>
              </div>
            </template>

            <template v-if="selectedGroup.types.includes('same-contatto')">
              <div v-for="(data, cid) in sameContattoData" :key="cid" class="q-mb-lg">
                <div class="text-subtitle2 q-mb-sm">
                  {{ formatContatto(data.contatto) }} — {{ data.emailEntries.length }} email identiche
                </div>
                <q-table
                  flat
                  bordered
                  :rows="data.emailEntries"
                  :columns="[
                    { name: 'email_address', label: 'Email', field: 'email_address', align: 'left' },
                    { name: 'primary', label: 'Primaria', field: 'Primary', align: 'center' },
                    { name: 'actions', label: 'Azioni', field: 'actions', align: 'center' }
                  ]"
                  row-key="id"
                  hide-pagination
                  :pagination="{ rowsPerPage: 0 }"
                  :grid="$q.screen.lt.sm"
                >
                  <template #item="props">
                    <div class="q-pa-xs col-12">
                      <q-card flat bordered>
                        <q-card-section class="q-py-sm row items-center">
                          <div class="col">
                            <div class="text-body2">
                              <a :href="'mailto:' + props.row.email_address" class="text-primary">{{
                                props.row.email_address
                              }}</a>
                            </div>
                            <q-badge
                              v-if="props.row.Primary === 'true' || props.row.Primary === true"
                              color="primary"
                              label="Primaria"
                              size="xs"
                            />
                            <span v-else class="text-grey text-caption">No</span>
                          </div>
                          <q-btn
                            flat
                            dense
                            icon="delete"
                            size="xs"
                            color="negative"
                            aria-label="Elimina"
                            @click="handleDeleteEmail(props.row.id)"
                          >
                            <q-tooltip>Elimina</q-tooltip>
                          </q-btn>
                        </q-card-section>
                      </q-card>
                    </div>
                  </template>

                  <template #body-cell-primary="props">
                    <q-td :props="props">
                      <q-badge v-if="props.value === 'true'" color="primary" label="Sì" size="xs" />
                      <span v-else class="text-grey">No</span>
                    </q-td>
                  </template>
                  <template #body-cell-actions="props">
                    <q-td :props="props">
                      <q-btn
                        flat
                        dense
                        icon="delete"
                        size="xs"
                        color="negative"
                        @click="handleDeleteEmail(props.row.id)"
                      >
                        <q-tooltip>Elimina</q-tooltip>
                      </q-btn>
                    </q-td>
                  </template>
                </q-table>
              </div>
            </template>

            <template v-if="selectedGroup.types.includes('orphan')">
              <div class="q-mb-lg">
                <div class="text-subtitle2 q-mb-sm">
                  {{ selectedGroup.orphanEntries.length }} email senza contatto associato
                </div>
                <q-table
                  flat
                  bordered
                  :rows="selectedGroup.orphanEntries"
                  :columns="[
                    { name: 'email_address', label: 'Email', field: 'email_address', align: 'left' },
                    { name: 'primary', label: 'Primaria', field: 'Primary', align: 'center' },
                    { name: 'actions', label: '', field: 'actions', align: 'center' }
                  ]"
                  row-key="id"
                  hide-pagination
                  :pagination="{ rowsPerPage: 0 }"
                  :grid="$q.screen.lt.sm"
                >
                  <template #item="props">
                    <div class="q-pa-xs col-12">
                      <q-card flat bordered>
                        <q-card-section class="q-py-sm row items-center">
                          <div class="col">
                            <div class="text-body2">
                              <a :href="'mailto:' + props.row.email_address" class="text-primary">{{
                                props.row.email_address
                              }}</a>
                            </div>
                            <q-badge
                              v-if="props.row.Primary === 'true' || props.row.Primary === true"
                              color="primary"
                              label="Primaria"
                              size="xs"
                            />
                            <span v-else class="text-grey text-caption">No</span>
                          </div>
                          <q-btn
                            flat
                            dense
                            icon="delete"
                            size="xs"
                            color="negative"
                            aria-label="Elimina"
                            @click="handleDeleteEmail(props.row.id)"
                          >
                            <q-tooltip>Elimina</q-tooltip>
                          </q-btn>
                        </q-card-section>
                      </q-card>
                    </div>
                  </template>

                  <template #body-cell-primary="props">
                    <q-td :props="props">
                      <q-badge v-if="props.value === 'true'" color="primary" label="Sì" size="xs" />
                      <span v-else class="text-grey">No</span>
                    </q-td>
                  </template>
                  <template #body-cell-actions="props">
                    <q-td :props="props">
                      <q-btn
                        flat
                        dense
                        icon="delete"
                        size="xs"
                        color="negative"
                        @click="handleDeleteEmail(props.row.id)"
                      >
                        <q-tooltip>Elimina</q-tooltip>
                      </q-btn>
                    </q-td>
                  </template>
                </q-table>
              </div>
            </template>
          </q-card-section>

          <q-separator />

          <q-card-actions align="right" class="q-pa-md">
            <q-btn v-close-popup flat label="Chiudi" />
            <template v-if="selectedGroup.types.includes('cross-contatto')">
              <q-btn flat label="Elimina contatti secondari" color="negative" @click="confirmDeleteB" />
              <q-btn flat label="Unisci tutto in Principale" color="primary" @click="confirmMerge" />
            </template>
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-dialog v-model="idDialog" maximized>
        <q-card class="comparison-card">
          <q-card-section class="row items-center">
            <div class="col">
              <div class="text-h6">ID duplicati</div>
              <div class="text-caption text-grey-7">ID presenti più volte nelle tabelle. Tabella: {{ idFilter }}</div>
            </div>
            <q-btn
              flat
              round
              dense
              icon="refresh"
              :loading="store.idLoading"
              class="q-mr-sm"
              aria-label="Aggiorna"
              @click="loadIdDuplicates"
            >
              <q-tooltip>Aggiorna</q-tooltip>
            </q-btn>
            <q-btn v-close-popup icon="close" flat round dense aria-label="Chiudi" @click="idDialog = false">
              <q-tooltip>Chiudi</q-tooltip>
            </q-btn>
          </q-card-section>

          <q-separator />

          <q-card-section class="scroll deduplica-scroll-75">
            <div v-if="store.idLoading" class="text-center q-py-xl text-grey">
              <q-spinner size="md" /> Controllo in corso...
            </div>
            <div v-else-if="store.idDuplicateGroups.length === 0" class="text-center q-py-xl text-grey-5">
              <q-icon name="check_circle" size="64px" />
              <div class="text-h6 q-mt-md">Nessun ID duplicato</div>
              <div class="text-body2">Tutti gli ID sono univoci nelle tabelle controllate.</div>
            </div>
            <template v-else>
              <q-table
                flat
                bordered
                :rows="store.idDuplicateGroups"
                :columns="idColumns"
                row-key="_key"
                hide-pagination
                :pagination="{ rowsPerPage: 0 }"
                :filter="idFilter"
                :grid="$q.screen.lt.sm"
              >
                <template #item="props">
                  <div class="q-pa-xs col-12">
                    <q-card flat bordered>
                      <q-card-section class="q-py-sm row items-center">
                        <div class="col">
                          <div class="text-body2">
                            {{ props.row.label }}
                          </div>
                          <div class="text-caption">ID: {{ props.row.id }}</div>
                          <q-badge :color="props.row.count > 2 ? 'negative' : 'warning'">
                            {{ props.row.count }}x
                          </q-badge>
                        </div>
                        <q-btn
                          flat
                          dense
                          icon="search"
                          size="sm"
                          color="primary"
                          aria-label="Vedi dettagli"
                          @click="viewIdDuplicates(props.row)"
                        >
                          <q-tooltip>Vedi dettagli</q-tooltip>
                        </q-btn>
                      </q-card-section>
                    </q-card>
                  </div>
                </template>

                <template #body-cell-count="props">
                  <q-td :props="props">
                    <q-badge :color="props.row.count > 2 ? 'negative' : 'warning'"> {{ props.row.count }}x </q-badge>
                  </q-td>
                </template>
                <template #body-cell-actions="props">
                  <q-td :props="props">
                    <q-btn flat dense icon="search" size="sm" color="primary" @click="viewIdDuplicates(props.row)">
                      <q-tooltip>Vedi dettagli</q-tooltip>
                    </q-btn>
                  </q-td>
                </template>
              </q-table>
            </template>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn v-close-popup flat label="Chiudi" @click="idDialog = false" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
  import { ref, computed, reactive, onMounted } from 'vue'
  import { useQuasar } from 'quasar'
  import { useDeduplicaStore } from 'stores/deduplica.store'
  import { notifyError, notifySuccess } from 'src/utils/notify'
  import { deduplicaService } from 'src/services/deduplica.service'

  const $q = useQuasar()
  const store = useDeduplicaStore()

  const comparisonDialog = ref(false)
  const selectedGroup = ref(null)
  const crossPairs = ref([])

  const idDialog = ref(false)
  const idFilter = ref('')
  const idColumns = [
    { name: 'table', label: 'Tabella', field: 'label', align: 'left', sortable: true },
    { name: 'id', label: 'ID', field: 'id', align: 'left', sortable: true },
    { name: 'count', label: 'Occorrenze', field: 'count', align: 'center', sortable: true },
    { name: 'actions', label: '', align: 'center' }
  ]
  const idBadgeColor = computed(() => (store.idDuplicateGroups.length > 0 ? 'warning' : 'grey'))

  const fieldColumns = [
    { name: 'field', label: 'Campo', field: 'field', align: 'left', style: 'width: 120px' },
    { name: 'a', label: 'A (principale)', field: 'a', align: 'left' },
    { name: 'b', label: 'B', field: 'b', align: 'left' },
    { name: 'scelta', label: 'Scegli', field: 'scelta', align: 'center' }
  ]

  onMounted(() => {
    store.fetchDuplicates()
  })

  function formatContatto(c) {
    if (!c) return '?'
    return [c.Nome, c.Cognome].filter(Boolean).join(' ') || '?'
  }

  async function showIdDuplicates() {
    idDialog.value = true
    if (store.idDuplicateGroups.length === 0) {
      await loadIdDuplicates()
    }
  }

  async function loadIdDuplicates() {
    idFilter.value = ''
    await store.fetchIdDuplicates()
    if (store.idDuplicateGroups.length > 0) {
      $q.notify({
        type: 'warning',
        message: `Trovati ${store.totalIdDuplicates} ID duplicati in ${store.idDuplicateGroups.length} gruppi`
      })
    }
  }

  function viewIdDuplicates(row) {
    $q.dialog({
      title: `ID "${row.id}" in ${row.label}`,
      message: `L'ID <strong>${row.id}</strong> appare <strong>${row.count}x</strong> nella tabella <strong>${row.label}</strong>.<br><br>ID duplicati: verificare manualmente in Directus.`,
      html: true,
      persistent: true
    })
  }

  function openGroup(group) {
    selectedGroup.value = group
    crossPairs.value = []

    if (group.types.includes('cross-contatto')) {
      const aId = group.contattoIds[0]
      const aData = group.contattiData[aId]

      group.contattoIds.slice(1).forEach(bId => {
        const bData = group.contattiData[bId]
        const fields = ['Nome', 'Cognome', 'Numero_di_cellulare', 'Numero_di_telefono']
        const fieldRows = fields.map(f => ({
          field: f,
          a: aData.contatto?.[f] || '—',
          b: bData.contatto?.[f] || '—',
          differs: aData.contatto?.[f] !== bData.contatto?.[f]
        }))
        const choices = reactive({})
        fieldRows.forEach(fr => {
          if (fr.differs) choices[fr.field] = 'a'
        })

        crossPairs.value.push({
          aId,
          bId,
          aData,
          bData,
          fieldRows,
          fieldChoices: choices,
          moveUser: false
        })
      })
    }

    comparisonDialog.value = true
  }

  const sameContattoData = computed(() => {
    if (!selectedGroup.value) return {}
    const result = {}
    for (const [cid, data] of Object.entries(selectedGroup.value.contattiData)) {
      if (data.emailEntries.length > 1) {
        result[cid] = data
      }
    }
    return result
  })

  async function moveBEmailsToA(pair) {
    try {
      for (const e of pair.bData.emailEntries) {
        await deduplicaService.updateEmail(e.id, { Contatto_Relation: pair.aId })
      }
      pair.bData.emailEntries = []
      notifySuccess($q, 'Email spostate nel contatto principale')
    } catch (err) {
      notifyError($q, err, 'Errore nello spostamento email')
    }
  }

  async function moveBFamiliesToA(pair) {
    try {
      for (const fc of pair.bData.famiglieContatti) {
        await deduplicaService.updateFamigliaContatto(fc.id, { Contatto: pair.aId })
      }
      pair.bData.famiglieContatti = []
      notifySuccess($q, 'Famiglie spostate nel contatto principale')
    } catch (err) {
      notifyError($q, err, 'Errore nello spostamento famiglie')
    }
  }

  async function handleDeleteEmail(emailId) {
    try {
      await store.deleteEmailRow(emailId)
      notifySuccess($q, 'Email eliminata')
      comparisonDialog.value = false
    } catch (err) {
      notifyError($q, err, "Errore nell'eliminazione")
    }
  }

  function confirmMerge() {
    $q.dialog({
      title: 'Conferma unione',
      message: 'Unire tutti i contatti secondari nel primo (principale)? Email e famiglie verranno spostate.',
      cancel: true,
      persistent: true
    }).onOk(() => handleMerge())
  }

  async function handleMerge() {
    try {
      for (const pair of crossPairs.value) {
        const overrides = {}
        Object.entries(pair.fieldChoices).forEach(([field, choice]) => {
          if (choice === 'b' && pair.bData.contatto?.[field]) {
            overrides[field] = pair.bData.contatto[field]
          }
        })
        if (pair.moveUser && pair.bData.contatto?.user_id) {
          overrides.user_id = pair.bData.contatto.user_id
        }

        await store.merge(pair.aId, pair.bId, overrides)
      }
      notifySuccess($q, 'Unione completata')
      comparisonDialog.value = false
    } catch (err) {
      notifyError($q, err, "Errore nell'unione")
    }
  }

  function confirmDeleteB() {
    const pairsWithFB = crossPairs.value.filter(p => p.bData.famiglieContatti.length > 0)
    if (pairsWithFB.length > 0) {
      $q.notify({ type: 'warning', message: 'Sposta prima tutte le famiglie nel contatto principale' })
      return
    }
    $q.dialog({
      title: 'Eliminare i contatti secondari?',
      message: 'Questa operazione eliminerà tutti i contatti secondari. Le email sono già state spostate?',
      cancel: true,
      persistent: true
    }).onOk(async () => {
      try {
        for (const pair of crossPairs.value) {
          await store.deleteContattoIfEmpty(pair.bId)
        }
        notifySuccess($q, 'Contatti eliminati')
        comparisonDialog.value = false
      } catch (err) {
        notifyError($q, err, 'Errore')
      }
    })
  }
</script>

<style scoped>
  .page-inner {
    max-width: 960px;
    margin: 0 auto;
  }

  .comparison-card {
    max-width: 800px;
    width: 100%;
    margin: 0 auto;
  }

  .group-card {
    transition: box-shadow 0.2s;
  }
  .group-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }
  .deduplica-scroll-70 {
    max-height: 70vh;
  }
  .deduplica-scroll-75 {
    max-height: 75vh;
  }
</style>
