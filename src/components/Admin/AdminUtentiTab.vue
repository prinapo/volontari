<template>
  <div v-if="!store.loading && store.users.length === 0 && !store.error" class="text-center text-grey-5 q-py-xl">
    <q-icon name="admin_panel_settings" size="64px" />
    <div class="text-h6 q-mt-md">
      Nessun utente trovato
    </div>
    <div class="text-body2">
      Verifica i permessi API di Directus.
    </div>
  </div>

  <div class="row items-center q-gutter-sm q-mb-md">
    <div>
      <div class="text-h5 text-weight-medium">
        User Admin
      </div>
      <div class="text-body2 text-grey-7">
        Gestisci utenti, ruoli e invii comunicazioni.
      </div>
    </div>
    <q-space />
    <q-input
      v-model="usersSearch"
      dense
      outlined
      placeholder="Cerca utente per nome o email..."
      clearable
      class="col"
      style="max-width: 320px"
    >
      <template #prepend>
        <q-icon name="search" />
      </template>
    </q-input>
    <q-btn
      flat
      round
      icon="refresh"
      :loading="store.loading"
      aria-label="Aggiorna"
      @click="store.fetchAll"
    >
      <q-tooltip>Aggiorna</q-tooltip>
    </q-btn>
    <q-btn color="primary" icon="person_add" label="Aggiungi utente" @click="openCreateDialog" />
  </div>

  <q-banner v-if="store.error" class="bg-red-1 text-negative q-mb-md" rounded>
    {{ store.error }}
  </q-banner>



  <!-- User table -->
  <q-table
    :rows="filteredUsers"
    :columns="userColumns"
    row-key="id"
    flat
    bordered
    :loading="store.loading"
    :pagination="{ rowsPerPage: 0 }"
    hide-pagination
    :grid="$q.screen.lt.sm"
  >
    <template #item="props">
      <div class="q-pa-xs col-12">
        <q-card flat bordered>
          <q-card-section class="q-py-sm">
            <div class="text-weight-medium">
              {{ props.row.first_name }} {{ props.row.last_name }}
            </div>
            <div v-if="!props.row.first_name && !props.row.last_name" class="text-grey-5">
              —
            </div>
            <div class="text-caption">
              {{ props.row.email }}
            </div>
            <div class="row items-center q-gutter-xs q-mt-xs">
              <q-badge
                :color="roleColor(props.row.role?.name)"
                outline
                class="q-px-sm q-py-xs"
              >
                {{ props.row.role?.name || 'Nessun ruolo' }}
              </q-badge>
              <q-space />
              <q-select
                :model-value="props.row.role?.id"
                :options="roleOptions"
                option-value="id"
                option-label="name"
                dense
                options-dense
                outlined
                emit-value
                map-options
                class="admin-role-select select-min-width"
                :loading="store.saving"
                @update:model-value="(val) => handleRoleChange(props.row.id, val)"
              >
                <template #selected-item="opt">
                  <div class="text-caption">
                    {{ opt.opt.name }}
                  </div>
                </template>
              </q-select>
              <q-btn
                flat
                dense
                icon="theater_comedy"
                color="purple"
                size="sm"
                aria-label="Impersona utente"
                @click="store.startImpersonation(props.row.id)"
              >
                <q-tooltip>Impersona {{ props.row.first_name || props.row.email }}</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                icon="lock_reset"
                color="warning"
                size="sm"
                aria-label="Reset password"
                @click="openResetPasswordDialog(props.row)"
              >
                <q-tooltip>Reset password</q-tooltip>
              </q-btn>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </template>

    <template #body-cell-name="props">
      <q-td :props="props">
        <div class="text-weight-medium">
          {{ props.row.first_name }} {{ props.row.last_name }}
        </div>
        <div v-if="!props.row.first_name && !props.row.last_name" class="text-grey-5">
          —
        </div>
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
            outlined
            emit-value
            map-options
            class="admin-role-select"
            :loading="store.saving"
            @update:model-value="(val) => handleRoleChange(props.row.id, val)"
          >
            <template #selected-item="opt">
              <div class="text-caption">
                {{ opt.opt.name }}
              </div>
            </template>
          </q-select>
          <q-btn
            flat
            dense
            icon="theater_comedy"
            color="purple"
            size="sm"
            aria-label="Impersona utente"
            @click="store.startImpersonation(props.row.id)"
          >
            <q-tooltip>Impersona {{ props.row.first_name || props.row.email }}</q-tooltip>
          </q-btn>
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
        <div class="text-h6">
          Aggiungi utente
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

      <q-separator />

      <q-card-section class="scroll scroll-area-70">
        <!-- Step 1: Email search -->
        <div class="row q-col-gutter-sm items-end q-mb-md">
          <div class="col">
            <q-input v-model="searchEmail" label="Email *" outlined dense :disable="userCreated" />
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
            <q-input v-model="newFirstName" label="Nome" outlined dense />
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model="newLastName" label="Cognome" outlined dense />
          </div>
        </div>

        <!-- Role select -->
        <q-select
          v-model="newRole"
          :options="store.roles"
          option-value="id"
          option-label="name"
          label="Ruolo *"
          outlined
          dense
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

      <!-- Post-creation: success -->
      <template v-if="userCreated">
        <q-separator />
        <q-card-section>
          <div class="text-h6 text-positive q-mb-sm">
            <q-icon name="check_circle" /> Utente creato con successo
          </div>
          <div class="text-body2 q-mb-sm">
            Email: <strong>{{ searchEmail }}</strong>
          </div>
        </q-card-section>
      </template>

      <q-card-actions align="right">
        <q-btn v-close-popup flat label="Chiudi" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Reset Password Dialog -->
  <q-dialog v-model="showResetDialog" persistent>
    <q-card>
      <q-card-section class="row items-center">
        <div class="text-h6">
          Reset password
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
      <q-separator />
      <q-card-section>
        <div class="text-body2 q-mb-md">
          Nuova password per <strong>{{ resetUser?.email }}</strong>
        </div>
        <q-input
          v-model="resetPassword"
          label="Nuova password *"
          outlined
          dense
          :type="showResetPwd ? 'text' : 'password'"
        >
          <template #append>
            <q-icon
              :name="showResetPwd ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="showResetPwd = !showResetPwd"
            />
          </template>
        </q-input>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn v-close-popup flat label="Annulla" />
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
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, computed, onMounted } from 'vue'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { useAdminStore } from 'stores/admin.store'

const $q = useQuasar()
const store = useAdminStore()

const usersSearch = ref('')

const filteredUsers = computed(() => {
  const q = usersSearch.value.toLowerCase().trim()
  if (!q) return store.users
  return store.users.filter(u =>
    (u.first_name || '').toLowerCase().includes(q) ||
    (u.last_name || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q)
  )
})

const userColumns = [
  { name: 'name', label: 'Nome', align: 'left' },
  { name: 'email', label: 'Email', align: 'left' },
  { name: 'role', label: 'Ruolo', align: 'center' },
  { name: 'actions', label: 'Azioni', align: 'center' }
]



const roleOptions = computed(() => store.roles)
const roleColor = (name) => {
  const n = (name || '').toLowerCase()
  if (n.includes('admin') || n.includes('administrator')) return 'negative'
  if (n.includes('manager') || n.includes('verifica') || n.includes('valid')) return 'primary'
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


function openCreateDialog() {
  searchEmail.value = ''
  newFirstName.value = ''
  newLastName.value = ''
  newRole.value = null
  userCreated.value = false
  store.contattoTrovato = null
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
    notifySuccess($q, 'Utente creato con successo')
    userCreated.value = true
  } else if (store.error) {
    notifyError($q, store.error, "Errore nella creazione dell'utente")
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
    notifySuccess($q, 'Password reimpostata con successo')
    showResetDialog.value = false
  } else if (store.error) {
    notifyError($q, store.error, 'Errore nel reset della password')
  }
}

async function handleRoleChange(userId, roleId) {
  if (!roleId) return
  const ok = await store.updateUserRole(userId, roleId)
  if (ok) {
    notifySuccess($q, 'Ruolo aggiornato')
  } else if (store.error) {
    notifyError($q, store.error, "Errore nell'aggiornamento del ruolo")
  }
}

onMounted(() => {
  store.fetchAll()
})
</script>
