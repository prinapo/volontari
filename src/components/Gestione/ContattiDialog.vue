<template>
  <q-dialog v-model="visible" persistent>
    <q-card style="width: 100%; max-width: 900px; min-width: unset">
      <q-card-section class="row items-center">
        <div class="text-h6">
          Contatti di {{ famiglia?.Nome_Famiglia }}
        </div>
        <q-space />
        <q-btn v-close-popup icon="close" flat round dense />
      </q-card-section>

      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">
          Volontari assegnati
        </div>
        <q-table
          :rows="volontari"
          :columns="contattoColumns"
          row-key="id"
          flat
          bordered
          :pagination="{ rowsPerPage: 5 }"
        >
          <template #body-cell-email="slotPropsV">
            <q-td :props="slotPropsV">
              <template v-for="em in slotPropsV.row._emails" :key="em.email_address">
                <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" />
                <span class="text-caption">{{ em.email_address }}</span>
                <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs q-mr-sm" />
              </template>
              <span v-if="!slotPropsV.row._emails?.length" class="text-grey-5">—</span>
            </q-td>
          </template>
          <template #body-cell-azioni="slotPropsV">
            <q-td :props="slotPropsV">
              <q-btn
                flat
                dense
                icon="delete"
                color="negative"
                @click="handleRemove(slotPropsV.row)"
              >
                <q-tooltip>Rimuovi</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>

        <div class="text-subtitle1 q-mb-sm">
          Genitori assegnati
        </div>
        <q-table
          :rows="genitori"
          :columns="contattoColumns"
          row-key="id"
          flat
          bordered
          :pagination="{ rowsPerPage: 5 }"
        >
          <template #body-cell-email="slotPropsG">
            <q-td :props="slotPropsG">
              <template v-for="em in slotPropsG.row._emails" :key="em.email_address">
                <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" />
                <span class="text-caption">{{ em.email_address }}</span>
                <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs q-mr-sm" />
              </template>
              <span v-if="!slotPropsG.row._emails?.length" class="text-grey-5">—</span>
            </q-td>
          </template>
          <template #body-cell-azioni="slotPropsG">
            <q-td :props="slotPropsG">
              <q-btn
                flat
                dense
                icon="delete"
                color="negative"
                @click="handleRemove(slotPropsG.row)"
              >
                <q-tooltip>Rimuovi</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>

        <div class="row items-start q-mt-lg q-gutter-sm">
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
            class="col-12 col-sm"
            @filter="filterContatti"
          />
          <div class="row q-gutter-xs q-mt-sm-sm">
            <q-btn
              color="secondary"
              icon="person_add"
              label="Genitore"
              size="sm"
              :disable="!selectedContatto"
              @click="() => handleAssign('Genitore')"
            />
            <q-btn
              color="primary"
              icon="badge"
              label="Volontario"
              size="sm"
              :disable="!selectedContatto"
              @click="() => handleAssign('Volontario')"
            />
            <q-btn
              outline
              color="teal"
              icon="person_add"
              label="Crea contatto"
              size="sm"
              @click="showNewContatto = true"
            />
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn v-close-popup flat label="Chiudi" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <ContattoDialog
    v-model="showNewContatto"
    @saved="onNewContattoSaved"
  />

  <q-dialog v-model="showRoleDialog" persistent>
    <q-card style="width: 100%; max-width: 450px; min-width: unset">
      <q-card-section class="text-center">
        <div class="text-h6 q-mb-md">
          Associare {{ newContattoNome }} alla famiglia?
        </div>
        <div class="text-body2 text-grey q-mb-lg">
          Scegli come aggiungere il contatto alla famiglia {{ famiglia?.Nome_Famiglia }}
        </div>
        <div class="row q-gutter-sm justify-center">
          <q-btn
            color="primary"
            icon="badge"
            label="Volontario"
            @click="assignNewContatto('Volontario')"
          />
          <q-btn
            color="secondary"
            icon="person_add"
            label="Genitore"
            @click="assignNewContatto('Genitore')"
          />
          <q-btn
            flat
            color="grey"
            icon="close"
            label="Solo contatto"
            @click="showRoleDialog = false"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useGestioneStore } from 'stores/gestione.store'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { gestioneService } from 'src/services/gestione.service'
import { contattiService } from 'src/services/contatti.service'
import { emailService } from 'src/services/email.service'
import { enrichWithEmails } from 'src/utils/enrichment'
import ContattoDialog from './ContattoDialog.vue'

const $q = useQuasar()

const props = defineProps({
  modelValue: Boolean,
  famiglia: { type: Object, default: null }
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
  { name: 'nome', label: 'Nome', field: row => `${row.Contatto?.Nome || ''} ${row.Contatto?.Cognome || ''}`, align: 'left' },
  { name: 'email', label: 'Email', field: row => row._emails?.map(e => e.email_address).join(', ') || '', align: 'left' },
  { name: 'cellulare', label: 'Cellulare', field: row => row.Contatto?.Numero_di_cellulare || '', align: 'left' },
  { name: 'telefono', label: 'Telefono', field: row => row.Contatto?.Numero_di_telefono || '', align: 'left' },
  { name: 'azioni', label: '', align: 'center' }
]

watch(() => props.modelValue, async (val) => {
  visible.value = val
  if (val && props.famiglia) {
    await loadContatti()
    await preloadOptions()
  }
})

watch(visible, (val) => {
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
    const assignedIds = [
      ...volontari.value.map(v => v.Contatto?.id_contatto),
      ...genitori.value.map(g => g.Contatto?.id_contatto)
    ]
    contattoOptions.value = allContatti.value
      .filter(c => !assignedIds.includes(c.id_contatto))
      .map(c => ({ id: c.id_contatto, label: `${c.Nome} ${c.Cognome}${getEmailLabel(c)}` }))
  } catch {
    allContatti.value = []
    contattoOptions.value = []
  }
}

async function filterContatti(search, update) {
  const assignedIds = [
    ...volontari.value.map(v => v.Contatto?.id_contatto),
    ...genitori.value.map(g => g.Contatto?.id_contatto)
  ]
  let data
  if (!search) {
    data = allContatti.value
  } else {
    try {
      const res = await contattiService.search(search, false)
      data = res.data.data || []
    } catch {
      data = []
    }
  }
  update(() => {
    contattoOptions.value = data
      .filter(c => !assignedIds.includes(c.id_contatto))
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
    notifyError($q, store.error)
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
    notifyError($q, store.error)
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
    notifyError($q, store.error)
  }
}
</script>
