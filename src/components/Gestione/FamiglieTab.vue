<template>
  <div>
    <div class="row items-center q-mb-md q-gutter-sm">
      <q-input
        v-model="search"
        dense
        outlined
        placeholder="Cerca per nome famiglia..."
        clearable
        class="col"
        style="max-width: 320px"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
      </q-input>

      <q-space />

      <q-btn color="primary" icon="home_work" label="Aggiungi Famiglia" @click="openCreate" />
    </div>

    <q-table
      :rows="filteredRows"
      :columns="columns"
      row-key="id_famiglia"
      v-model:expanded="expandedRows"
      flat
      bordered
      :loading="store.loading"
      :pagination="{ rowsPerPage: 25 }"
    >
      <template #header="props">
        <q-tr :props="props">
          <q-th auto-width />
          <q-th v-for="col in props.cols" :key="col.name" :props="props">
            {{ col.label }}
          </q-th>
        </q-tr>
      </template>

      <template #body="props">
        <q-tr :props="props">
          <q-td auto-width>
            <q-btn
              flat
              round
              dense
              :icon="props.expand ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
              @click="props.expand = !props.expand; loadExpanded(props.row)"
            >
              <q-tooltip>{{ props.expand ? 'Chiudi' : 'Mostra contatti' }}</q-tooltip>
            </q-btn>
          </q-td>
          <q-td
            v-for="col in props.cols"
            :key="col.name"
            :props="props"
          >
            <template v-if="col.name === 'IBAN'">
              {{ truncateIban(props.row.IBAN) }}
            </template>
            <template v-else-if="col.name === 'azioni'">
              <q-btn flat dense icon="edit" @click="openEdit(props.row)" />
              <q-btn
                flat
                dense
                icon="contacts"
                @click="openContatti(props.row)"
              >
                <q-tooltip>Gestisci contatti</q-tooltip>
              </q-btn>
            </template>
            <template v-else>
              {{ col.value }}
            </template>
          </q-td>
        </q-tr>
        <q-tr v-show="props.expand" :props="props">
          <q-td colspan="100%">
            <q-card flat bordered class="q-ma-sm">
              <q-card-section>
                <div class="text-caption text-grey text-uppercase q-mb-sm">Contatti</div>
                <div v-if="expandedLoading && !expandedCache[props.row.id_famiglia]" class="text-center q-py-md">
                  <q-spinner size="sm" /> Caricamento...
                </div>
                <div v-else-if="!expandedCache[props.row.id_famiglia] || expandedCache[props.row.id_famiglia].length === 0" class="text-grey q-py-sm">
                  Nessun contatto assegnato a questa famiglia.
                </div>
                <q-list v-else dense>
                  <q-item v-for="c in expandedCache[props.row.id_famiglia]" :key="c.id">
                    <q-item-section avatar>
                      <q-icon name="person" size="sm" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>
                        {{ c.Contatto?.Nome || '' }} {{ c.Contatto?.Cognome || '' }}
                        <q-badge
                          outline
                          :color="c.Ruolo_nella_Famiglia === 'Genitore' ? 'secondary' : 'primary'"
                          class="q-ml-sm"
                        >
                          {{ c.Ruolo_nella_Famiglia }}
                        </q-badge>
                      </q-item-label>
                      <q-item-label caption lines="1">
                        <template v-for="em in c._emails" :key="em.email_address">
                          <q-icon name="email" size="xs" class="q-mr-xs" />
                          {{ em.email_address }}
                          <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs q-mr-sm" />
                        </template>
                        <template v-if="c.Contatto?.Numero_di_cellulare">
                          <span class="q-ml-sm">
                            <q-icon name="smartphone" size="xs" class="q-mr-xs" />
                            {{ c.Contatto.Numero_di_cellulare }}
                          </span>
                        </template>
                        <template v-if="c.Contatto?.Numero_di_telefono">
                          <span class="q-ml-sm">
                            <q-icon name="phone" size="xs" class="q-mr-xs" />
                            {{ c.Contatto.Numero_di_telefono }}
                          </span>
                        </template>
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>
          </q-td>
        </q-tr>
      </template>
    </q-table>

    <FamigliaDialog
      v-model="showDialog"
      :edit-item="editingItem"
      @saved="onSaved"
    />

    <ContattiDialog
      v-model="showContatti"
      :famiglia="contattiTarget"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useGestioneStore } from 'stores/gestione.store'
import { gestioneService } from 'src/services/gestione.service'
import FamigliaDialog from './FamigliaDialog.vue'
import ContattiDialog from './ContattiDialog.vue'

const store = useGestioneStore()

const search = ref('')

const showDialog = ref(false)
const editingItem = ref(null)

const showContatti = ref(false)
const contattiTarget = ref(null)

const expandedCache = ref({})
const expandedLoading = ref(false)
const expandedRows = ref([])

watch(showContatti, (val) => {
  if (val) {
    expandedRows.value = []
    expandedCache.value = {}
  }
})

const columns = [
  { name: 'nome', label: 'Nome Famiglia', field: 'Nome_Famiglia', align: 'left', sortable: true },
  { name: 'IBAN', label: 'IBAN', align: 'left' },
  { name: 'intestatario', label: 'Intestatario CC', field: 'Intestatario_CC', align: 'left' },
  { name: 'azioni', label: 'Azioni', align: 'center' }
]

const filteredRows = computed(() => {
  let rows = store.famiglie
  if (search.value) {
    const q = search.value.toLowerCase()
    rows = rows.filter(r => r.Nome_Famiglia?.toLowerCase().includes(q))
  }
  return rows
})

async function loadExpanded(row) {
  if (!row || expandedCache.value[ row.id_famiglia ]) return
  expandedLoading.value = true
  try {
    const res = await gestioneService.getContattiByFamiglia(row.id_famiglia)
    const items = res.data.data || []
    const ids = items.map(i => i.Contatto?.id_contatto).filter(Boolean)
    if (ids.length > 0) {
      const emailRes = await gestioneService.getEmailByContatto(ids)
      const emailByContatto = {}
      for (const e of (emailRes.data.data || [])) {
        if (e.Contatto_Relation) {
          if (!emailByContatto[e.Contatto_Relation]) emailByContatto[e.Contatto_Relation] = []
          emailByContatto[e.Contatto_Relation].push({ email_address: e.email_address, Primary: e.Primary === true })
        }
      }
      for (const item of items) {
        if (item.Contatto?.id_contatto) {
          item._emails = emailByContatto[item.Contatto.id_contatto] || []
        }
      }
    }
    expandedCache.value = { ...expandedCache.value, [row.id_famiglia]: items }
  } catch {
    expandedCache.value = { ...expandedCache.value, [row.id_famiglia]: [] }
  } finally {
    expandedLoading.value = false
  }
}

function truncateIban(iban) {
  if (!iban || iban.length < 8) return iban || ''
  return `${iban.slice(0, 4)}...${iban.slice(-4)}`
}

function openCreate() {
  editingItem.value = null
  showDialog.value = true
}

function openEdit(row) {
  editingItem.value = { ...row }
  showDialog.value = true
}

function openContatti(row) {
  contattiTarget.value = row
  showContatti.value = true
}

function onSaved() {
  // nothing to refresh
}
</script>
