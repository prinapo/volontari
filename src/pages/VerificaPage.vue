<template>
  <q-page class="q-pa-md verifica-page">
    <div class="page-inner q-mx-auto">
      <q-tabs v-model="verificaTab" class="q-mb-md">
        <q-tab name="rendicontazione" label="Rendicontazione" />
        <q-tab v-if="authStore.canManager" name="pagamenti" label="Pagamenti" />
      </q-tabs>

      <q-tab-panels v-model="verificaTab">
        <q-tab-panel name="rendicontazione">
          <div class="row items-center q-gutter-sm q-mb-md">
            <div>
              <div class="text-h5 text-weight-medium">
                Verifica rendicontazione
              </div>
              <div class="text-body2 text-grey-7">
                Controllo importi rimborsabili e verifica giustificativi.
              </div>
            </div>
            <q-space />
            <q-btn
              flat
              round
              icon="refresh"
              :loading="store.loading"
              aria-label="Aggiorna dati"
              @click="loadData"
            >
              <q-tooltip>Aggiorna dati</q-tooltip>
            </q-btn>
          </div>

          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-sm-6 col-md-4">
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
            <div class="col-12 col-sm-6 col-md-4">
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
          </div>
          <div class="row q-col-gutter-md q-mb-md">
            <div v-for="s in summary" :key="s.label" class="col-6 col-sm-3">
              <q-card flat bordered class="fit">
                <q-card-section class="text-center">
                  <div class="text-caption text-grey-7">
                    {{ s.label }}
                  </div>
                  <div class="text-h6" :class="s.color ? 'text-' + s.color : ''">
                    {{ s.value }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <q-banner v-if="store.error" class="bg-red-1 text-negative q-mb-md" rounded>
            {{ store.error }}
          </q-banner>

          <q-table
            v-model:pagination="pagination"
            v-model:expanded="expandedRows"
            flat
            bordered
            class="verifica-table bg-white"
            row-key="idProgetto"
            :rows="filteredRows"
            :columns="columns"
            :loading="store.loading"
            :grid="$q.screen.lt.sm"
            :dense="$q.screen.lt.md"
          >
            <template #header="props">
              <q-tr :props="props">
                <q-th auto-width />
                <q-th v-for="col in props.cols" :key="col.name" :props="props">
                  {{ col.label }}
                </q-th>
              </q-tr>
            </template>

            <template #item="props">
              <div class="q-pa-xs col-12">
                <q-expansion-item
                  dense
                  dense-toggle
                  expand-separator
                  :label="props.row.famiglia || 'Famiglia senza nome'"
                  :caption="`${props.row.beneficiario || ''} — Bando ${props.row.annoBando}`"
                  header-class="expansion-header"
                  @show="loadFamigliaContatti(props.row.idFamiglia)"
                >
                  <q-card flat bordered>
                    <q-card-section class="q-pa-sm">
                      <div class="row q-col-gutter-md q-mb-md">
                        <div class="col-12 col-sm-6">
                          <div class="text-subtitle2 text-grey-8 q-mb-xs">
                            Dati bancari
                          </div>
                          <div v-if="props.row.intestatario" class="text-caption text-grey-7 q-mb-xs">
                            Intestatario: {{ props.row.intestatario }}
                          </div>
                          <div class="row items-center q-gutter-xs">
                            <q-badge :color="props.row.iban && props.row.intestatario ? 'positive' : 'warning'" outline>
                              {{ props.row.iban && props.row.intestatario ? 'Completi' : 'Da completare' }}
                            </q-badge>
                            <span class="text-body2">{{ props.row.iban || 'IBAN mancante' }}</span>
                            <q-btn
                              flat
round
dense
size="sm"
icon="edit"
                              data-testid="btn-edit-bancari"
                              aria-label="Modifica dati bancari"
                              @click="openBancariDialog(props.row)"
                            >
                              <q-tooltip>Modifica dati bancari</q-tooltip>
                            </q-btn>
                          </div>
                        </div>
                        <div class="col-12 col-sm-6">
                          <div class="text-subtitle2 text-grey-8 q-mb-xs">
                            Rimborsabile 80%
                          </div>
                          <div class="text-positive text-weight-medium">
                            {{ formatCurrency(props.row.totaleRimborsabile) }}
                          </div>
                        </div>
                      </div>

                      <!-- Pagato / Allocato + StatoProgetto mobile -->
                      <div class="row items-center q-gutter-x-sm q-mb-sm">
                        <div class="text-caption text-grey-7">Pagato:</div>
                        <div class="text-body2 text-weight-medium">{{ formatCurrency(props.row.totalePagato) }}</div>
                        <div class="text-caption text-grey-7">/ {{ formatCurrency(props.row.allocato) }}</div>
                        <q-space />
                        <q-badge v-if="props.row.statoProgetto === 'chiuso'" color="grey-6" outline>Chiuso</q-badge>
                        <q-badge v-else color="positive" outline>Aperto</q-badge>
                      </div>
                      <div class="row items-center q-gutter-x-sm q-mb-sm">
                        <q-badge :color="statoRiga(props.row).color">
                          {{ statoRiga(props.row).label }}
                        </q-badge>
                      </div>
                      <q-separator class="q-mb-md" />
                      <div class="text-subtitle2 text-grey-8 q-mb-xs">
                        Genitori
                      </div>
                      <div v-if="contattiLoading && !genitoriCache[props.row.idFamiglia]" class="text-caption text-grey">
                        <q-spinner size="xs" /> Caricamento...
                      </div>
                      <div v-else-if="!genitoriCache[props.row.idFamiglia] || genitoriCache[props.row.idFamiglia].length === 0" class="text-caption text-grey">
                        Nessun genitore assegnato.
                      </div>
                      <q-list v-else dense class="q-mb-sm">
                        <q-item v-for="g in genitoriCache[props.row.idFamiglia]" :key="g.id" dense class="q-px-none q-py-xs">
                          <q-item-section><ContattoInfoLine :contact="g.Contatto" :emails="g._emails || []" /></q-item-section>
                        </q-item>
                      </q-list>
                      <div class="text-subtitle2 text-grey-8 q-mb-xs q-mt-md">
                        Volontari
                      </div>
                      <div v-if="contattiLoading && !volontariCache[props.row.idFamiglia]" class="text-caption text-grey">
                        <q-spinner size="xs" /> Caricamento...
                      </div>
                      <div v-else-if="!volontariCache[props.row.idFamiglia] || volontariCache[props.row.idFamiglia].length === 0" class="text-caption text-grey">
                        Nessun volontario assegnato.
                      </div>
                      <q-list v-else dense class="q-mb-sm">
                        <q-item v-for="v in volontariCache[props.row.idFamiglia]" :key="v.id" dense class="q-px-none q-py-xs">
                          <q-item-section><ContattoInfoLine :contact="v.Contatto" :emails="v._emails || []" /></q-item-section>
                        </q-item>
                      </q-list>
                      <q-separator />
                    </q-card-section>
                    <q-card-section class="q-pa-sm">
                      <div class="text-subtitle2 text-grey-8 q-mb-sm">
                        Giustificativi — {{ props.row.annoBando || 'N/A' }}
                      </div>
                      <template v-if="props.row.giustificativi.length > 0">
                        <div v-for="g in props.row.giustificativi" :key="g.id" class="q-mb-sm">
                          <q-card flat bordered>
                            <q-card-section class="q-pa-sm">
                              <div class="row q-col-gutter-xs items-start">
                                <div class="col-12">
                                  <InlineEditableField
                                    :model-value="g.Descrizione"
                                    label="Descrizione"
                                    type="text"
                                    :readonly="!canVerifica || g.Stato !== 'inviato'"
                                    :saving="savingField === `${g.id}-Descrizione`"
                                    @save="(val) => handleFieldSave(props.row.idProgetto, g, 'Descrizione', val)"
                                  />
                                  <div v-if="g.NotaVolontario" class="text-caption text-grey-6 ellipsis-2">
                                    {{ g.NotaVolontario }}
                                  </div>
                                </div>
                                <div class="col-6 col-sm-3">
                                  <InlineEditableField
                                    :model-value="g.Importo"
                                    label="Importo"
                                    type="number"
                                    :readonly="!canVerifica || g.Stato !== 'inviato'"
                                    :format-display="(v) => formatCurrency(v)"
                                    :saving="savingField === `${g.id}-Importo`"
                                    @save="(val) => handleFieldSave(props.row.idProgetto, g, 'Importo', parseFloat(val))"
                                  />
                                </div>
                                <div class="col-6 col-sm-3">
                                  <InlineEditableField
                                    :model-value="g.Data"
                                    label="Data"
                                    type="date"
                                    :readonly="!canVerifica || g.Stato !== 'inviato'"
                                    :format-display="(v) => formatDate(v) || '—'"
                                    :saving="savingField === `${g.id}-Data`"
                                    @save="(val) => handleFieldSave(props.row.idProgetto, g, 'Data', val)"
                                  />
                                </div>
                                <div class="col-6 col-sm-3">
                                  <div class="text-caption text-grey">
                                    Allegato
                                  </div>
                                  <div v-if="g.Allegato" class="row q-gutter-x-xs">
                                    <q-btn
                                      :href="assetUrl(g.Allegato)"
                                      target="_blank"
                                      type="a"
                                      flat
                                      dense
                                      round
                                      icon="open_in_new"
                                      size="sm"
                                      aria-label="Apri allegato"
                                    >
                                      <q-tooltip>Apri allegato</q-tooltip>
                                    </q-btn>
                                    <q-btn
                                      :href="assetUrl(g.Allegato, true)"
                                      type="a"
                                      flat
                                      dense
                                      round
                                      icon="file_download"
                                      size="sm"
                                      aria-label="Scarica allegato"
                                    >
                                      <q-tooltip>Scarica allegato</q-tooltip>
                                    </q-btn>
                                  </div>
                                  <div v-else class="text-grey-5">
                                    —
                                  </div>
                                </div>
                                <div class="col-3 col-sm-1">
                                  <q-badge :color="statoColor(g.Stato)" outline>
                                    {{ statoLabel(g.Stato) }}
                                  </q-badge>
                                </div>
                                <div class="col-12 col-sm-5">
                                  <div v-if="g.Stato === 'inviato'" class="row q-gutter-xs">
                                    <q-btn
                                      dense
                                      flat
                                      icon="check_circle"
                                      color="primary"
                                      size="md"
                                      data-testid="btn-verify"
                                      aria-label="Verifica"
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
                                      size="md"
                                      data-testid="btn-reject"
                                      aria-label="Rifiuta"
                                      @click="handleReject(props.row.idProgetto, g)"
                                    >
                                      <q-tooltip>Rifiuta</q-tooltip>
                                    </q-btn>
                                  </div>
                                  <div v-else-if="g.Stato === 'verificato'" class="text-positive row items-center q-gutter-xs">
                                    <q-icon name="check_circle" size="md" /><span class="text-body2">Verificato</span>
                                  </div>
                                  <div v-else-if="g.Stato === 'rifiutato'">
                                    <div class="text-negative row items-center q-gutter-xs">
                                      <q-icon name="cancel" size="md" /><span class="text-body2">Rifiutato</span>
                                    </div>
                                    <div v-if="g.NotaRifiuto" class="text-caption text-grey">
                                      {{ g.NotaRifiuto }}
                                    </div>
                                  </div>
                                  <div v-else-if="g.Stato === 'draft'" class="row q-gutter-xs">
                                    <q-btn
                                      dense
                                      flat
                                      icon="send"
                                      color="secondary"
                                      size="md"
                                      data-testid="btn-send"
                                      aria-label="Invia"
                                      :loading="verifyingId === g.id"
                                      @click="handleSendDraft(props.row.idProgetto, g)"
                                    >
                                      <q-tooltip>Invia</q-tooltip>
                                    </q-btn>
                                  </div>
                                </div>
                              </div>
                            </q-card-section>
                          </q-card>
                        </div>
                      </template>
                      <div v-else class="text-caption text-grey">
                        Nessun giustificativo presente.
                      </div>
                    </q-card-section>
                    <q-card-actions class="q-pa-sm q-gutter-xs">
                      <q-btn
                        v-if="canVerifica"
                        flat
                        round
                        dense
                        icon="add_circle"
                        color="secondary"
                        size="sm"
                        aria-label="Aggiungi giustificativo"
                        @click="addingForRow = props.row"
                      >
                        <q-tooltip>Aggiungi giustificativo</q-tooltip>
                      </q-btn>
                      <q-btn
                        flat
                        round
                        dense
                        icon="visibility"
                        size="sm"
                        aria-label="Dettaglio progetto"
                        @click="openRowDetail(props.row)"
                      >
                        <q-tooltip>Dettaglio progetto</q-tooltip>
                      </q-btn>
                      <q-btn
                        v-if="canVerifica && props.row.statoProgetto === 'aperto'"
                        flat
                        round
                        dense
                        size="sm"
                        icon="lock"
                        color="warning"
                        aria-label="Chiudi progetto"
                        @click="openChiudiProgetto(props.row)"
                      >
                        <q-tooltip>Chiudi progetto</q-tooltip>
                      </q-btn>
                      <q-btn
                        v-if="canVerifica && props.row.statoProgetto === 'chiuso'"
                        flat
                        round
                        dense
                        size="sm"
                        icon="lock_open"
                        color="positive"
                        aria-label="Riapri progetto"
                        :loading="savingRiapriProgetto"
                        @click="handleRiapriProgetto(props.row)"
                      >
                        <q-tooltip>Riapri progetto</q-tooltip>
                      </q-btn>
                    </q-card-actions>
                  </q-card>
                </q-expansion-item>
              </div>
            </template>

            <template #body="props">
              <q-tr :props="props">
                <q-td auto-width>
                  <q-btn
                    flat
                    round
                    dense
                    :icon="expandedRows.includes(props.row.idProgetto) ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
                    data-testid="expand-row"
                    :aria-label="expandedRows.includes(props.row.idProgetto) ? 'Chiudi' : 'Apri dettagli'"
                    @click="toggleExpand(props.row.idProgetto)"
                  >
                    <q-tooltip>{{ expandedRows.includes(props.row.idProgetto) ? 'Chiudi' : 'Apri dettagli' }}</q-tooltip>
                  </q-btn>
                </q-td>
                <q-td v-for="col in props.cols" :key="col.name" :props="props">
                  <template v-if="col.name === 'famiglia'">
                    <div class="text-weight-medium">
                      {{ props.row.famiglia || 'Famiglia senza nome' }}
                    </div>
                    <div class="text-caption text-grey-7">
                      {{ props.row.beneficiario || '' }}
                    </div>
                  </template>

                  <template v-else-if="col.name === 'allocato'">
                    <div class="text-weight-medium">
                      {{ formatCurrency(props.row.allocato) }}
                    </div>
                  </template>

                  <template v-else-if="col.name === 'rendicontato'">
                    <div class="text-weight-medium">
                      {{ formatCurrency(props.row.totaleRendicontato) }}
                    </div>
                    <div class="text-caption text-grey-7">
                      {{ totalGiustificativi(props.row) }} giustificativi
                    </div>
                  </template>

                  <template v-else-if="col.name === 'stato'">
                    <q-badge :color="statoRiga(props.row).color">
                      {{ statoRiga(props.row).label }}
                    </q-badge>
                    <q-badge v-if="props.row.statoProgetto === 'chiuso'" color="grey-6" outline class="q-ml-xs">
                      Chiuso
                    </q-badge>
                  </template>

                  <template v-else-if="col.name === 'pagato'">
                    <div class="text-right">
                      <div class="text-body2">{{ formatCurrency(props.row.totalePagato) }}</div>
                      <div class="text-caption text-grey-6">/ {{ formatCurrency(props.row.allocato) }}</div>
                    </div>
                  </template>

                  <template v-else-if="col.name === 'actions'">
                    <q-btn
                      v-if="canVerifica"
                      flat
                      round
                      dense
                      icon="add_circle"
                      color="secondary"
                      data-testid="btn-add-giust"
                      aria-label="Aggiungi giustificativo"
                      @click="addingForRow = props.row"
                    >
                      <q-tooltip>Aggiungi giustificativo</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="visibility"
                      data-testid="btn-detail-row"
                      aria-label="Dettaglio progetto"
                      @click="openRowDetail(props.row)"
                    >
                      <q-tooltip>Dettaglio progetto</q-tooltip>
                    </q-btn>
                    <q-btn
                      v-if="canVerifica && props.row.statoProgetto === 'aperto'"
                      flat
                      round
                      dense
                      icon="lock"
                      color="warning"
                      aria-label="Chiudi progetto"
                      @click="openChiudiProgetto(props.row)"
                    >
                      <q-tooltip>Chiudi progetto</q-tooltip>
                    </q-btn>
                    <q-btn
                      v-if="canVerifica && props.row.statoProgetto === 'chiuso'"
                      flat
                      round
                      dense
                      icon="lock_open"
                      color="positive"
                      aria-label="Riapri progetto"
                      :loading="savingRiapriProgetto"
                      @click="handleRiapriProgetto(props.row)"
                    >
                      <q-tooltip>Riapri progetto</q-tooltip>
                    </q-btn>
                  </template>

                  <template v-else>
                    {{ col.value }}
                  </template>
                </q-td>
              </q-tr>
            </template>

            <template #expanded-row="props">
              <q-tr :props="props">
                <q-td colspan="100%" class="q-pa-none">
                    <div class="expandable-content bg-grey-1">
                    <div class="q-px-md q-pt-md q-pb-xs">
                      <div class="row q-col-gutter-md q-mb-md">
                        <div class="col-6">
                          <div class="text-subtitle2 text-grey-8 q-mb-xs">
                            Dati bancari
                          </div>
                          <div v-if="props.row.intestatario" class="text-caption text-grey-7 q-mb-xs">
                            Intestatario: {{ props.row.intestatario }}
                          </div>
                          <div class="row items-center q-gutter-xs">
                            <q-badge :color="props.row.iban && props.row.intestatario ? 'positive' : 'warning'" outline>
                              {{ props.row.iban && props.row.intestatario ? 'Completi' : 'Da completare' }}
                            </q-badge>
                            <span class="text-body2">{{ props.row.iban || 'IBAN mancante' }}</span>
                            <q-btn
                              flat
                              round
                              dense
                              size="sm"
                              icon="edit"
                              data-testid="btn-edit-bancari"
                              aria-label="Modifica dati bancari"
                              @click="openBancariDialog(props.row)"
                            >
                              <q-tooltip>Modifica dati bancari</q-tooltip>
                            </q-btn>
                          </div>
                        </div>
                        <div class="col-6">
                          <div class="text-subtitle2 text-grey-8 q-mb-xs">
                            Rimborsabile 80%
                          </div>
                          <div class="text-positive text-weight-medium">
                            {{ formatCurrency(props.row.totaleRimborsabile) }}
                          </div>
                        </div>
                      </div>
                      <q-separator class="q-mb-md" />
                      <div class="text-subtitle2 text-grey-8 q-mb-xs">
                        Genitori
                      </div>
                      <div v-if="contattiLoading && !genitoriCache[props.row.idFamiglia]" class="text-caption text-grey">
                        <q-spinner size="xs" /> Caricamento...
                      </div>
                      <div v-else-if="!genitoriCache[props.row.idFamiglia] || genitoriCache[props.row.idFamiglia].length === 0" class="text-caption text-grey">
                        Nessun genitore assegnato.
                      </div>
                      <q-list v-else dense class="q-mb-sm">
                        <q-item v-for="g in genitoriCache[props.row.idFamiglia]" :key="g.id" dense class="q-px-none q-py-xs">
                          <q-item-section>
                            <ContattoInfoLine :contact="g.Contatto" :emails="g._emails || []" />
                          </q-item-section>
                        </q-item>
                      </q-list>
                      <div class="text-subtitle2 text-grey-8 q-mb-xs q-mt-md">
                        Volontari
                      </div>
                      <div v-if="contattiLoading && !volontariCache[props.row.idFamiglia]" class="text-caption text-grey">
                        <q-spinner size="xs" /> Caricamento...
                      </div>
                      <div v-else-if="!volontariCache[props.row.idFamiglia] || volontariCache[props.row.idFamiglia].length === 0" class="text-caption text-grey">
                        Nessun volontario assegnato.
                      </div>
                      <q-list v-else dense class="q-mb-sm">
                        <q-item v-for="v in volontariCache[props.row.idFamiglia]" :key="v.id" dense class="q-px-none q-py-xs">
                          <q-item-section>
                            <ContattoInfoLine :contact="v.Contatto" :emails="v._emails || []" />
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
                            :readonly="!canVerifica || g.Stato !== 'inviato'"
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
                            :readonly="!canVerifica || g.Stato !== 'inviato'"
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
                            :readonly="!canVerifica || g.Stato !== 'inviato'"
                            :format-display="(v) => formatDate(v) || '—'"
                            :saving="savingField === `${g.id}-Data`"
                            @save="(val) => handleFieldSave(props.row.idProgetto, g, 'Data', val)"
                          />
                        </q-item-section>

                        <q-item-section class="col-2">
                          <div v-if="g.Allegato" class="row q-gutter-x-xs">
                            <q-btn
                              :href="assetUrl(g.Allegato)"
                              target="_blank"
                              type="a"
                              flat
                              dense
                              round
                              icon="open_in_new"
                              size="sm"
                              aria-label="Apri allegato"
                            >
                              <q-tooltip>Apri allegato</q-tooltip>
                            </q-btn>
                            <q-btn
                              :href="assetUrl(g.Allegato, true)"
                              type="a"
                              flat
                              dense
                              round
                              icon="file_download"
                              size="sm"
                              aria-label="Scarica allegato"
                            >
                              <q-tooltip>Scarica allegato</q-tooltip>
                            </q-btn>
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
                          <div v-if="g.Stato === 'inviato'" class="row q-gutter-xs">
                            <q-btn
                              dense
                              flat
                              icon="check_circle"
                              color="primary"
                              size="md"
                              data-testid="btn-verify"
                              aria-label="Verifica"
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
                              size="md"
                              data-testid="btn-reject"
                              aria-label="Rifiuta"
                              @click="handleReject(props.row.idProgetto, g)"
                            >
                              <q-tooltip>Rifiuta</q-tooltip>
                            </q-btn>
                          </div>
                          <div v-else-if="g.Stato === 'verificato'" class="text-positive row items-center q-gutter-xs">
                            <q-icon name="check_circle" size="md" />
                            <span class="text-body2">Verificato</span>
                          </div>
                          <div v-else-if="g.Stato === 'rifiutato'">
                            <div class="text-negative row items-center q-gutter-xs">
                              <q-icon name="cancel" size="md" />
                              <span class="text-body2">Rifiutato</span>
                            </div>
                            <div v-if="g.NotaRifiuto" class="text-caption text-grey-7 q-mt-xs">
                              {{ g.NotaRifiuto }}
                            </div>
                          </div>
                          <div v-else-if="g.Stato === 'draft'" class="row q-gutter-xs">
                            <q-btn
                              dense
                              flat
                              icon="send"
                              color="secondary"
                              size="md"
                              data-testid="btn-send"
                              aria-label="Invia"
                              :loading="verifyingId === g.id"
                              @click="handleSendDraft(props.row.idProgetto, g)"
                            >
                              <q-tooltip>Invia</q-tooltip>
                            </q-btn>
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
        <q-tab-panel v-if="canVerifica" name="pagamenti">
          <PagamentiTab />
        </q-tab-panel>
      </q-tab-panels>

      <BancariDialog
        v-model="bancariDialog"
        :famiglia-name="editingRow?.famiglia || ''"
        :beneficiario="editingRow?.beneficiario || ''"
        :initial-iban="editingRow?.iban || ''"
        :initial-intestatario="editingRow?.intestatario || ''"
        :saving="savingBancari"
        @save="saveBancari"
      />

      <q-dialog v-model="chiudiProgettoDialog" persistent>
        <q-card>
          <q-card-section class="row items-center">
            <div class="text-h6">Chiudi progetto</div>
            <q-space />
            <q-btn
v-close-popup
flat
round
dense
icon="close"
aria-label="Chiudi" />
          </q-card-section>
          <q-card-section>
            <div class="text-body2 q-mb-sm">
              Vuoi chiudere il progetto <strong>{{ chiudiProgettoRow?.famiglia || '' }}</strong>?
            </div>
            <div class="text-caption text-grey-7 q-mb-md">
              Una volta chiuso, non verranno più generate nuove proposte di pagamento.
            </div>
            <q-input
              v-model="chiudiProgettoNota"
              label="Motivo della chiusura (opzionale)"
              outlined
              dense
              type="textarea"
              autogrow
            />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn v-close-popup flat label="Annulla" />
            <q-btn
              color="warning"
              label="Chiudi progetto"
              :loading="savingChiudiProgetto"
              @click="handleChiudiProgetto"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-dialog v-model="rejectDialog" persistent>
        <q-card class="q-pa-lg">
          <q-card-section>
            <div class="text-h6">
              Rifiuta giustificativo
            </div>
            <div class="text-caption text-grey-7">
              {{ rejectItem?.Descrizione || '' }}
            </div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <q-input
              v-model="rejectNota"
              outlined
              dense
              label="Motivazione del rifiuto *"
              type="textarea"
              :rules="[val => !!val || 'Inserisci una motivazione']"
            />
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn v-close-popup flat label="Annulla" color="negative" />
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

      <ProgettoDetailDialog
        v-model="detailDialog"
        :progetto="selectedProgettoRow"
      />
    </div>
  </q-page>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { computed, onMounted, ref, watch } from 'vue'
import BancariDialog from 'components/Common/BancariDialog.vue'
import ContattoInfoLine from 'components/Common/ContattoInfoLine.vue'
import InlineEditableField from 'components/Common/InlineEditableField.vue'
import GiustificativoForm from 'components/Giustificativi/GiustificativoForm.vue'
import PagamentiTab from 'components/Verifica/PagamentiTab.vue'
import ProgettoDetailDialog from 'components/Verifica/ProgettoDetailDialog.vue'
import { assetUrl } from 'src/utils/assets'
import { formatCurrency, formatDate, statoLabel, statoColor } from 'src/utils/formatters'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { useAuthStore } from 'stores/auth.store'
import { useVerificaStore } from 'stores/verifica.store'

const $q = useQuasar()
const store = useVerificaStore()
const authStore = useAuthStore()

const selectedAnno = ref(null)
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

const bancariDialog = ref(false)
const editingRow = ref(null)
const genitoriCache = ref({})
const volontariCache = ref({})
const contattiLoading = ref(false)
const savingBancari = ref(false)

const rejectDialog = ref(false)
const rejectNota = ref('')
const rejectItem = ref(null)
const rejectProgettoId = ref(null)

const chiudiProgettoDialog = ref(false)
const chiudiProgettoRow = ref(null)
const chiudiProgettoNota = ref('')
const savingChiudiProgetto = ref(false)

const selectedProgetto = ref(null)
const detailDialog = ref(false)

const selectedProgettoRow = computed(() =>
  filteredRows.value.find(r => r.idProgetto === selectedProgetto.value) || {}
)

const pagination = ref({
  sortBy: 'famiglia',
  descending: false,
  page: 1,
  rowsPerPage: 25
})

const annoOptions = computed(() => store.anniBando.map(anno => ({
  label: String(anno),
  value: anno
})))

const canVerifica = computed(() => authStore.canManager)

const columns = [
  { name: 'annoBando', label: 'Bando', field: 'annoBando', align: 'left', sortable: true },
  { name: 'famiglia', label: 'Famiglia', field: 'famiglia', align: 'left', sortable: true },
  { name: 'allocato', label: 'Allocato', field: 'allocato', align: 'right', sortable: true },
  { name: 'rendicontato', label: 'Rendicontato', field: 'totaleRendicontato', align: 'right', sortable: true },
  { name: 'pagato', label: 'Pagato', field: 'totalePagato', align: 'right' },
  { name: 'stato', label: 'Stato', field: 'id', align: 'left' },
  { name: 'actions', label: '', field: 'id', align: 'right' }
]

const filteredRows = computed(() => store.rows)

const selectedTotals = computed(() => {
  return filteredRows.value.reduce((totals, row) => {
    totals.rendicontato += row.totaleRendicontato
    totals.rimborsabile += row.totaleRimborsabile
    return totals
  }, { rendicontato: 0, rimborsabile: 0 })
})

const prontiCount = computed(() => {
  return filteredRows.value.filter(row =>
    row.totaleRimborsabile > 0 && row.iban && row.intestatario && !row.giustificativi.some(g => g.Stato === 'inviato')
  ).length
})

const summary = computed(() => [
  { label: 'Famiglie/progetti', value: String(filteredRows.value.length), color: '' },
  { label: 'Rendicontato', value: formatCurrency(selectedTotals.value.rendicontato), color: 'primary' },
  { label: 'Rimborsabile 80%', value: formatCurrency(selectedTotals.value.rimborsabile), color: 'positive' },
  { label: 'Pronte', value: String(prontiCount.value), color: '' }
])

onMounted(() => {
  store.fetchAnni()
  loadData()
})

async function loadData() {
  await store.fetchAllPages({
    search: search.value || undefined,
    anno: selectedAnno.value || undefined
  })
}

watch([search, selectedAnno], () => {
  pagination.value.page = 1
  loadData()
})

function hasPendingGiustificativi(row) {
  return row.giustificativi.some(g => g.Stato === 'inviato')
}

function totalGiustificativi(row) {
  return row.giustificativi.filter(g => !g.Invalidato).length
}

function allVerified(row) {
  const validGiust = row.giustificativi.filter(g => !g.Invalidato)
  return validGiust.length > 0 && validGiust.every(g => g.Stato === 'verificato')
}

function statoRiga(row) {
  if (row.totaleRendicontato === 0) {
    return { label: 'Non ricevuta', color: 'grey' }
  }
  if (!row.iban || !row.intestatario) {
    return { label: 'Dati bancari mancanti', color: 'warning' }
  }
  if (hasPendingGiustificativi(row)) {
    return { label: 'Da verificare', color: 'orange' }
  }
  if (allVerified(row)) {
    return { label: 'Pronto', color: 'positive' }
  }
  return { label: 'Da completare', color: 'warning' }
}

async function loadFamigliaContatti(famigliaId) {
  if (!famigliaId) return
  if (genitoriCache.value[famigliaId] && volontariCache.value[famigliaId]) return
  contattiLoading.value = true
  try {
    const { genitori, volontari } = await store.loadFamigliaContacts(famigliaId)
    genitoriCache.value = { ...genitoriCache.value, [famigliaId]: genitori }
    volontariCache.value = { ...volontariCache.value, [famigliaId]: volontari }
  } catch {
    genitoriCache.value = { ...genitoriCache.value, [famigliaId]: [] }
    volontariCache.value = { ...volontariCache.value, [famigliaId]: [] }
  } finally {
    contattiLoading.value = false
  }
}

const expandedRows = ref([])

function toggleExpand(progettoId) {
  const idx = expandedRows.value.indexOf(progettoId)
  if (idx === -1) {
    expandedRows.value.push(progettoId)
    const row = filteredRows.value.find(r => r.idProgetto === progettoId)
    if (row) loadFamigliaContatti(row.idFamiglia)
  } else {
    expandedRows.value.splice(idx, 1)
  }
}

function openBancariDialog(row) {
  editingRow.value = row
  bancariDialog.value = true
}

async function saveBancari({ iban, intestatario }) {
  if (!editingRow.value) return
  savingBancari.value = true
  try {
    await store.updateBancari(editingRow.value.idFamiglia, { iban, intestatario })
    notifySuccess($q, 'Dati bancari aggiornati')
    bancariDialog.value = false
  } catch (error) {
    notifyError($q, error, "Errore nell'aggiornamento")
  } finally {
    savingBancari.value = false
  }
}

function openChiudiProgetto(row) {
  chiudiProgettoRow.value = row
  chiudiProgettoNota.value = ''
  chiudiProgettoDialog.value = true
}

async function handleChiudiProgetto() {
  savingChiudiProgetto.value = true
  try {
    const { usePagamentiStore } = await import('stores/pagamenti.store')
    const pagStore = usePagamentiStore()
    await pagStore.chiudiProgetto(chiudiProgettoRow.value.idProgetto, {
      automatica: false,
      motivo: chiudiProgettoNota.value || null
    })
    notifySuccess($q, 'Progetto chiuso')
    chiudiProgettoDialog.value = false
    await store.fetchAllPages()
  } catch (error) {
    notifyError($q, error, 'Errore chiusura progetto')
  } finally {
    savingChiudiProgetto.value = false
  }
}

const savingRiapriProgetto = ref(false)

async function handleRiapriProgetto(row) {
  savingRiapriProgetto.value = true
  try {
    const { usePagamentiStore } = await import('stores/pagamenti.store')
    const pagStore = usePagamentiStore()
    await pagStore.riapriProgetto(row.idProgetto)
    if (pagStore.error) throw new Error(pagStore.error)
    notifySuccess($q, 'Progetto riaperto')
    await store.fetchAllPages()
  } catch (error) {
    notifyError($q, error, 'Errore riapertura progetto')
  } finally {
    savingRiapriProgetto.value = false
  }
}

async function handleVerify(progettoId, item) {
  verifyingId.value = item.id
  try {
    await store.verifyGiustificativo(progettoId, item.id)
    notifySuccess($q, 'Giustificativo verificato')
  } catch (error) {
    notifyError($q, error, 'Errore nella verifica')
  } finally {
    verifyingId.value = null
  }
}

async function handleSendDraft(progettoId, item) {
  verifyingId.value = item.id
  try {
    await store.updateGiustificativoField(progettoId, item.id, 'Stato', 'inviato')
    notifySuccess($q, 'Giustificativo inviato')
  } catch (error) {
    notifyError($q, error, "Errore nell'invio")
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
    notifySuccess($q, 'Campo aggiornato')
  } catch (error) {
    notifyError($q, error, "Errore nell'aggiornamento")
  } finally {
    savingField.value = null
  }
}

async function handleAddSave(formData) {
  const row = addingForRow.value
  if (!row) return
  try {
    await store.addGiustificativo(formData, formData.File)
    notifySuccess($q, 'Giustificativo creato')
    addingForRow.value = null
  } catch (error) {
    notifyError($q, error, 'Errore nella creazione')
  }
}

async function confirmReject() {
  if (!rejectNota.value || !rejectItem.value) return
  rejectingId.value = rejectItem.value.id
  try {
    await store.rejectGiustificativo(rejectProgettoId.value, rejectItem.value.id, rejectNota.value)
    $q.notify({ type: 'warning', message: 'Giustificativo rifiutato' })
    rejectDialog.value = false
  } catch (error) {
    notifyError($q, error, 'Errore nel rifiuto')
  } finally {
    rejectingId.value = null
  }
}

function openRowDetail(row) {
  selectedProgetto.value = row.idProgetto
  detailDialog.value = true
}
</script>
