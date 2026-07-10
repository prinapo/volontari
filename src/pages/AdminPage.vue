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
          <q-tab name="associazioni" icon="business" label="Associazioni" />
          <q-tab name="errori" icon="bug_report" label="Errori">
            <q-badge v-if="errorLogStore.unreadCount > 0" color="negative" floating>
              {{ errorLogStore.unreadCount }}
            </q-badge>
          </q-tab>
          <q-tab name="email" icon="email" label="Email" />
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

          <q-banner v-if="volontariSenzaUtente.length > 0" class="bg-warning text-dark q-mb-md" rounded>
            <template #avatar>
              <q-icon name="warning" />
            </template>
            <div class="text-weight-medium q-mb-xs">Volontari senza account Directus</div>
            <div class="text-body2 q-mb-sm">
              I seguenti contatti hanno IsVolontario=true ma non hanno un utente Directus collegato.
            </div>
            <q-list dense>
              <q-item v-for="v in volontariSenzaUtente" :key="v.id_contatto" dense class="q-px-none">
                <q-item-section>
                  <q-item-label>{{ v.Nome }} {{ v.Cognome }}</q-item-label>
                  <q-item-label caption>
                    {{ v.email?.find(e => e.Primary)?.email_address || v.email?.[0]?.email_address || 'Nessuna email' }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    flat
dense
icon="person_add"
color="primary"
size="sm"
                    :loading="savingVolontario"
                    aria-label="Crea account"
                    @click="creaUtenteVolontario(v)"
                  >
                    <q-tooltip>Crea account Directus</q-tooltip>
                  </q-btn>
                </q-item-section>
              </q-item>
            </q-list>
          </q-banner>

          <!-- Verifica consistenza Volontari -->
          <q-banner v-if="store.volontariCheck" class="bg-grey-2 text-dark q-mb-md rounded-borders" rounded>
            <template #avatar>
              <q-icon name="fact_check" color="primary" />
            </template>
            <div class="text-weight-medium q-mb-xs">Verifica consistenza Volontari</div>
            <div class="text-body2 q-mb-sm text-grey-7">
              Risultati: {{ store.volontariCheck.senzaUtente.length }} senza utente,
              {{ store.volontariCheck.utenteCancellato.length }} con utente cancellato,
              {{ store.volontariCheck.flagOrfano.length }} flag orfani,
              {{ store.volontariCheck.linkSenzaFlag.length }} link senza flag,
              {{ store.volontariCheck.senzaRuolo.length }} senza ruolo.
            </div>

            <template v-if="store.volontariCheck.senzaUtente.length > 0">
              <q-separator class="q-mb-sm" />
              <div class="text-caption text-weight-medium q-mb-xs">Senza utente Directus</div>
              <q-list dense>
                <q-item v-for="c in store.volontariCheck.senzaUtente" :key="c.id_contatto" dense class="q-px-none">
                  <q-item-section><q-item-label>{{ c.Nome }} {{ c.Cognome }}</q-item-label></q-item-section>
                  <q-item-section side>
                    <q-btn
flat
dense
icon="person_add"
color="primary"
size="sm"
@click="creaUtenteVolontario(c)">
                      <q-tooltip>Crea account Directus</q-tooltip>
                    </q-btn>
                  </q-item-section>
                </q-item>
              </q-list>
            </template>

            <template v-if="store.volontariCheck.utenteCancellato.length > 0">
              <q-separator class="q-mb-sm" />
              <div class="text-caption text-weight-medium q-mb-xs">Utente Directus cancellato</div>
              <q-list dense>
                <q-item v-for="c in store.volontariCheck.utenteCancellato" :key="c.id_contatto" dense class="q-px-none">
                  <q-item-section><q-item-label>{{ c.Nome }} {{ c.Cognome }}</q-item-label></q-item-section>
                  <q-item-section side class="q-gutter-xs">
                    <q-btn
flat
dense
icon="clear"
color="negative"
size="sm"
@click="clearUserRef(c)">
                      <q-tooltip>Rimuovi user_id rotto</q-tooltip>
                    </q-btn>
                    <q-btn
flat
dense
icon="person_add"
color="primary"
size="sm"
@click="creaUtenteVolontario(c)">
                      <q-tooltip>Crea nuovo account</q-tooltip>
                    </q-btn>
                  </q-item-section>
                </q-item>
              </q-list>
            </template>

            <template v-if="store.volontariCheck.flagOrfano.length > 0">
              <q-separator class="q-mb-sm" />
              <div class="text-caption text-weight-medium q-mb-xs">Flag IsVolontario orfano (nessun link famiglia attivo)</div>
              <q-list dense>
                <q-item v-for="c in store.volontariCheck.flagOrfano" :key="c.id_contatto" dense class="q-px-none">
                  <q-item-section><q-item-label>{{ c.Nome }} {{ c.Cognome }}</q-item-label></q-item-section>
                  <q-item-section side>
                    <q-btn
flat
dense
icon="flag_off"
color="warning"
size="sm"
@click="clearIsVolontario(c)">
                      <q-tooltip>Resetta IsVolontario</q-tooltip>
                    </q-btn>
                  </q-item-section>
                </q-item>
              </q-list>
            </template>

            <template v-if="store.volontariCheck.linkSenzaFlag.length > 0">
              <q-separator class="q-mb-sm" />
              <div class="text-caption text-weight-medium q-mb-xs">Link Volontario attivo ma IsVolontario mancante</div>
              <q-list dense>
                <q-item v-for="c in store.volontariCheck.linkSenzaFlag" :key="c.id_contatto" dense class="q-px-none">
                  <q-item-section><q-item-label>{{ c.Nome }} {{ c.Cognome }}</q-item-label></q-item-section>
                  <q-item-section side>
                    <q-btn
flat
dense
icon="check_circle"
color="positive"
size="sm"
@click="setVolontarioFlag(c)">
                      <q-tooltip>Imposta IsVolontario</q-tooltip>
                    </q-btn>
                  </q-item-section>
                </q-item>
              </q-list>
            </template>

            <template v-if="store.volontariCheck.senzaRuolo.length > 0">
              <q-separator class="q-mb-sm" />
              <div class="text-caption text-weight-medium q-mb-xs">Utente Directus senza ruolo</div>
              <q-list dense>
                <q-item v-for="c in store.volontariCheck.senzaRuolo" :key="c.id_contatto" dense class="q-px-none">
                  <q-item-section>
                    <q-item-label>{{ c.Nome }} {{ c.Cognome }}</q-item-label>
                    <q-item-label caption>{{ c.email }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn
                      flat
                      dense
                      icon="badge"
                      color="primary"
                      size="sm"
                      :loading="savingVolontario"
                      @click="assignVolontarioRole(c)"
                    >
                      <q-tooltip>Assegna ruolo Volontario</q-tooltip>
                    </q-btn>
                  </q-item-section>
                </q-item>
              </q-list>
            </template>

            <template #action>
              <q-btn flat dense icon="refresh" :loading="store.volontariCheckLoading" @click="runConsistencyCheck">
                <q-tooltip>Riesegui verifica</q-tooltip>
              </q-btn>
            </template>
          </q-banner>

          <q-btn
            v-else
            flat
            dense
            icon="fact_check"
            color="primary"
            size="sm"
            class="q-mb-md"
            :loading="store.volontariCheckLoading"
            @click="runConsistencyCheck"
          >
            Verifica consistenza Volontari
          </q-btn>

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
            <q-btn color="primary" icon="add" label="Nuova associazione" @click="openNewAssociazioneDialog" />
            <q-btn flat round icon="refresh" aria-label="Aggiorna" @click="fetchAssociazioni">
              <q-tooltip>Aggiorna</q-tooltip>
            </q-btn>
          </div>

          <q-table
            :rows="associazioni"
            :columns="assocColumns"
            row-key="id"
            flat
bordered
            hide-pagination
            :pagination="{ rowsPerPage: 0 }"
          >
            <template #body-cell-budget="props">
              <q-td :props="props">
                <q-input
                  :model-value="assocBudgetCache[props.row.id] !== undefined ? assocBudgetCache[props.row.id] : props.row.Budget"
                  outlined
dense
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
                  icon="save"
color="positive"
round
flat
size="sm"
                  :loading="savingAssoc"
                  @click="saveAssocBudget(props.row)"
                >
                  <q-tooltip>Salva</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <q-tab-panel name="errori">
          <div class="row items-center q-gutter-sm q-mb-md">
            <div>
              <div class="text-h5 text-weight-medium">
                Errori
              </div>
              <div class="text-body2 text-grey-7">
                Errori API registrati dalle richieste del frontend.
              </div>
            </div>
            <q-space />
            <q-btn
flat
round
icon="refresh"
aria-label="Aggiorna"
:loading="errorLogStore.loading"
@click="errorLogStore.fetchAll">
              <q-tooltip>Aggiorna</q-tooltip>
            </q-btn>
          </div>

          <q-table
            :rows="errorLogStore.items"
            :columns="erroriColumns"
            row-key="id"
            flat
bordered
            hide-pagination
            :pagination="{ rowsPerPage: 0 }"
            :loading="errorLogStore.loading"
            :grid="$q.screen.lt.sm"
          >
            <template #body-cell-level="props">
              <q-td :props="props">
                <q-badge :color="props.value === 'error' ? 'negative' : props.value === 'warning' ? 'warning' : 'grey'">
                  {{ props.value }}
                </q-badge>
              </q-td>
            </template>
            <template #body-cell-message="props">
              <q-td :props="props">
                <div class="ellipsis cursor-pointer text-primary" style="max-width: 300px" @click="showErrorDetail(props.value)">
                  {{ props.value || '' }}
                </div>
              </q-td>
            </template>
            <template #body-cell-read="props">
              <q-td :props="props">
                <q-btn
                  v-if="!props.value"
                  flat
 dense
 icon="mark_email_read"
size="sm"
                  color="grey"
                  aria-label="Segna come letto"
                  @click="errorLogStore.markAsRead(props.row.id)"
                >
                  <q-tooltip>Segna come letto</q-tooltip>
                </q-btn>
                <q-icon v-else name="check" color="positive" size="sm" />
              </q-td>
            </template>
            <template #body-cell-actions="props">
              <q-td :props="props">
                <q-btn
 flat
dense
icon="delete"
color="negative"
size="sm"
aria-label="Elimina"
@click="errorLogStore.delete(props.row.id)">
                  <q-tooltip>Elimina</q-tooltip>
                </q-btn>
              </q-td>
            </template>
            <template #item="props">
              <div class="q-pa-xs col-12">
                <q-card flat bordered>
                  <q-card-section>
                    <div class="row items-center q-gutter-x-sm">
                      <q-badge :color="props.row.level === 'error' ? 'negative' : 'warning'">{{ props.row.level }}</q-badge>
                      <span class="text-caption text-grey-7">{{ props.row.timestamp }}</span>
                      <q-space />
                      <q-btn
v-if="!props.row.read"
flat
dense
icon="mark_email_read"
size="sm"
@click="errorLogStore.markAsRead(props.row.id)"><q-tooltip>Segna letto</q-tooltip></q-btn>
                    </div>
                    <div class="text-caption q-mt-xs">{{ props.row.method }} {{ props.row.status }}</div>
                    <div class="text-body2 q-mt-xs">{{ props.row.message }}</div>
                    <div v-if="props.row.responseBody" class="text-caption bg-grey-1 q-pa-xs q-mt-xs rounded-borders" style="max-height: 100px; overflow: auto; white-space: pre-wrap; font-family: monospace; font-size: 11px;">
                      {{ props.row.responseBody }}
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </template>
          </q-table>
        </q-tab-panel>

        <q-tab-panel name="email">
          <EmailCleanupTab />
        </q-tab-panel>

      </q-tab-panels>
      <!-- Nuova Associazione Dialog -->
      <q-dialog v-model="showNewAssociazioneDialog" persistent>
        <q-card style="width: 100%; max-width: 400px; min-width: unset">
          <q-card-section class="row items-center">
            <div class="text-h6">Nuova associazione</div>
            <q-space />
            <q-btn v-close-popup icon="close" flat round dense />
          </q-card-section>
          <q-card-section>
            <q-input v-model="newAssociazioneNome" label="Nome *" outlined dense class="q-mb-md" />
            <q-input
              v-model="newAssociazioneBudget"
              label="Budget (€)"
              outlined
              dense
              type="number"
              min="0"
              step="0.01"
            />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn v-close-popup flat label="Annulla" />
            <q-btn
              color="primary"
              label="Crea"
              :disable="!newAssociazioneNome"
              :loading="savingAssociazione"
              @click="createAssociazione"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
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

      <!-- Error detail dialog -->
      <q-dialog v-model="errorDetail.visible">
        <q-card style="width: 100%; max-width: 600px; min-width: unset">
          <q-card-section class="row items-center">
            <div class="text-h6">
              Dettaglio errore
            </div>
            <q-space />
            <q-btn v-close-popup icon="close" flat round dense />
          </q-card-section>
          <q-card-section class="q-pt-none text-body2" style="white-space: pre-wrap; word-break: break-word;">
            {{ errorDetail.text }}
          </q-card-section>
          <q-card-actions align="right">
            <q-btn v-close-popup flat label="Chiudi" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </template>
  </q-page>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, computed, onMounted, reactive } from 'vue'
import EmailCleanupTab from 'components/Admin/EmailCleanupTab.vue'
import { contattiService } from 'src/services/contatti.service'
import { usersService } from 'src/services/users.service'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { useAdminStore } from 'stores/admin.store'
import { useAuthStore } from 'stores/auth.store'
import { useErrorLogStore } from 'stores/error-log.store'




const $q = useQuasar()
const errorDetail = ref({ visible: false, text: '' })
function showErrorDetail(text) {
  errorDetail.value = { visible: true, text: text || '' }
}
const store = useAdminStore()
const authStore = useAuthStore()
const errorLogStore = useErrorLogStore()

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

const erroriColumns = [
  { name: 'timestamp', label: 'Data', field: 'timestamp', align: 'left', style: 'width: 160px' },
  { name: 'level', label: 'Livello', field: 'level', align: 'center', style: 'width: 80px' },
  { name: 'method', label: 'Metodo', field: 'method', align: 'center', style: 'width: 80px' },
  { name: 'status', label: 'Status', field: 'status', align: 'center', style: 'width: 70px' },
  { name: 'message', label: 'Messaggio', field: 'message', align: 'left' },
  { name: 'read', label: 'Letto', field: 'read', align: 'center', style: 'width: 70px' },
  { name: 'actions', label: '', align: 'center', style: 'width: 50px' }
]

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
  assocBudgetCache[row.id] = Number.parseFloat(val) || 0
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
  } catch (error) {
    notifyError($q, error, 'Errore aggiornamento budget')
  } finally { savingAssoc.value = false }
}

const showNewAssociazioneDialog = ref(false)
const newAssociazioneNome = ref('')
const newAssociazioneBudget = ref(0)
const savingAssociazione = ref(false)

function openNewAssociazioneDialog() {
  newAssociazioneNome.value = ''
  newAssociazioneBudget.value = 0
  showNewAssociazioneDialog.value = true
}

async function createAssociazione() {
  if (!newAssociazioneNome.value) return
  savingAssociazione.value = true
  try {
    const { associazioniService } = await import('src/services/associazioni.service')
    const data = { Nome: newAssociazioneNome.value }
    if (newAssociazioneBudget.value > 0) {
      data.Budget = newAssociazioneBudget.value
    }
    await associazioniService.create(data)
    notifySuccess($q, 'Associazione creata')
    showNewAssociazioneDialog.value = false
    await fetchAssociazioni()
  } catch (error) {
    notifyError($q, error, "Errore creazione associazione")
  } finally { savingAssociazione.value = false }
}

// Volontari senza account Directus
const volontariSenzaUtente = ref([])
const savingVolontario = ref(false)

async function fetchVolontariSenzaUtente() {
  try {
    const res = await contattiService.getVolontariSenzaUtente()
    volontariSenzaUtente.value = res.data.data || []
  } catch {
    volontariSenzaUtente.value = []
  }
}

async function creaUtenteVolontario(v) {
  savingVolontario.value = true
  try {
    const rolesRes = await usersService.getRoleByName('Volontario')
    const ruoloId = rolesRes.data.data?.[0]?.id
    let email = Array.isArray(v.email)
      ? (v.email.find(e => e.Primary)?.email_address || v.email[0]?.email_address || '')
      : (v.email || '')
    if (!email) { notifyError($q, null, 'Email mancante'); return }

    const userRes = await usersService.searchByEmail(email)
    const existing = (userRes.data.data || [])[0]
    if (existing) {
      await contattiService.update(v.id_contatto, { user_id: existing.id })
      if (!existing.role && ruoloId) {
        await usersService.update(existing.id, { role: ruoloId })
      }
    } else {
      const newUserRes = await usersService.create({
        email,
        password: 'Temp_' + Math.random().toString(36).slice(2, 10) + '_2026!',
        first_name: v.Nome || '',
        last_name: v.Cognome || '',
        role: ruoloId
      })
      if (newUserRes.data.data?.id) {
        await contattiService.update(v.id_contatto, { user_id: newUserRes.data.data.id })
      }
    }
    notifySuccess($q, 'Account creato per ' + (v.Nome || '') + ' ' + (v.Cognome || ''))
    await fetchVolontariSenzaUtente()
  } catch (error) {
    notifyError($q, error, 'Errore creazione account')
  } finally {
    savingVolontario.value = false
  }
}

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
    .replaceAll('{nome}', nome)
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

// Verifica consistenza Volontari
async function runConsistencyCheck() {
  await store.fetchVolontariConsistency()
  if (store.volontariCheck) {
    notifySuccess($q, 'Verifica completata')
  }
}

async function clearUserRef(c) {
  const ok = await store.clearUserReference(c.id_contatto, c.user_id)
  if (ok) {
    notifySuccess($q, `${c.Nome} ${c.Cognome}: user_id rimosso`)
    await runConsistencyCheck()
  } else {
    notifyError($q, store.error, "Errore nella rimozione user_id")
  }
}

async function clearIsVolontario(c) {
  const ok = await store.clearIsVolontarioFlag(c.id_contatto)
  if (ok) {
    notifySuccess($q, `${c.Nome} ${c.Cognome}: IsVolontario resettato`)
    await runConsistencyCheck()
  } else {
    notifyError($q, store.error, "Errore nel reset IsVolontario")
  }
}

async function setVolontarioFlag(c) {
  const ok = await store.setVolontarioFlag(c.id_contatto)
  if (ok) {
    notifySuccess($q, `${c.Nome} ${c.Cognome}: IsVolontario impostato`)
    await runConsistencyCheck()
  } else {
    notifyError($q, store.error, "Errore nell'impostazione IsVolontario")
  }
}

async function assignVolontarioRole(c) {
  const ok = await store.assignVolontarioRole(c.user_id)
  if (ok) {
    notifySuccess($q, `${c.Nome} ${c.Cognome}: ruolo Volontario assegnato`)
    await runConsistencyCheck()
  } else {
    notifyError($q, store.error, 'Errore assegnazione ruolo')
  }
}

onMounted(() => {
  store.fetchAll()
  fetchAssociazioni()
  errorLogStore.fetchAll()
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
