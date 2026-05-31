<template>
  <q-layout view="hHh Lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn
          v-if="authStore.isAuthenticated"
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="drawerOpen = !drawerOpen"
        />

        <q-toolbar-title>
          Portale Volontario
        </q-toolbar-title>

        <template v-if="authStore.isAuthenticated">
          <q-btn-dropdown flat :label="authStore.userName">
            <q-list>
              <q-item clickable v-close-popup @click="showChangePassword = true">
                <q-item-section>
                  <q-item-label>Cambia password</q-item-label>
                </q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="handleLogout">
                <q-item-section>
                  <q-item-label class="text-negative">Esci</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </template>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-if="authStore.isAuthenticated"
      v-model="drawerOpen"
      show-if-above
      bordered
      :width="240"
      class="bg-white"
    >
      <q-list padding>
        <q-item-label header>Navigazione</q-item-label>
        <q-item
          v-if="authStore.hasFamiglieAccess"
          clickable
          v-ripple
          :active="$route.name === 'Famiglie'"
          active-class="bg-primary text-white"
          to="/famiglie"
        >
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>
          <q-item-section>Famiglie</q-item-section>
        </q-item>

        <q-item
          v-if="authStore.canVerifica"
          clickable
          v-ripple
          :active="$route.name === 'Verifica'"
          active-class="bg-primary text-white"
          to="/verifica"
        >
          <q-item-section avatar>
            <q-icon name="fact_check" />
          </q-item-section>
          <q-item-section>Verifica</q-item-section>
        </q-item>

        <q-item
          v-if="authStore.canGestione"
          clickable
          v-ripple
          :active="$route.name === 'Gestione'"
          active-class="bg-primary text-white"
          to="/gestione"
        >
          <q-item-section avatar>
            <q-icon name="manage_accounts" />
          </q-item-section>
          <q-item-section>Gestione</q-item-section>
        </q-item>

        <q-item
          v-if="authStore.canAdmin"
          clickable
          v-ripple
          :active="$route.name === 'Deduplica'"
          active-class="bg-primary text-white"
          to="/deduplica"
        >
          <q-item-section avatar>
            <q-icon name="cleaning_services" />
          </q-item-section>
          <q-item-section>Duplicati</q-item-section>
        </q-item>

        <q-item-label v-if="authStore.canAdmin" header class="q-mt-md">Amministrazione</q-item-label>

        <q-item
          v-if="authStore.canAdmin"
          clickable
          v-ripple
          :active="$route.name === 'Admin'"
          active-class="bg-primary text-white"
          to="/admin"
        >
          <q-item-section avatar>
            <q-icon name="admin_panel_settings" />
          </q-item-section>
          <q-item-section>Ruoli e Policy</q-item-section>
        </q-item>

      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-dialog v-model="showChangePassword" persistent>
      <q-card style="min-width: 350px">
        <q-card-section class="row items-center">
          <div class="text-h6">Cambia password</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="newPassword"
            type="password"
            label="Nuova password"
            :rules="[val => !!val || 'Campo obbligatorio']"
            lazy-rules
          />
          <q-input
            v-model="confirmPassword"
            type="password"
            label="Conferma password"
            :rules="[
              val => !!val || 'Campo obbligatorio',
              val => val === newPassword || 'Le password non coincidono'
            ]"
            lazy-rules
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annulla" v-close-popup />
          <q-btn
            color="primary"
            label="Salva"
            :disable="!newPassword || newPassword !== confirmPassword"
            @click="handleChangePassword"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth.store'
import { authService } from 'src/services/auth.service'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()

const drawerOpen = ref(false)
const showChangePassword = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

async function handleChangePassword() {
  try {
    await authService.changePassword(newPassword.value)
    $q.notify({ type: 'positive', message: 'Password cambiata con successo' })
    showChangePassword.value = false
    newPassword.value = ''
    confirmPassword.value = ''
  } catch {
    $q.notify({ type: 'negative', message: 'Errore nel cambio password' })
  }
}
</script>
