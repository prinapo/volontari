<template>
  <q-page class="q-pa-md admin-page">
    <div v-if="!store.loading && store.users.length === 0 && !store.error" class="text-center text-grey-5 q-py-xl">
      <q-icon name="admin_panel_settings" size="64px" />
      <div class="text-h6 q-mt-md">Nessun utente trovato</div>
      <div class="text-body2">Verifica i permessi API di Directus.</div>
    </div>

    <div class="row items-center q-gutter-sm q-mb-md">
      <div>
        <div class="text-h5 text-weight-medium">User Admin</div>
        <div class="text-body2 text-grey-7">
          Gestisci utenti, ruoli e invii comunicazioni.
        </div>
      </div>
      <q-space />
      <q-btn flat round icon="refresh" :loading="store.loading" @click="store.fetchAll">
        <q-tooltip>Aggiorna</q-tooltip>
      </q-btn>
      <q-btn color="primary" icon="person_add" label="Aggiungi utente" @click="openCreateDialog" />
    </div>

    <q-banner v-if="store.error" class="bg-red-1 text-negative q-mb-md" rounded>
      {{ store.error }}
    </q-banner>

    <q-table
      :rows="store.users"
      :columns="columns"
      row-key="id"
      flat
      bordered
      :loading="store.loading"
      :pagination="{ rowsPerPage: 0 }"
      hide-pagination
    >
      <template #body-cell-name="props">
        <q-td :props="props">
          <div class="text-weight-medium">{{ props.row.first_name }} {{ props.row.last_name }}</div>
          <div v-if="!props.row.first_name && !props.row.last_name" class="text-grey-5">—</div>
        </q-td>
      </template>

      <template #body-cell-email="props">
        <q-td :props="props">
          {{ props.row.email }}
        </q-td>
      </template>

      <template #body-cell-role="props">
        <q-td :props="props">
          <q-badge
            :color="roleColor(props.row.role?.name)"
            outline
            class="q-px-sm q-py-xs"
          >
            {{ props.row.role?.name || 'Nessun ruolo' }}
          </q-badge>
        </q-td>
      </template>

      <template #body-cell-actions="props">
        <q-td :props="props">
          <div class="row items-center q-gutter-xs no-wrap">
            <q-select
              :model-value="props.row.role?.id"
              :options="roleOptions"
              option-value="id"
              option-label="name"
              dense
              options-dense
              borderless
              emit-value
              map-options
              style="min-width: 140px"
              :loading="store.saving"
              @update:model-value="(val) => handleRoleChange(props.row.id, val)"
            >
              <template v-slot:selected-item="opt">
                <div class="text-caption">{{ opt.opt.name }}</div>
              </template>
            </q-select>
            <q-btn
              flat
              dense
              icon="lock_reset"
              color="warning"
              size="sm"
              @click="openResetPasswordDialog(props.row)"
            >
              <q-tooltip>Reset password</q-tooltip>
            </q-btn>
          </div>
        </q-td>
      </template>
    </q-table>

    <!-- Create User Dialog -->
    <q-dialog v-model="showCreateDialog" persistent maximized>
      <q-card>
        <q-card-section class="row items-center">
          <div class="text-h6">Aggiungi utente</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-separator />

        <q-card-section class="scroll" style="max-height: 70vh">
          <!-- Step 1: Email search -->
          <div class="row q-col-gutter-sm items-end q-mb-md">
            <div class="col">
              <q-input v-model="searchEmail" label="Email *" filled :disable="userCreated" />
            </div>
            <div class="col-auto">
              <q-btn
                label="Cerca contatto"
                color="secondary"
                :disable="!searchEmail || userCreated"
                :loading="store.loading"
                @click="handleSearchContatto"
              />
            </div>
          </div>

          <!-- Contatto trovato -->
          <div v-if="store.contattoTrovato" class="bg-positive-1 text-positive q-pa-sm q-mb-md rounded-borders">
            <q-icon name="check_circle" class="q-mr-xs" />
            Contatto trovato: <strong>{{ store.contattoTrovato.Nome }} {{ store.contattoTrovato.Cognome }}</strong>
          </div>

          <!-- Contatto not found: show name fields -->
          <div v-if="store.contattoTrovato === null && searchEmail && !userCreated" class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-sm-6">
              <q-input v-model="newFirstName" label="Nome" filled />
            </div>
            <div class="col-12 col-sm-6">
              <q-input v-model="newLastName" label="Cognome" filled />
            </div>
          </div>

          <!-- Role select -->
          <q-select
            v-model="newRole"
            :options="store.roles"
            option-value="id"
            option-label="name"
            label="Ruolo *"
            filled
            emit-value
            map-options
            class="q-mb-md"
            :disable="userCreated"
          />

          <!-- Create button -->
          <q-btn
            v-if="!userCreated"
            color="primary"
            label="Crea utente"
            :disable="!searchEmail || !newRole"
            :loading="store.saving"
            @click="handleCreateUser"
          />
        </q-card-section>

        <!-- Post-creation: show info + send email -->
        <template v-if="userCreated">
          <q-separator />
          <q-card-section>
            <div class="text-h6 text-positive q-mb-sm">
              <q-icon name="check_circle" /> Utente creato con successo
            </div>
            <div class="text-body2 q-mb-sm">Email: <strong>{{ searchEmail }}</strong></div>
            <div class="text-caption text-grey-7 q-mb-md">
              Directus invierà automaticamente un'email di invito per impostare la password.
            </div>

            <q-separator class="q-mb-md" />

            <div class="text-subtitle2 q-mb-sm">Invia email informativa (opzionale)</div>
            <q-input v-model="emailSubject" label="Soggetto" filled class="q-mb-sm" placeholder="Benvenuto sul Portale Volontario" />
            <q-input v-model="emailBody" label="Testo email" filled type="textarea" autogrow class="q-mb-sm" placeholder="Ciao {nome}, il tuo account è stato creato. Accedi a {link_login}" />
            <div class="text-caption text-grey-7 q-mb-sm">
              Placeholder disponibili: <code>{email}</code> <code>{nome}</code> <code>{link_login}</code>
            </div>
            <q-btn
              color="secondary"
              label="Invia email"
              :disable="!emailSubject || !emailBody"
              :loading="store.sending"
              @click="handleSendEmail"
            />
          </q-card-section>
        </template>

        <q-card-actions align="right">
          <q-btn flat label="Chiudi" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Reset Password Dialog -->
    <q-dialog v-model="showResetDialog" persistent>
      <q-card style="min-width: 350px">
        <q-card-section class="row items-center">
          <div class="text-h6">Reset password</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <div class="text-body2 q-mb-md">
            Nuova password per <strong>{{ resetUser?.email }}</strong>
          </div>
          <q-input
            v-model="resetPassword"
            label="Nuova password *"
            filled
            :type="showResetPwd ? 'text' : 'password'"
          >
            <template v-slot:append>
              <q-icon
                :name="showResetPwd ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showResetPwd = !showResetPwd"
              />
            </template>
          </q-input>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annulla" v-close-popup />
          <q-btn
            color="primary"
            label="Salva password"
            :disable="!resetPassword"
            :loading="store.saving"
            @click="handleResetPassword"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAdminStore } from 'stores/admin.store'

const $q = useQuasar()
const store = useAdminStore()

const columns = [
  { name: 'name', label: 'Nome', align: 'left', style: 'width: 200px' },
  { name: 'email', label: 'Email', align: 'left' },
  { name: 'role', label: 'Ruolo', align: 'center', style: 'width: 130px' },
  { name: 'actions', label: 'Azioni', align: 'center', style: 'width: 220px' }
]

const roleOptions = computed(() => store.roles)
const roleColor = (name) => {
  const n = (name || '').toLowerCase()
  if (n.includes('admin') || n.includes('administrator')) return 'negative'
  if (n.includes('verifica') || n.includes('valid')) return 'primary'
  if (n.includes('gestione') || n.includes('gestore')) return 'secondary'
  return 'grey'
}

// Create user dialog
const showCreateDialog = ref(false)
const searchEmail = ref('')
const newFirstName = ref('')
const newLastName = ref('')
const newRole = ref(null)
const userCreated = ref(false)
const emailSubject = ref('')
const emailBody = ref('')

function openCreateDialog() {
  searchEmail.value = ''
  newFirstName.value = ''
  newLastName.value = ''
  newRole.value = null
  userCreated.value = false
  store.contattoTrovato = null
  emailSubject.value = ''
  emailBody.value = ''
  showCreateDialog.value = true
}

async function handleSearchContatto() {
  await store.searchContatto(searchEmail.value)
  if (!store.contattoTrovato) {
    newFirstName.value = ''
    newLastName.value = ''
  }
}

async function handleCreateUser() {
  const ok = await store.createUser(
    searchEmail.value,
    newRole.value,
    newFirstName.value,
    newLastName.value
  )
  if (ok) {
    userCreated.value = true
  }
}

async function handleSendEmail() {
  const nome = store.contattoTrovato
    ? `${store.contattoTrovato.Nome} ${store.contattoTrovato.Cognome}`
    : `${newFirstName.value} ${newLastName.value}`.trim()
  const body = emailBody.value
    .replace(/\{nome\}/g, nome)
  const ok = await store.sendCustomEmail(searchEmail.value, emailSubject.value, body)
  if (ok) {
    $q.notify({ type: 'positive', message: 'Email inviata con successo' })
    emailSubject.value = ''
    emailBody.value = ''
  }
}

// Reset password dialog
const showResetDialog = ref(false)
const resetUser = ref(null)
const resetPassword = ref('')
const showResetPwd = ref(false)

function openResetPasswordDialog(user) {
  resetUser.value = user
  resetPassword.value = ''
  showResetPwd.value = false
  showResetDialog.value = true
}

async function handleResetPassword() {
  const ok = await store.resetUserPassword(resetUser.value.id, resetPassword.value)
  if (ok) {
    $q.notify({ type: 'positive', message: 'Password reimpostata con successo' })
    showResetDialog.value = false
  }
}

async function handleRoleChange(userId, roleId) {
  if (!roleId) return
  const ok = await store.updateUserRole(userId, roleId)
  if (ok) {
    $q.notify({ type: 'positive', message: 'Ruolo aggiornato' })
  }
}

onMounted(() => {
  store.fetchAll()
})
</script>
