<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Impostazioni</div>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Dati anagrafici</div>
        <div class="row q-gutter-sm">
          <q-input v-model="form.Nome" label="Nome" dense outlined class="col-12 col-sm" :rules="[val => !!val || 'Obbligatorio']" lazy-rules />
          <q-input v-model="form.Cognome" label="Cognome" dense outlined class="col-12 col-sm" :rules="[val => !!val || 'Obbligatorio']" lazy-rules />
        </div>
        <div class="row q-gutter-sm q-mt-sm">
          <q-input v-model="form.Numero_di_cellulare" label="Cellulare" dense outlined class="col-12 col-sm" />
          <q-input v-model="form.Numero_di_telefono" label="Telefono" dense outlined class="col-12 col-sm" />
        </div>
        <div class="row q-mt-md">
          <q-btn color="primary" label="Salva dati" :loading="savingContatto" @click="saveContatto" />
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Email</div>
        <div v-if="emails.length === 0" class="text-caption text-grey q-mb-sm">Nessuna email associata</div>
        <div v-for="(em, idx) in emails" :key="idx" class="row items-center q-gutter-xs q-mb-xs">
          <q-input v-model="em.email_address" label="Email" type="email" dense outlined class="col" :rules="[val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Email non valida']" lazy-rules />
          <q-btn v-if="!em.Primary && !em._saving" flat round dense icon="star_outline" color="grey" size="sm" aria-label="Imposta come primaria" @click="setPrimary(idx)">
            <q-tooltip>Imposta come primaria</q-tooltip>
          </q-btn>
          <q-badge v-else color="primary" label="Primaria" size="xs" />
          <q-btn v-if="emails.length > 1 && !em._saving" flat round dense icon="delete" size="sm" aria-label="Elimina email" :disable="em.Primary" @click="removeEmail(idx)">
            <q-tooltip>{{ em.Primary ? 'Imposta un\'altra primaria prima di eliminare' : 'Elimina email' }}</q-tooltip>
          </q-btn>
          <q-spinner v-if="em._saving" size="xs" color="grey" />
        </div>
        <q-btn flat dense icon="add" label="Aggiungi email" color="primary" size="sm" class="q-mt-sm" @click="addEmail" />
        <div v-if="emailError" class="text-negative text-caption q-mt-sm">{{ emailError }}</div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Cambia password</div>
        <q-input v-model="passwordForm.newPassword" label="Nuova password" type="password" dense outlined class="q-mb-sm" :rules="[val => !!val || 'Obbligatorio']" lazy-rules />
        <q-input v-model="passwordForm.confirmPassword" label="Conferma password" type="password" dense outlined :rules="[val => val === passwordForm.newPassword || 'Le password non coincidono']" lazy-rules />
        <div class="row q-mt-md">
          <q-btn color="primary" label="Cambia password" :loading="savingPassword" :disable="!passwordForm.newPassword || !passwordForm.confirmPassword || passwordForm.newPassword !== passwordForm.confirmPassword" @click="savePassword" />
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from 'stores/auth.store'
import { useQuasar } from 'quasar'
import { contattiService } from 'src/services/contatti.service'
import { authService } from 'src/services/auth.service'
import { emailService } from 'src/services/email.service'
import { notifySuccess, notifyError } from 'src/utils/notify'

const $q = useQuasar()
const authStore = useAuthStore()

const savingContatto = ref(false)
const savingPassword = ref(false)
const emailError = ref('')

const form = ref({
  Nome: '',
  Cognome: '',
  Numero_di_cellulare: '',
  Numero_di_telefono: ''
})

const emails = ref([])
const originalEmailIds = ref([])

const passwordForm = ref({
  newPassword: '',
  confirmPassword: ''
})

async function loadData() {
  if (!authStore.contatto) return
  form.value.Nome = authStore.contatto.Nome || ''
  form.value.Cognome = authStore.contatto.Cognome || ''
  form.value.Numero_di_cellulare = authStore.contatto.Numero_di_cellulare || ''
  form.value.Numero_di_telefono = authStore.contatto.Numero_di_telefono || ''

  try {
    const res = await emailService.getAllByContatto(authStore.contatto.id_contatto)
    emails.value = (res.data.data || []).map(e => ({
      id: e.id,
      email_address: e.email_address || '',
      Primary: !!e.Primary,
      _saving: false
    }))
    originalEmailIds.value = emails.value.map(e => e.id).filter(Boolean)
  } catch {
    emails.value = []
    originalEmailIds.value = []
  }
}

onMounted(loadData)

async function saveContatto() {
  if (!form.value.Nome || !form.value.Cognome) return
  savingContatto.value = true
  try {
    await contattiService.update(authStore.contatto.id_contatto, {
      Nome: form.value.Nome,
      Cognome: form.value.Cognome,
      Numero_di_cellulare: form.value.Numero_di_cellulare,
      Numero_di_telefono: form.value.Numero_di_telefono
    })
    authStore.contatto.Nome = form.value.Nome
    authStore.contatto.Cognome = form.value.Cognome
    authStore.contatto.Numero_di_cellulare = form.value.Numero_di_cellulare
    authStore.contatto.Numero_di_telefono = form.value.Numero_di_telefono
    notifySuccess($q, 'Dati aggiornati')
  } catch (error) {
    notifyError($q, error, 'Errore')
  } finally {
    savingContatto.value = false
  }
}

function addEmail() {
  emails.value.push({ id: null, email_address: '', Primary: false, _saving: false })
}

async function removeEmail(idx) {
  const em = emails.value[idx]
  if (!em) return
  em._saving = true
  emailError.value = ''
  try {
    if (em.id) {
      await emailService.remove(em.id)
    }
    emails.value.splice(idx, 1)
    if (emails.value.length > 0 && !emails.value.some(e => e.Primary)) {
      emails.value[0].Primary = true
      await syncUserEmail(emails.value[0])
    }
  } catch (error) {
    emailError.value = error.message || 'Errore nella rimozione'
  } finally {
    em._saving = false
  }
}

async function setPrimary(idx) {
  const em = emails.value[idx]
  if (!em || em.Primary) return

  emailError.value = ''
  const oldPrimary = emails.value.find(e => e.Primary)

  for (const e of emails.value) {
    e.Primary = false
  }
  em.Primary = true

  try {
    for (const e of emails.value) {
      if (e.id) {
        await emailService.update(e.id, { Primary: e.Primary })
      }
    }

    if (emails.value.length === 1) {
      await syncUserEmail(em)
    } else {
      $q.dialog({
        title: 'Aggiornare email di login?',
        message: `Vuoi aggiornare la email di login a "${em.email_address}"?`,
        cancel: { label: 'No', flat: true },
        ok: { label: 'Sì', color: 'primary' },
        persistent: true
      }).onOk(async () => {
        await syncUserEmail(em)
      })
    }
  } catch (error) {
    emailError.value = error.message || 'Errore'
    if (oldPrimary) {
      for (const e of emails.value) { e.Primary = false }
      oldPrimary.Primary = true
    }
  }
}

async function syncUserEmail(em) {
  if (!em?.email_address || !authStore.user?.id) return
  try {
    await authService.updateMe({ email: em.email_address })
    if (authStore.user) authStore.user.email = em.email_address
  } catch (error) {
    notifyError($q, error, 'Errore aggiornamento email login')
  }
}

async function savePassword() {
  if (!passwordForm.value.newPassword || passwordForm.value.newPassword !== passwordForm.value.confirmPassword) return
  savingPassword.value = true
  try {
    await authService.changePassword(passwordForm.value.newPassword)
    notifySuccess($q, 'Password cambiata')
    passwordForm.value.newPassword = ''
    passwordForm.value.confirmPassword = ''
  } catch (error) {
    notifyError($q, error, 'Errore')
  } finally {
    savingPassword.value = false
  }
}
</script>
