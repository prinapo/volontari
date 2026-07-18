<template>
  <q-page class="q-pa-md">
    <div v-if="!authStore.initialized" class="text-center q-mt-xl">
      <q-spinner size="lg" />
      <div class="q-mt-sm">Caricamento...</div>
    </div>

    <q-inner-loading :showing="store.loading && authStore.initialized" />

    <template v-if="authStore.initialized">
      <q-tabs v-model="tab" class="q-mb-md" align="left">
        <q-tab name="famiglie" label="Famiglie" :badge="store.famiglie.length" />
        <q-tab name="contatti" label="Contatti" />
      </q-tabs>

      <q-separator class="q-mb-md" />

      <q-tab-panels v-model="tab" animated>
        <q-tab-panel name="famiglie">
          <FamiglieTab />
        </q-tab-panel>
        <q-tab-panel name="contatti">
          <ContattiTab />
        </q-tab-panel>
      </q-tab-panels>
    </template>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ContattiTab from 'components/Gestione/ContattiTab.vue'
import FamiglieTab from 'components/Gestione/FamiglieTab.vue'
import { useAuthStore } from 'stores/auth.store'
import { useGestioneStore } from 'stores/gestione.store'

const authStore = useAuthStore()
const store = useGestioneStore()

const tab = ref('famiglie')

onMounted(() => {
  store.fetchAll()
})
</script>
