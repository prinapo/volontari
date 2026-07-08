<template>
  <q-dialog v-model="visible" persistent>
    <q-card style="width: 100%; max-width: 700px; min-width: unset">
      <q-card-section class="row items-center">
        <div class="text-h6">
          {{ isEdit ? 'Modifica Contatto' : 'Nuovo Contatto' }}
        </div>
        <q-space />
        <q-btn
          v-close-popup
          icon="close"
          flat
          round
          dense
          aria-label="Chiudi"
        >
          <q-tooltip>Chiudi</q-tooltip>
        </q-btn>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="handleSave">
          <div class="row q-col-gutter-sm q-mb-md">
            <q-input
              v-model="form.Nome"
              class="col-12 col-sm-6"
              label="Nome *"
              data-testid="contatto-nome"
              :rules="[val => !!val || 'Campo obbligatorio']"
              lazy-rules
              outlined
              dense
            />
            <q-input
              v-model="form.Cognome"
              class="col-12 col-sm-6"
              label="Cognome *"
              data-testid="contatto-cognome"
              :rules="[val => !!val || 'Campo obbligatorio']"
              lazy-rules
              outlined
              dense
            />
          </div>
          <div class="row q-col-gutter-sm q-mb-md">
            <q-input
              v-model="form.Numero_di_cellulare"
              class="col-12 col-sm-6"
              label="Numero di cellulare"
              data-testid="contatto-cellulare"
              :rules="[val => !val || /[\d+]/.test(val) || 'Inserire un numero di telefono valido']"
              outlined
              dense
            />
            <q-input
              v-model="form.Numero_di_telefono"
              class="col-12 col-sm-6"
              label="Numero di telefono"
              data-testid="contatto-telefono"
              outlined
              dense
            />
          </div>

          <q-toggle v-model="form.IsReferente" label="Referente" data-testid="contatto-referente" class="q-mb-md" dense />

          <div class="text-subtitle2 q-mb-sm">
            Email
          </div>
          <div v-if="emails.length === 0" class="text-caption text-grey q-mb-sm">
            Nessuna email associata
          </div>
          <div v-for="(em, idx) in emails" :key="idx" class="row items-center q-gutter-xs q-mb-xs">
            <q-input
              v-model="em.email_address"
              label="Email"
              type="email"
              dense
              outlined
              class="col"
              :data-testid="`contatto-email-${idx}`"
              :disable="hasAccount"
              @blur="onEmailBlur(em, idx)"
            />
            <q-btn
              v-if="!em.Primary"
              flat
              round
              dense
              icon="star_outline"
              color="grey"
              size="sm"
              aria-label="Imposta come primaria"
              :disable="hasAccount"
              @click="setPrimary(idx)"
            >
              <q-tooltip>Imposta come primaria</q-tooltip>
            </q-btn>
            <q-badge v-else color="primary" label="Primaria" size="sm" />
            <q-btn
              flat
              round
              dense
              icon="delete"
              color="negative"
              size="sm"
              data-testid="btn-delete-email"
              aria-label="Elimina email"
              :disable="hasAccount"
              @click="removeEmail(idx)"
            >
              <q-tooltip>Elimina email</q-tooltip>
            </q-btn>
          </div>
          <q-btn
            v-if="!hasAccount"
            flat
            dense
            icon="add"
            label="Aggiungi email"
            color="primary"
            size="sm"
            class="q-mb-md"
            @click="addEmail"
          />
        </q-form>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn v-close-popup flat label="Annulla" />
        <q-btn
          color="primary"
          label="Salva"
          :loading="store.saving"
          :disable="!form.Nome || !form.Cognome || (!!form.Numero_di_cellulare && !/[\d+]/.test(form.Numero_di_cellulare))"
          @click="handleSave"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, computed, watch } from 'vue'
import { emailService } from 'src/services/email.service'
import { notifyError } from 'src/utils/notify'
import { useGestioneStore } from 'stores/gestione.store'

function generateContattoId() {
  const ts = Date.now()
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  return Number(ts + rand)
}

const props = defineProps({
  modelValue: Boolean,
  editItem: { type: Object, default: null },
  initialData: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const $q = useQuasar()
const store = useGestioneStore()

const visible = ref(false)
const emails = ref([])
const originalEmailIds = ref([])

const form = ref({
  Nome: '',
  Cognome: '',
  Numero_di_cellulare: '',
  Numero_di_telefono: '',
  IsReferente: false
})

const isEdit = computed(() => !!props.editItem)
const hasAccount = computed(() => !!props.editItem?.user_id)

watch(() => props.modelValue, async (val) => {
  visible.value = val
  if (val && props.editItem) {
    form.value.Nome = props.editItem.Nome || ''
    form.value.Cognome = props.editItem.Cognome || ''
    form.value.Numero_di_cellulare = props.editItem.Numero_di_cellulare || ''
    form.value.Numero_di_telefono = props.editItem.Numero_di_telefono || ''
    form.value.IsReferente = props.editItem.IsReferente || false
    await loadEmails(props.editItem.id_contatto)
  } else if (val && props.initialData) {
    form.value.Nome = props.initialData.Nome || ''
    form.value.Cognome = props.initialData.Cognome || ''
    form.value.Numero_di_cellulare = props.initialData.Numero_di_cellulare || ''
    form.value.Numero_di_telefono = props.initialData.Numero_di_telefono || ''
    emails.value = props.initialData.Email
      ? [{ email_address: props.initialData.Email.toLowerCase(), Primary: true }]
      : []
  } else if (val) {
    form.value.Nome = ''
    form.value.Cognome = ''
    form.value.Numero_di_cellulare = ''
    form.value.Numero_di_telefono = ''
    emails.value = []
  }
})

async function loadEmails(contattoId) {
  if (!contattoId) { emails.value = []; originalEmailIds.value = []; return }
  try {
    const res = await emailService.getAllByContatto(contattoId)
    emails.value = (res.data.data || []).map(e => ({
      id: e.id,
      email_address: e.email_address || '',
      Primary: e.Primary || false
    }))
    originalEmailIds.value = emails.value.map(e => e.id).filter(Boolean)
  } catch {
    emails.value = []
    originalEmailIds.value = []
  }
}

function addEmail() {
  emails.value.push({ id: null, email_address: '', Primary: emails.value.length === 0 })
}

function removeEmail(idx) {
  emails.value.splice(idx, 1)
  if (emails.value.length > 0 && !emails.value.some(e => e.Primary)) {
    emails.value[0].Primary = true
  }
}

function setPrimary(idx) {
  emails.value.forEach((e, i) => { e.Primary = i === idx })
}

async function onEmailBlur(em, _idx) {
  if (!em.email_address || !isEdit.value || !props.editItem?.id_contatto) return
  if (em.id) {
    try {
      await emailService.update(em.id, { email_address: em.email_address.toLowerCase() })
    } catch (error) {
      notifyError($q, error, "Errore nell'aggiornamento dell'email")
    }
  } else {
    try {
      const res = await emailService.create({
        email_address: em.email_address.toLowerCase(),
        Contatto_Relation: props.editItem.id_contatto,
        Primary: em.Primary
      })
      em.id = res.data.data?.id
    } catch (error) {
      notifyError($q, error, 'Errore creazione email')
    }
  }
}

watch(visible, (val) => {
  if (!val) emit('update:modelValue', false)
})

async function saveEmails(contattoId) {
  try {
    for (const em of emails.value) {
      if (em.id && em.email_address) {
        await emailService.update(em.id, { email_address: em.email_address.toLowerCase(), Primary: em.Primary })
      } else if (!em.id && em.email_address) {
        await emailService.create({
          email_address: em.email_address.toLowerCase(),
          Contatto_Relation: contattoId,
          Primary: em.Primary
        })
      }
    }
    for (const origId of originalEmailIds.value) {
      if (!emails.value.some(e => e.id === origId)) {
        await emailService.remove(origId)
      }
    }
  } catch (error) {
    notifyError($q, error, "Errore nell'aggiornamento delle email")
  }
}

async function handleSaveEdit() {
  const ok = await store.updateContatto(props.editItem.id_contatto, {
    Nome: form.value.Nome,
    Cognome: form.value.Cognome,
    Numero_di_cellulare: form.value.Numero_di_cellulare || null,
    Numero_di_telefono: form.value.Numero_di_telefono || null,
    IsReferente: form.value.IsReferente
  })
  if (!ok) {
    notifyError($q, store.error || 'Errore nella modifica')
    return
  }
  await saveEmails(props.editItem.id_contatto)
  emit('saved')
  visible.value = false
}

async function handleSaveCreate() {
  const contattoId = await store.createGenitore({
    id_contatto: generateContattoId(),
    Nome: form.value.Nome,
    Cognome: form.value.Cognome,
    Email: (emails.value[0]?.email_address || '').toLowerCase(),
    Numero_di_cellulare: form.value.Numero_di_cellulare,
    Numero_di_telefono: form.value.Numero_di_telefono,
    IsReferente: form.value.IsReferente
  })
  if (!contattoId) {
    notifyError($q, store.error || 'Errore nella creazione')
    return
  }
  emit('saved', { id: contattoId, Nome: form.value.Nome, Cognome: form.value.Cognome })
  visible.value = false
}

async function handleSave() {
  if (!form.value.Nome || !form.value.Cognome) return
  if (isEdit.value) return handleSaveEdit()
  return handleSaveCreate()
}
</script>
