<template>
  <q-dialog v-model="visible" persistent>
    <q-card>
      <q-card-section class="row items-center">
        <div class="text-h6">Contatti di {{ famiglia?.Nome_Famiglia }}</div>
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

      <template v-if="!hideExisting">
        <q-card-section>
          <div class="text-subtitle1 q-mb-sm">Volontari assegnati</div>
        <q-table
          :rows="volontari"
          :columns="contattoColumns"
          row-key="id"
          flat
          bordered
          :grid="$q.screen.lt.sm"
          :pagination="{ rowsPerPage: 5 }"
        >
          <template #item="slotPropsV">
            <div class="q-pa-xs col-12">
              <q-card flat bordered>
                <q-card-section class="q-pa-sm">
                  <div class="text-weight-medium">
                    {{ slotPropsV.row.Contatto?.Nome || '' }} {{ slotPropsV.row.Contatto?.Cognome || '' }}
                  </div>
                  <div class="text-caption q-mt-xs">
                    <template v-for="em in slotPropsV.row._emails" :key="em.email_address">
                      <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" /><ContactLink
                        type="email"
                        :value="em.email_address"
                      />
                      <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs q-mr-sm" />
                    </template>
                    <span v-if="!slotPropsV.row._emails?.length" class="text-grey-5">—</span>
                  </div>
                  <div class="text-caption text-grey-7">
                    <template v-if="slotPropsV.row.Contatto?.Numero_di_cellulare">
                      <ContactLink type="tel" :value="slotPropsV.row.Contatto?.Numero_di_cellulare" /> </template
                    ><template v-if="slotPropsV.row.Contatto?.Numero_di_telefono">
                      <ContactLink type="tel" :value="slotPropsV.row.Contatto?.Numero_di_telefono" />
                    </template>
                  </div>
                  <div class="row q-mt-sm justify-end">
                    <q-btn
                      flat
                      round
                      dense
                      icon="delete"
                      size="sm"
                      aria-label="Rimuovi"
                      @click="handleRemove(slotPropsV.row)"
                    >
                      <q-tooltip>Rimuovi</q-tooltip>
                    </q-btn>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </template>
          <template #body-cell-email="slotPropsV">
            <q-td :props="slotPropsV">
              <template v-for="em in slotPropsV.row._emails" :key="em.email_address">
                <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" />
                <ContactLink type="email" :value="em.email_address" />
                <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs q-mr-sm" />
              </template>
              <span v-if="!slotPropsV.row._emails?.length" class="text-grey-5">—</span>
            </q-td>
          </template>
          <template #body-cell-azioni="slotPropsV">
            <q-td :props="slotPropsV">
              <q-btn
                flat
                round
                dense
                icon="delete"
                aria-label="Rimuovi"
                @click="handleRemove(slotPropsV.row)"
              >
                <q-tooltip>Rimuovi</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>

        <div class="text-subtitle1 q-mb-sm">Genitori assegnati</div>
        <q-table
          :rows="genitori"
          :columns="contattoColumns"
          row-key="id"
          flat
          bordered
          :grid="$q.screen.lt.sm"
          :pagination="{ rowsPerPage: 5 }"
        >
          <template #item="slotPropsG">
            <div class="q-pa-xs col-12">
              <q-card flat bordered>
                <q-card-section class="q-pa-sm">
                  <div class="text-weight-medium">
                    {{ slotPropsG.row.Contatto?.Nome || '' }} {{ slotPropsG.row.Contatto?.Cognome || '' }}
                  </div>
                  <div class="text-caption q-mt-xs">
                    <template v-for="em in slotPropsG.row._emails" :key="em.email_address">
                      <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" /><ContactLink
                        type="email"
                        :value="em.email_address"
                      />
                      <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs q-mr-sm" />
                    </template>
                    <span v-if="!slotPropsG.row._emails?.length" class="text-grey-5">—</span>
                  </div>
                  <div class="text-caption text-grey-7">
                    <template v-if="slotPropsG.row.Contatto?.Numero_di_cellulare">
                      <ContactLink type="tel" :value="slotPropsG.row.Contatto?.Numero_di_cellulare" /> </template
                    ><template v-if="slotPropsG.row.Contatto?.Numero_di_telefono">
                      <ContactLink type="tel" :value="slotPropsG.row.Contatto?.Numero_di_telefono" />
                    </template>
                  </div>
                  <div class="row q-mt-sm justify-end">
                    <q-btn
flat
round
dense
icon="delete"
size="sm"
@click="handleRemove(slotPropsG.row)">
                      <q-tooltip>Rimuovi</q-tooltip>
                    </q-btn>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </template>
          <template #body-cell-email="slotPropsG">
            <q-td :props="slotPropsG">
              <template v-for="em in slotPropsG.row._emails" :key="em.email_address">
                <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" />
                <ContactLink type="email" :value="em.email_address" />
                <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs q-mr-sm" />
              </template>
              <span v-if="!slotPropsG.row._emails?.length" class="text-grey-5">—</span>
            </q-td>
          </template>
          <template #body-cell-azioni="slotPropsG">
            <q-td :props="slotPropsG">
              <q-btn
flat
round
dense
icon="delete"
@click="handleRemove(slotPropsG.row)">
                <q-tooltip>Rimuovi</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
      </template>

      <q-card-section>
        <q-select
          v-model="selectedContatto"
          :options="contattoOptions"
          option-label="label"
          option-value="id"
          emit-value
          map-options
          dense
          outlined
          use-input
          input-debounce="300"
          label="Cerca contatto..."
          clearable
          @filter="filterContatti"
        />
        <div class="row q-gutter-sm q-mt-sm">
          <q-btn
            outline
            color="secondary"
            icon="person_add"
            label="Genitore"
            size="md"
            :disable="!selectedContatto"
            @click="() => handleAssign('Genitore')"
          />
          <q-btn
            outline
            color="primary"
            icon="badge"
            label="Volontario"
            size="md"
            :disable="!selectedContatto"
            @click="() => handleAssign('Volontario')"
          />
          <q-btn
            outline
            color="accent"
            icon="person_add"
            label="Crea contatto"
            size="md"
            @click="showNewContatto = true"
          />
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn v-close-popup flat dense size="sm" label="Chiudi" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <ContattoDialog v-model="showNewContatto" @saved="onNewContattoSaved" />

  <q-dialog v-model="showRoleDialog" persistent>
    <q-card>
      <q-card-section class="text-center">
        <div class="text-h6 q-mb-md">Associare {{ newContattoNome }} alla famiglia?</div>
        <div class="text-body2 text-grey q-mb-lg">
          Scegli come aggiungere il contatto alla famiglia {{ famiglia?.Nome_Famiglia }}
        </div>
        <div class="row q-gutter-sm justify-center">
          <q-btn color="primary" icon="badge" label="Volontario" @click="assignNewContatto('Volontario')" />
          <q-btn color="secondary" icon="person_add" label="Genitore" @click="assignNewContatto('Genitore')" />
          <q-btn flat color="grey" icon="person_off" label="Solo contatto" @click="showRoleDialog = false" />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, watch } from 'vue'
import ContactLink from 'components/Common/ContactLink.vue'
import { contattiService } from 'src/services/contatti.service'
import { emailService } from 'src/services/email.service'
import { gestioneService } from 'src/services/gestione.service'
import { enrichWithEmails } from 'src/utils/enrichment'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { useGestioneStore } from 'stores/gestione.store'
import ContattoDialog from './ContattoDialog.vue'

const $q = useQuasar()

const props = defineProps({
  modelValue: Boolean,
  famiglia: { type: Object, default: null },
  hideExisting: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const store = useGestioneStore()

const visible = ref(false)
const volontari = ref([])
const genitori = ref([])

const selectedContatto = ref(null)
const contattoOptions = ref([])
const showNewContatto = ref(false)
const showRoleDialog = ref(false)
const newContattoId = ref(null)
const newContattoNome = ref('')
const allContatti = ref([])

function getEmailLabel(c) {
  if (!c.email || !c.email.length) return ''
  const primary = c.email.find(e => e.Primary === true)
  return ` (${primary?.email_address || c.email[0]?.email_address || ''})`
}

const contattoColumns = [
  {
    name: 'nome',
    label: 'Nome',
    field: row => `${row.Contatto?.Nome || ''} ${row.Contatto?.Cognome || ''}`,
    align: 'left'
  },
  {
    name: 'email',
    label: 'Email',
    field: row => row._emails?.map(e => e.email_address).join(', ') || '',
    align: 'left'
  },
  { name: 'cellulare', label: 'Cellulare', field: row => row.Contatto?.Numero_di_cellulare || '', align: 'left' },
  { name: 'telefono', label: 'Telefono', field: row => row.Contatto?.Numero_di_telefono || '', align: 'left' },
  { name: 'azioni', label: '', align: 'center' }
]

watch(
  () => props.modelValue,
  async val => {
    visible.value = val
    if (val && props.famiglia) {
      await loadContatti()
      await preloadOptions()
    }
  }
)

watch(visible, val => {
  if (!val) emit('update:modelValue', false)
})

async function loadContatti() {
  try {
    const res = await gestioneService.getContattiByFamiglia(props.famiglia.id_famiglia)
    const items = res.data.data || []
    const ids = items.map(i => i.Contatto?.id_contatto).filter(Boolean)
    if (ids.length > 0) {
      const emailMap = await enrichWithEmails(ids, emailService.getByContatto.bind(emailService))
      for (const item of items) {
        if (item.Contatto?.id_contatto) {
          item._emails = emailMap[item.Contatto.id_contatto] || []
        }
      }
    }
    volontari.value = items.filter(i => i.Ruolo_nella_Famiglia === 'Volontario')
    genitori.value = items.filter(i => i.Ruolo_nella_Famiglia === 'Genitore')
  } catch {
    volontari.value = []
    genitori.value = []
  }
}

async function preloadOptions() {
  try {
    const res = await contattiService.search('', false)
    allContatti.value = res.data.data || []
    const assignedIds = new Set([
      ...volontari.value.map(v => v.Contatto?.id_contatto),
      ...genitori.value.map(g => g.Contatto?.id_contatto)
    ])
    contattoOptions.value = allContatti.value
      .filter(c => !assignedIds.has(c.id_contatto))
      .map(c => ({ id: c.id_contatto, label: `${c.Nome} ${c.Cognome}${getEmailLabel(c)}` }))
  } catch {
    allContatti.value = []
    contattoOptions.value = []
  }
}

async function filterContatti(search, update) {
  const assignedIds = new Set([
    ...volontari.value.map(v => v.Contatto?.id_contatto),
    ...genitori.value.map(g => g.Contatto?.id_contatto)
  ])
  let data
  if (search) {
    try {
      const res = await contattiService.search(search, false)
      data = res.data.data || []
    } catch {
      data = []
    }
  } else {
    data = allContatti.value
  }
  update(() => {
    contattoOptions.value = data
      .filter(c => !assignedIds.has(c.id_contatto))
      .map(c => ({ id: c.id_contatto, label: `${c.Nome} ${c.Cognome}${getEmailLabel(c)}` }))
  })
}

async function handleAssign(ruolo) {
  if (!selectedContatto.value) return
  const ok = await store.assignToFamiglia(selectedContatto.value, props.famiglia.id_famiglia, ruolo)
  if (ok) {
    notifySuccess($q, 'Contatto associato come ' + ruolo)
    selectedContatto.value = null
    await loadContatti()
    await preloadOptions()
  } else if (store.error) {
    notifyError($q, store.error, "Errore nell'assegnazione del contatto")
  }
}

function onNewContattoSaved(data) {
  showNewContatto.value = false
  if (data?.id) {
    newContattoId.value = data.id
    newContattoNome.value = `${data.Nome} ${data.Cognome}`
    showRoleDialog.value = true
  } else {
    preloadOptions()
  }
}

async function assignNewContatto(ruolo) {
  showRoleDialog.value = false
  if (!newContattoId.value || !props.famiglia?.id_famiglia) return
  const ok = await store.assignToFamiglia(newContattoId.value, props.famiglia.id_famiglia, ruolo)
  if (ok) {
    notifySuccess($q, `Contatto associato come ${ruolo}`)
    await loadContatti()
    await preloadOptions()
  } else if (store.error) {
    notifyError($q, store.error, "Errore nell'associazione del contatto")
  }
}

async function handleRemove(row) {
  const contattoId = row.Contatto?.id_contatto || row.Contatto
  const ok = await store.removeFromFamiglia(row.id, contattoId, row.Ruolo_nella_Famiglia)
  if (ok) {
    notifySuccess($q, 'Contatto rimosso dalla famiglia')
    await loadContatti()
    await preloadOptions()
  } else if (store.error) {
    notifyError($q, store.error, 'Errore nella rimozione del contatto')
  }
}
</script>
