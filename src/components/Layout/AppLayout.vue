<template>
  <q-layout view="hHh Lpr lFf">
    <q-header :class="isDev ? 'bg-orange-9 text-white' : 'bg-primary text-white'">
      <q-toolbar>
        <q-btn
          v-if="authStore.isAuthenticated"
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="drawerOpen = !drawerOpen"
        >
          <q-tooltip>Menu</q-tooltip>
        </q-btn>

        <q-toolbar-title>
          Portale Volontario
          <q-badge v-if="isDev" color="orange-9" class="q-ml-sm" label="DEV" />
        </q-toolbar-title>

        <template v-if="authStore.isAuthenticated">
          <q-btn-dropdown flat :label="authStore.userName">
            <q-list>
              <q-item v-close-popup clickable to="/impostazioni">
                <q-item-section>
                  <q-item-label>Impostazioni</q-item-label>
                </q-item-section>
              </q-item>
              <q-item v-close-popup clickable @click="handleLogout">
                <q-item-section>
                  <q-item-label class="text-negative"> Esci </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </template>
      </q-toolbar>
    </q-header>

    <q-drawer v-if="authStore.isAuthenticated" v-model="drawerOpen" show-if-above :width="240">
      <q-list padding>
        <q-item-label header> Navigazione </q-item-label>
        <q-item
          v-if="authStore.hasFamiglieAccess"
          v-ripple
          clickable
          :active="$route.name === 'Famiglie'"
          active-class="text-white"
          to="/famiglie"
        >
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>
          <q-item-section>Famiglie</q-item-section>
        </q-item>

        <q-item
          v-if="authStore.canManager"
          v-ripple
          clickable
          :active="$route.name === 'Verifica'"
          active-class="text-white"
          to="/verifica"
        >
          <q-item-section avatar>
            <q-icon name="fact_check" />
          </q-item-section>
          <q-item-section>Verifica</q-item-section>
        </q-item>

        <q-item
          v-if="authStore.canManager"
          v-ripple
          clickable
          :active="$route.name === 'Pagamenti'"
          active-class="text-white"
          to="/pagamenti"
        >
          <q-item-section avatar>
            <q-icon name="payments" />
          </q-item-section>
          <q-item-section>Pagamenti</q-item-section>
        </q-item>

        <q-item
          v-if="authStore.canManager"
          v-ripple
          clickable
          :active="$route.name === 'Riconciliazione'"
          active-class="text-white"
          to="/riconciliazione"
        >
          <q-item-section avatar>
            <q-icon name="swap_horiz" />
          </q-item-section>
          <q-item-section>Riconciliazione</q-item-section>
        </q-item>

        <q-item
          v-if="authStore.canManager"
          v-ripple
          clickable
          :active="$route.name === 'Gestione'"
          active-class="text-white"
          to="/gestione"
        >
          <q-item-section avatar>
            <q-icon name="manage_accounts" />
          </q-item-section>
          <q-item-section>Gestione</q-item-section>
        </q-item>

        <q-item v-ripple clickable :active="$route.name === 'Impostazioni'" active-class="text-white" to="/impostazioni">
          <q-item-section avatar>
            <q-icon name="settings" />
          </q-item-section>
          <q-item-section>Impostazioni</q-item-section>
        </q-item>

        <q-item-label v-if="authStore.canAdmin" header class="q-mt-md"> Amministrazione </q-item-label>

        <q-item
          v-if="authStore.canAdmin"
          v-ripple
          clickable
          :active="$route.name === 'Admin'"
          active-class="text-white"
          to="/admin"
        >
          <q-item-section avatar>
            <q-icon name="admin_panel_settings" />
          </q-item-section>
          <q-item-section>Admin</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-banner v-if="authStore.isImpersonating" class="bg-purple-8 text-white text-center q-py-sm" rounded>
      <template #avatar>
        <q-icon name="theater_comedy" />
      </template>
      Stai visualizzando come <strong>{{ authStore.userName || 'utente impersonato' }}</strong>
      <template #action>
        <q-btn flat dense color="white" label="Torna a Admin" @click="stopImpersonation" />
      </template>
    </q-banner>

    <q-page-container>
      <router-view />
    </q-page-container>

  </q-layout>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from 'stores/admin.store'
import { useAuthStore } from 'stores/auth.store'

const isDev = import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'test'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()

const drawerOpen = ref(false)

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

function stopImpersonation() {
  const adminStore = useAdminStore()
  adminStore.stopImpersonation()
}
</script>
