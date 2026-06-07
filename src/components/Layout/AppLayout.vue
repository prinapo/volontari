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
              <q-item v-close-popup clickable @click="showChangePassword = true">
                <q-item-section>
                  <q-item-label>Cambia password</q-item-label>
                </q-item-section>
              </q-item>
              <q-item v-close-popup clickable @click="handleLogout">
                <q-item-section>
                  <q-item-label class="text-negative">
                    Esci
                  </q-item-label>
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
        <q-item-label header>
          Navigazione
        </q-item-label>
        <q-item
          v-if="authStore.hasFamiglieAccess"
          v-ripple
          clickable
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
          v-ripple
          clickable
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
          v-if="authStore.canVerifica"
          v-ripple
          clickable
          :active="$route.name === 'Riconciliazione'"
          active-class="bg-primary text-white"
          to="/riconciliazione"
        >
          <q-item-section avatar>
            <q-icon name="swap_horiz" />
          </q-item-section>
          <q-item-section>Riconciliazione</q-item-section>
        </q-item>

        <q-item
          v-if="authStore.canGestione"
          v-ripple
          clickable
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
          v-ripple
          clickable
          :active="$route.name === 'Deduplica'"
          active-class="bg-primary text-white"
          to="/deduplica"
        >
          <q-item-section avatar>
            <q-icon name="cleaning_services" />
          </q-item-section>
          <q-item-section>Duplicati</q-item-section>
        </q-item>

        <q-item-label v-if="authStore.canAdmin" header class="q-mt-md">
          Amministrazione
        </q-item-label>

        <q-item
          v-if="authStore.canAdmin"
          v-ripple
          clickable
          :active="$route.name === 'Admin'"
          active-class="bg-primary text-white"
          to="/admin"
        >
          <q-item-section avatar>
            <q-icon name="admin_panel_settings" />
          </q-item-section>
          <q-item-section>User Admin</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-dialog v-model="showChangePassword" persistent>
      <q-card style="min-width: 350px">
        <q-card-section class="row items-center">
          <div class="text-h6">
            Cambia password
          </div>
          <q-space />
          <q-btn v-close-popup icon="close" flat round dense />
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
          <q-btn v-close-popup flat label="Annulla" />
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
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth.store'
import { authService } from 'src/services/auth.service'
import { useQuasar } from 'quasar'
import { notifyError, notifySuccess } from 'src/utils/notify'

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
    notifySuccess($q, 'Password cambiata con successo')
    showChangePassword.value = false
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err) {
    notifyError($q, err, 'Errore nel cambio password')
  }
}

function showRendicontazioneNotify() {
  const check = authStore.rendicontazioneCheck
  if (!check.checked) return
  if (check.ok) {
    $q.notify({
      type: 'positive',
      message: 'Rendicontazione sincronizzata',
      timeout: 0,
      actions: [{ icon: 'close', color: 'white', round: true, dense: true }]
    })
  } else {
    const details = check.discrepancies.map(d => {
      if (d.errore) return `${d.progettoId}: errore`
      return `${d.beneficiario || d.progettoId}: stato "${d.statoDB}" → "${d.statoCalcolato}", giust ${d.countDB} → ${d.countCalcolato}, importo ${d.importoDB} → ${d.importoCalcolato}`
    }).join('\n')
    $q.notify({
      type: 'warning',
      message: `${check.discrepancies.length} discrepanze trovate:\n${details}`,
      timeout: 0,
      html: false,
      actions: [{ icon: 'close', color: 'white', round: true, dense: true }]
    })
  }
}

watch(
  () => authStore.rendicontazioneCheck.checked,
  (checked) => {
    if (checked) showRendicontazioneNotify()
  }
)

onMounted(() => {
  if (authStore.rendicontazioneCheck.checked) {
    showRendicontazioneNotify()
  }
})
</script>
