<template>
  <q-page class="q-pa-md admin-page">
    <div v-if="!authStore.initialized" class="text-center q-mt-xl">
      <q-spinner size="lg" />
      <div class="q-mt-sm">Caricamento...</div>
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
            <q-badge v-if="errorLogStore.unreadCount > 0" color="negative" floating>{{
              errorLogStore.unreadCount
            }}</q-badge>
          </q-tab>
          <q-tab name="check" icon="fact_check" label="Check" />
        </q-tabs>
      </div>

      <q-tab-panels v-model="activeTab" animated>
        <q-tab-panel name="utenti"><AdminUtentiTab /></q-tab-panel>
        <q-tab-panel name="associazioni"><AdminAssociazioniTab /></q-tab-panel>
        <q-tab-panel name="errori"><AdminErroriTab /></q-tab-panel>
        <q-tab-panel name="check"><AdminConsistencyTab /></q-tab-panel>
      </q-tab-panels>
    </template>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import AdminAssociazioniTab from 'components/Admin/AdminAssociazioniTab.vue'
import AdminConsistencyTab from 'components/Admin/AdminConsistencyTab.vue'
import AdminErroriTab from 'components/Admin/AdminErroriTab.vue'
import AdminUtentiTab from 'components/Admin/AdminUtentiTab.vue'
import { useAuthStore } from 'stores/auth.store'
import { useErrorLogStore } from 'stores/error-log.store'

const authStore = useAuthStore()
const errorLogStore = useErrorLogStore()
const activeTab = ref('utenti')
</script>
