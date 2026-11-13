<template>
  <CheckSection
    :check="!!store.emailLoginCheck"
    icon="link"
    title="Email login vs primaria"
    check-label="Verifica login vs primaria"
    :loading="store.emailLoginCheckLoading"
    button-class="q-mt-sm"
    @run="runEmailLoginCheck"
  >
    <template #summary>
      {{ store.emailLoginCheck.disallineati.length }} contatti con email di login diversa dalla primaria.
    </template>

    <template v-if="store.emailLoginCheck.disallineati.length > 0">
      <q-list dense>
        <q-item v-for="v in store.emailLoginCheck.disallineati" :key="v.contattoId" dense class="q-px-none">
          <q-item-section>
            <q-item-label>{{ v.nome }} {{ v.cognome }}</q-item-label>
            <q-item-label caption>login: {{ v.loginEmail }} · primaria: {{ v.primaryEmail }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
      <q-btn
        color="primary"
        icon="auto_fix_high"
        label="Allinea alla login"
        class="q-mt-sm"
        :loading="store.emailLoginCheckLoading"
        @click="correggiEmailLogin"
      />
    </template>

    <CheckOkState v-else />
  </CheckSection>
</template>

<script setup>
import { useQuasar } from 'quasar'
import CheckOkState from 'src/components/Admin/Check/CheckOkState.vue'
import CheckSection from 'src/components/Admin/Check/CheckSection.vue'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { useAdminStore } from 'stores/admin.store'

const $q = useQuasar()
const store = useAdminStore()

async function runEmailLoginCheck() {
  await store.fetchEmailLoginConsistency()
  if (store.error) {
    notifyError($q, store.error, 'Errore verifica login vs primaria')
  } else {
    notifySuccess($q, 'Verifica login vs primaria completata')
  }
}

async function correggiEmailLogin() {
  try {
    const result = await store.correggiEmailLogin()
    notifySuccess($q, `Contatti allineati: ${result.contattiCorretti}`)
  } catch {
    notifyError($q, store.error || 'Errore nella correzione login vs primaria')
  }
}
</script>
