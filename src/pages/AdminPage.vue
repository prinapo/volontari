<template>
  <q-page class="q-pa-md admin-page">
    <div v-if="!authStore.initialized" class="text-center q-mt-xl">
      <q-spinner size="lg" />
      <div class="q-mt-sm">
        Caricamento...
      </div>
    </div>
    <template v-else>
      <div class="q-mb-md">
        <q-tabs
          v-model="activeTab"
          dense
          class="text-grey"
          active-color="primary"
          indicator-color="primary"
          align="left"
        >
          <q-tab name="utenti" icon="people" label="Utenti" />
          <q-tab name="progetti" icon="account_balance" label="Progetti" />
          <q-tab name="associazioni" icon="business" label="Associazioni" />
        </q-tabs>
      </div>

      <q-tab-panels v-model="activeTab" animated>
        <q-tab-panel name="utenti">
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
                        class="admin-role-select admin-role-min-width"
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
        </q-tab-panel>

        <q-tab-panel name="progetti">
          <div class="row items-center q-gutter-sm q-mb-md">
            <div>
              <div class="text-h5 text-weight-medium">
                Progetti
              </div>
              <div class="text-body2 text-grey-7">
                Gestisci i nominativi (cognome e nome) dei beneficiari.
              </div>
            </div>
            <q-space />
            <q-input
              v-model="store.searchProgetti"
              dense
              outlined
              placeholder="Cerca per cognome o nome..."
              clearable
              class="col"
              style="max-width: 320px"
              debounce="300"
              @update:model-value="store.fetchProgetti"
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
            <q-btn
              flat
              round
              icon="refresh"
              :loading="store.progettiLoading"
              aria-label="Aggiorna"
              @click="refreshProgetti"
            >
              <q-tooltip>Aggiorna</q-tooltip>
            </q-btn>
            <q-btn
              color="positive"
              icon="save"
              label="Salva tutto"
              :disable="!hasModified"
              :loading="store.saving"
              @click="saveAll"
            />
          </div>

          <q-banner v-if="store.error" class="bg-red-1 text-negative q-mb-md" rounded>
            {{ store.error }}
          </q-banner>

          <q-table
            :rows="store.progetti"
            :columns="progettiColumns"
            row-key="id_progetto"
            flat
            bordered
            :loading="store.progettiLoading"
            :pagination="{ rowsPerPage: 0 }"
            hide-pagination
            :grid="$q.screen.lt.sm"
          >
            <template #body-cell-cognome="props">
              <q-td :props="props">
                <q-input
                  :model-value="getBuffer(props.row).cognome"
                  outlined
                  dense
                  class="inline-edit-input"
                  @update:model-value="val => setCognome(props.row, val)"
                />
              </q-td>
            </template>
            <template #body-cell-nome="props">
              <q-td :props="props">
                <q-input
                  :model-value="getBuffer(props.row).nome"
                  outlined
                  dense
                  class="inline-edit-input"
                  @update:model-value="val => setNome(props.row, val)"
                />
              </q-td>
            </template>
            <template #body-cell-actions="props">
              <q-td :props="props">
                <q-btn
                  v-if="isModified(props.row)"
                  icon="save"
                  color="positive"
                  round
                  flat
                  size="sm"
                  :loading="store.saving"
                  aria-label="Salva beneficiario"
                  @click="saveBeneficiario(props.row)"
                >
                  <q-tooltip>Salva</q-tooltip>
                </q-btn>
              </q-td>
            </template>
            <template #item="props">
              <div class="q-pa-xs col-12">
                <q-card flat bordered>
                  <q-card-section>
                    <div class="text-weight-medium q-mb-xs">
                      {{ [props.row.Cognome_Beneficiario, props.row.Nome_Beneficiario].filter(Boolean).join(' ') }}
                    </div>
                    <div class="row q-col-gutter-sm">
                      <div class="col-6">
                        <q-input
                          :model-value="getBuffer(props.row).cognome"
                          label="Cognome"
                          outlined
                          dense
                          @update:model-value="val => setCognome(props.row, val)"
                        />
                      </div>
                      <div class="col-6">
                        <q-input
                          :model-value="getBuffer(props.row).nome"
                          label="Nome"
                          outlined
                          dense
                          @update:model-value="val => setNome(props.row, val)"
                        />
                      </div>
                    </div>
                    <div class="text-center q-mt-sm">
                      <q-btn
                        v-if="isModified(props.row)"
                        icon="save"
                        color="positive"
                        round
                        flat
                        size="sm"
                        :loading="store.saving"
                        aria-label="Salva beneficiario"
                        @click="saveBeneficiario(props.row)"
                      >
                        <q-tooltip>Salva</q-tooltip>
                      </q-btn>
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </template>
          </q-table>
        </q-tab-panel>

        <q-tab-panel name="associazioni">
          <div class="row items-center q-gutter-sm q-mb-md">
            <div>
              <div class="text-h5 text-weight-medium">
                Associazioni
              </div>
              <div class="text-body2 text-grey-7">
                Gestisci i budget annuali delle associazioni.
              </div>
            </div>
            <q-space />
            <q-btn flat round icon="refresh" aria-label="Aggiorna" @click="fetchAssociazioni">
              <q-tooltip>Aggiorna</q-tooltip>
            </q-btn>
          </div>

          <q-table
            :rows="associazioni"
            :columns="assocColumns"
            row-key="id"
            flat bordered
            hide-pagination
            :pagination="{ rowsPerPage: 0 }"
          >
            <template #body-cell-budget="props">
              <q-td :props="props">
                <q-input
                  :model-value="assocBudgetCache[props.row.id] !== undefined ? assocBudgetCache[props.row.id] : props.row.Budget"
                  outlined dense
                  type="number"
                  min="0"
                  step="0.01"
                  @update:model-value="val => editAssocBudget(props.row, val)"
                />
              </q-td>
            </template>
            <template #body-cell-actions="props">
              <q-td :props="props">
                <q-btn
                  v-if="assocBudgetCache[props.row.id] !== undefined"
                  icon="save" color="positive" round flat size="sm"
                  :loading="savingAssoc"
                  @click="saveAssocBudget(props.row)"
                >
                  <q-tooltip>Salva</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>
      </q-tab-panels>

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

          <q-card-section class="scroll admin-scroll-area">
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

          <!-- Post-creation: show info + send email -->
          <template v-if="userCreated">
            <q-separator />
            <q-card-section>
              <div class="text-h6 text-positive q-mb-sm">
                <q-icon name="check_circle" /> Utente creato con successo
              </div>
              <div class="text-body2 q-mb-sm">
                Email: <strong>{{ searchEmail }}</strong>
              </div>
              <div class="text-caption text-grey-7 q-mb-md">
                Directus invierà automaticamente un'email di invito per impostare la password.
              </div>

              <q-separator class="q-mb-md" />

              <div class="text-subtitle2 q-mb-sm">
                Invia email informativa (opzionale)
              </div>
              <q-input
                v-model="emailSubject"
                label="Soggetto"
                outlined
                dense
                class="q-mb-sm"
                placeholder="Benvenuto sul Portale Volontario"
              />
              <q-input
                v-model="emailBody"
                label="Testo email"
                outlined
                dense
                type="textarea"
                autogrow
                class="q-mb-sm"
                placeholder="Ciao {nome}, il tuo account è stato creato. Accedi a {link_login}"
              />
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
            <q-btn v-close-popup flat label="Chiudi" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- Reset Password Dialog -->
      <q-dialog v-model="showResetDialog" persistent>
        <q-card style="width: 100%; max-width: 400px; min-width: unset">
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
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useQuasar } from 'quasar'
import { useAdminStore } from 'stores/admin.store'
import { useAuthStore } from 'stores/auth.store'
import { notifyError, notifySuccess } from 'src/utils/notify'

const $q = useQuasar()
const store = useAdminStore()
const authStore = useAuthStore()

const activeTab = ref('utenti')

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
  { name: 'name', label: 'Nome', align: 'left', style: 'width: 200px' },
  { name: 'email', label: 'Email', align: 'left' },
  { name: 'role', label: 'Ruolo', align: 'center', style: 'width: 130px' },
  { name: 'actions', label: 'Azioni', align: 'center', style: 'width: 220px' }
]

const progettiColumns = [
  { name: 'beneficiario', label: 'Beneficiario', align: 'left', field: row => [row.Cognome_Beneficiario, row.Nome_Beneficiario].filter(Boolean).join(' ') },
  { name: 'cognome', label: 'Cognome', align: 'left' },
  { name: 'nome', label: 'Nome', align: 'left' },
  { name: 'actions', label: '', align: 'center' }
]

const editCache = reactive({})

function getBuffer(progetto) {
  const id = progetto.id_progetto
  if (!editCache[id]) {
    editCache[id] = {
      cognome: progetto.Cognome_Beneficiario || '',
      nome: progetto.Nome_Beneficiario || '',
      origCognome: progetto.Cognome_Beneficiario || '',
      origNome: progetto.Nome_Beneficiario || ''
    }
  }
  return editCache[id]
}

function setCognome(progetto, val) {
  const buf = getBuffer(progetto)
  buf.cognome = val
}

function setNome(progetto, val) {
  const buf = getBuffer(progetto)
  buf.nome = val
}

const hasModified = computed(() =>
  store.progetti.some(p => isModified(p))
)

async function saveAll() {
  const modified = store.progetti.filter(p => isModified(p))
  for (const p of modified) {
    const ok = await store.updateProgettoBeneficiario(p.id_progetto, editCache[p.id_progetto].cognome, editCache[p.id_progetto].nome)
      const name = [p.Cognome_Beneficiario, p.Nome_Beneficiario].filter(Boolean).join(' ')
      if (!ok) {
        notifyError($q, store.error, `Errore aggiornamento ${name}`)
      return
    }
  }
  notifySuccess($q, 'Tutti i beneficiari aggiornati')
  refreshProgetti()
}

async function saveBeneficiario(progetto) {
  const buf = editCache[progetto.id_progetto]
  if (!buf) return
  const ok = await store.updateProgettoBeneficiario(progetto.id_progetto, buf.cognome, buf.nome)
  if (ok) {
    notifySuccess($q, 'Beneficiario aggiornato')
    buf.origCognome = buf.cognome
    buf.origNome = buf.nome
    await store.fetchProgetti()
  } else if (store.error) {
    notifyError($q, store.error, 'Errore aggiornamento beneficiario')
  }
}

function refreshProgetti() {
  Object.keys(editCache).forEach(k => delete editCache[k])
  store.fetchProgetti()
}

// Associazioni
const associazioni = ref([])
const assocBudgetCache = reactive({})
const savingAssoc = ref(false)
const assocColumns = [
  { name: 'nome', label: 'Associazione', field: 'Nome', align: 'left' },
  { name: 'budget', label: 'Budget (€)', align: 'left' },
  { name: 'actions', label: '', align: 'center' }
]

async function fetchAssociazioni() {
  try {
    const { associazioniService } = await import('src/services/associazioni.service')
    const res = await associazioniService.getAll()
    associazioni.value = res.data.data || []
  } catch { associazioni.value = [] }
}

function editAssocBudget(row, val) {
  assocBudgetCache[row.id] = parseFloat(val) || 0
}

async function saveAssocBudget(row) {
  const val = assocBudgetCache[row.id]
  if (val === undefined) return
  savingAssoc.value = true
  try {
    const { associazioniService } = await import('src/services/associazioni.service')
    await associazioniService.update(row.id, { Budget: val })
    notifySuccess($q, 'Budget aggiornato')
    delete assocBudgetCache[row.id]
    await fetchAssociazioni()
  } catch (err) {
    notifyError($q, err, 'Errore aggiornamento budget')
  } finally { savingAssoc.value = false }
}

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
    notifySuccess($q, 'Utente creato con successo')
    userCreated.value = true
  } else if (store.error) {
    notifyError($q, store.error, "Errore nella creazione dell'utente")
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
    notifySuccess($q, 'Email inviata con successo')
    emailSubject.value = ''
    emailBody.value = ''
  } else if (store.error) {
    notifyError($q, store.error, "Errore nell'invio dell'email")
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
  store.fetchProgetti()
  fetchAssociazioni()
})
</script>

<style scoped>
.admin-role-select {
  min-width: 140px;
}
.admin-role-min-width {
  min-width: 120px;
}
.admin-scroll-area {
  max-height: 70vh;
}
.inline-edit-input {
  min-width: 120px;
}
</style>
