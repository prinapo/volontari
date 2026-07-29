<template>
  <div>
    <div class="row items-center q-mb-md q-gutter-sm">
      <q-input
        v-model="searchTerm"
        dense
        outlined
        placeholder="Cerca per nome..."
        clearable
        debounce="300"
        class="col-12 col-sm"
        @update:model-value="onSearchChange"
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
        class="col-auto select-min-width"
        @update:model-value="onFilterChange"
      />

      <q-select
        v-if="tipoFilter === 'Volontario'"
        v-model="statoFilter"
        :options="statoOptions"
        dense
        outlined
        class="col-auto select-min-width"
        @update:model-value="onFilterChange"
      />

      <q-space />

      <q-btn
        color="primary"
        icon="person_add"
        label="Aggiungi Contatto"
        data-testid="btn-aggiungi-contatto"
        @click="openCreate"
      />
    </div>

    <q-table
      v-model:pagination="pagination"
      :rows="rows"
      :columns="columns"
      :loading="loading"
      row-key="id_contatto"
      flat
      bordered
      binary-state-sort
      :grid="$q.screen.lt.sm"
      @request="onRequest"
    >
      <template #item="props">
        <div class="q-pa-xs col-12 col-sm-6">
          <q-expansion-item
            dense
            dense-toggle
            expand-separator
            header-class="expansion-header"
          >
            <template #header>
              <q-item-section>
                <q-item-label>{{ displayNome(props.row) }}</q-item-label>
                <q-item-label caption>
                  <q-badge v-if="props.row.IsReferente" color="primary" class="q-mr-xs"> Referente </q-badge>
                  <q-badge
                    v-for="tipo in computedTipi(props.row)"
                    :key="tipo"
                    :color="tipoBadgeColor(tipo)"
                    class="q-mr-xs"
                  >
                    {{ tipo }}
                  </q-badge>
                  <q-badge :color="props.row.user_id?.status === 'suspended' ? 'negative' : 'positive'">
                    {{ props.row.user_id?.status === 'suspended' ? 'Disattivato' : 'Attivo' }}
                  </q-badge>
                </q-item-label>
              </q-item-section>
            </template>
            <q-card flat bordered>
              <q-card-section class="q-pa-sm">
                <q-separator class="q-mb-sm" />
                <div class="row q-col-gutter-sm">
                  <div class="col-12">
                    <div class="text-caption text-grey-7">Email</div>
                    <div class="row items-center q-gutter-x-xs">
                      <template v-if="props.row.user_id?.email">
                        <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" />
                        <ContactLink type="email" :value="props.row.user_id.email" />
                        <q-badge color="primary" label="Primaria" size="xs" class="q-ml-xs" />
                      </template>
                      <template v-else-if="props.row._emails?.length">
                        <div v-for="(em, idx) in props.row._emails" :key="idx" class="text-caption q-py-xs">
                          <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" />
                          <ContactLink type="email" :value="em.email_address" />
                          <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs" />
                        </div>
                      </template>
                      <span v-else class="text-grey-5">—</span>
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="text-caption text-grey-7">Cellulare</div>
                    <div class="row items-center q-gutter-x-xs">
                      <ContactLink
                        v-if="props.row.Numero_di_cellulare"
                        type="tel"
                        :value="props.row.Numero_di_cellulare"
                      /><span v-else class="text-grey-5">—</span>
                      <FieldHistoryButton
                        collection="contatti"
                        :item-id="props.row.id_contatto"
                        field="Numero_di_cellulare"
                        label="Cellulare"
                        :revisions="revisioniContatti[props.row.id_contatto]?.['Numero_di_cellulare'] || []"
                      />
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="text-caption text-grey-7">Telefono</div>
                    <div class="row items-center q-gutter-x-xs">
                      <ContactLink
                        v-if="props.row.Numero_di_telefono"
                        type="tel"
                        :value="props.row.Numero_di_telefono"
                      /><span v-else class="text-grey-5">—</span>
                      <FieldHistoryButton
                        collection="contatti"
                        :item-id="props.row.id_contatto"
                        field="Numero_di_telefono"
                        label="Telefono"
                        :revisions="revisioniContatti[props.row.id_contatto]?.['Numero_di_telefono'] || []"
                      />
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="text-caption text-grey-7">Famiglie</div>
                    <q-btn
                      v-if="famiglieCount[props.row.id_contatto]"
                      flat
                      dense
                      no-caps
                      :label="String(famiglieCount[props.row.id_contatto])"
                      color="primary"
                      size="sm"
                      @click="openFamiglie(props.row)"
                    />
                    <span v-else class="text-grey-5">0</span>
                  </div>
                </div>
              </q-card-section>
              <q-card-actions class="q-pa-sm q-gutter-xs">
                <q-btn
                  flat
                  round
                  dense
                  icon="edit"
color="grey-6"
                  size="sm"
                  data-testid="btn-edit-contatto"
                  aria-label="Modifica"
                  @click="openEdit(props.row)"
                >
                  <q-tooltip>Modifica</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  round
                  dense
                  icon="groups"
                  size="sm"
                  aria-label="Assegna famiglia"
                  @click="openFamiglie(props.row)"
                >
                  <q-tooltip>Assegna famiglia</q-tooltip>
                </q-btn>
                <q-btn
                  v-if="props.row.IsVolontario"
                  flat
                  round
                  dense
                  icon="person_search"
                  color="accent"
                  size="sm"
                  data-testid="btn-assigna-referente"
                  aria-label="Assegna Referente"
                  @click="openReferente(props.row)"
                >
                  <q-tooltip>Assegna Referente</q-tooltip>
                </q-btn>
              </q-card-actions>
            </q-card>
          </q-expansion-item>
        </div>
      </template>

      <template #body-cell-nome="props">
        <q-td :props="props">
          {{ displayNome(props.row) }}
        </q-td>
      </template>

      <template #body-cell-email="props">
        <q-td :props="props">
          <template v-if="props.row.user_id?.email">
            <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" />
            <ContactLink type="email" :value="props.row.user_id.email" />
            <q-badge color="primary" label="Primaria" size="xs" class="q-ml-xs" />
          </template>
          <template v-else-if="props.row._emails?.length">
            <div v-for="(em, idx) in props.row._emails" :key="idx" class="text-caption q-py-xs">
              <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" />
              <ContactLink type="email" :value="em.email_address" />
              <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs" />
            </div>
          </template>
          <span v-else class="text-grey-5">—</span>
        </q-td>
      </template>

      <template #body-cell-cellulare="props">
        <q-td :props="props">
          <div class="row items-center q-gutter-x-xs no-wrap">
            <ContactLink v-if="props.row.Numero_di_cellulare" type="tel" :value="props.row.Numero_di_cellulare" /><span v-else class="text-grey-5">—</span>
            <FieldHistoryButton collection="contatti" :item-id="props.row.id_contatto" field="Numero_di_cellulare" label="Cellulare" :revisions="revisioniContatti[props.row.id_contatto]?.['Numero_di_cellulare'] || []" />
          </div>
        </q-td>
      </template>

      <template #body-cell-telefono="props">
        <q-td :props="props">
          <div class="row items-center q-gutter-x-xs no-wrap">
            <ContactLink v-if="props.row.Numero_di_telefono" type="tel" :value="props.row.Numero_di_telefono" /><span v-else class="text-grey-5">—</span>
            <FieldHistoryButton collection="contatti" :item-id="props.row.id_contatto" field="Numero_di_telefono" label="Telefono" :revisions="revisioniContatti[props.row.id_contatto]?.['Numero_di_telefono'] || []" />
          </div>
        </q-td>
      </template>

      <template #body-cell-tipo="props">
        <q-td :props="props">
          <q-badge v-for="tipo in computedTipi(props.row)" :key="tipo" :color="tipoBadgeColor(tipo)" class="q-mr-xs">
            {{ tipo }}
          </q-badge>
        </q-td>
      </template>

      <template #body-cell-stato="props">
        <q-td :props="props">
          <template v-if="props.row.user_id">
            <q-badge :color="props.row.user_id?.status === 'suspended' ? 'negative' : 'positive'">
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
          <q-btn
            flat
            round
            dense
            icon="edit"
color="grey-6"
            data-testid="btn-edit-contatto"
            aria-label="Modifica"
            @click="openEdit(props.row)"
          >
            <q-tooltip>Modifica</q-tooltip>
          </q-btn>
          <q-btn
flat
round
dense
icon="groups"
aria-label="Assegna famiglia"
@click="openFamiglie(props.row)">
            <q-tooltip>Assegna famiglia</q-tooltip>
          </q-btn>
          <q-btn
            v-if="props.row.IsVolontario"
            flat
            round
            dense
            icon="person_search"
            color="accent"
            data-testid="btn-assigna-referente"
            aria-label="Assegna Referente"
            @click="openReferente(props.row)"
          >
            <q-tooltip>Assegna Referente</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <ContattoDialog v-model="showDialog" :edit-item="editingItem" @saved="onSaved" />

    <AssegnaFamigliaDialog
      v-model="showFamiglie"
      :contatto="famiglieTarget"
      :ruolo="famiglieTarget?.IsVolontario ? 'Volontario' : 'Genitore'"
    />

    <AssegnaReferenteDialog v-model="showReferente" :volontario="referenteTarget" />
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, watch, onMounted } from 'vue'
import ContactLink from 'components/Common/ContactLink.vue'
import FieldHistoryButton from 'components/Common/FieldHistoryButton.vue'
import { useServerTable } from 'src/composables/useServerTable'
import { contattiService } from 'src/services/contatti.service'
import { emailService } from 'src/services/email.service'
import { gestioneService } from 'src/services/gestione.service'
import { revisionsService } from 'src/services/revisions.service'
import { usersService } from 'src/services/users.service'
import { enrichWithEmails } from 'src/utils/enrichment'
import { useAuthStore } from 'stores/auth.store'
import AssegnaFamigliaDialog from './AssegnaFamigliaDialog.vue'
import AssegnaReferenteDialog from './AssegnaReferenteDialog.vue'
import ContattoDialog from './ContattoDialog.vue'

const $q = useQuasar()
const authStore = useAuthStore()

const revisioniContatti = ref({})
const tipoFilter = ref('Tutti')
const tipoOptions = ['Tutti', 'Volontario', 'Genitore', 'Referente', 'Contatto']
const statoFilter = ref('Tutti')
const statoOptions = ['Tutti', 'Attivi', 'Disattivati']

const showDialog = ref(false)
const editingItem = ref(null)

const showFamiglie = ref(false)
const famiglieTarget = ref(null)

const showReferente = ref(false)
const referenteTarget = ref(null)

const famiglieCount = ref({})

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
    const filters = getQueryFilters()
    const res = await contattiService.query({
      limit: params.limit,
      offset: params.limit > 0 ? (params.page - 1) * params.limit : 0,
      sort: params.sort || 'Cognome',
      search: params.search,
      isVolontario: filters.isVolontario,
      isGenitore: filters.isGenitore,
      isReferente: filters.isReferente,
      stato: tipoFilter.value === 'Volontario' ? statoFilter.value : undefined
    })

    const data = res.data.data || []
    const total = res.data.meta?.filter_count || 0

    const userIds = data.map(c => c.user_id).filter(Boolean)
    if (userIds.length > 0) {
      const usersRes = await usersService.getByIds([...new Set(userIds)])
      const users = usersRes.data.data || []
      const userMap = {}
      users.forEach(u => { userMap[u.id] = u })
      data.forEach(c => {
        if (c.user_id && userMap[c.user_id]) {
          c.user_id = userMap[c.user_id]
        }
      })
    }

    const ids = data.map(c => c.id_contatto)
    if (ids.length > 0) {
      const famRes = await gestioneService.queryFamiglieContatti(ids)
      const famItems = famRes.data.data || []
      const counts = {}
      for (const item of famItems) {
        const cid = item.Contatto
        if (!counts[cid]) counts[cid] = 0
        counts[cid]++
      }
      famiglieCount.value = counts

      const emailMap = await enrichWithEmails(ids, emailService.getByContatto.bind(emailService))
      for (const row of data) {
        if (!row.user_id?.email) {
          row._emails = emailMap[row.id_contatto] || []
        }
      }
    }

    return { rows: data, total }
  },
  { defaultSort: 'Cognome' }
)

const columns = [
  {
    name: 'nome',
    label: 'Nome e Cognome',
    field: row => displayNome(row),
    align: 'left',
    sortable: true,
    sort: 'Cognome'
  },
  {
    name: 'email',
    label: 'Email',
    field: row => row.user_id?.email || row._emails?.[0]?.email_address || '',
    align: 'left'
  },
  { name: 'cellulare', label: 'Cellulare', field: 'Numero_di_cellulare', align: 'left' },
  { name: 'telefono', label: 'Telefono', field: 'Numero_di_telefono', align: 'left' },
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
  if (tipo === 'Genitore') return 'secondary'
  if (tipo === 'Referente') return 'accent'
  return 'grey'
}

function computedTipi(row) {
  const tipi = []
  if (row.IsVolontario) tipi.push('Volontario')
  if (row.IsGenitore) tipi.push('Genitore')
  if (row.IsReferente) tipi.push('Referente')
  if (tipi.length === 0) tipi.push('Contatto')
  return tipi
}

function getQueryFilters() {
  let isVolontario
  let isGenitore
  let isReferente

  switch (tipoFilter.value) {
    case 'Volontario': {
      isVolontario = true

      break
    }
    case 'Genitore': {
      isGenitore = true

      break
    }
    case 'Referente': {
      isReferente = true

      break
    }
    case 'Contatto': {
      isVolontario = false
      isGenitore = false
      isReferente = false

      break
    }
    // No default
  }

  return { isVolontario, isGenitore, isReferente }
}

function onFilterChange() {
  pagination.value.page = 1
  loadData()
}

watch(rows, () => {
  caricaRevisioni()
})

async function caricaRevisioni() {
  if (!authStore.canAdmin) return
  const ids = rows.value.map(r => r.id_contatto).filter(Boolean)
  if (ids.length === 0) return
  try {
    const data = await revisionsService.getBulkRevisions('contatti', ids, 100)
    revisioniContatti.value = revisionsService.groupByItemAndField(data, ['Numero_di_cellulare', 'Numero_di_telefono'])
  } catch {
    revisioniContatti.value = {}
  }
}

onMounted(() => {
  loadData()
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

function openReferente(row) {
  referenteTarget.value = row
  showReferente.value = true
}

async function onSaved() {
  await loadData()
}
</script>
