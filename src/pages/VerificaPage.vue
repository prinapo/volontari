<template>
  <q-page class="q-pa-md verifica-page">
      <q-tabs v-model="verificaTab" class="q-mb-md">
        <q-tab name="rendicontazione" label="Rendicontazione" />
        <q-tab v-if="authStore.canManager" name="pagamenti" label="Pagamenti" />
      </q-tabs>

      <q-tab-panels v-model="verificaTab">
        <q-tab-panel name="rendicontazione">
          <RendicontazioneTab />
        </q-tab-panel>
        <q-tab-panel v-if="authStore.canManager" name="pagamenti">
          <PagamentiTab />
        </q-tab-panel>
      </q-tab-panels>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import PagamentiTab from 'components/Verifica/PagamentiTab.vue'
import RendicontazioneTab from 'components/Verifica/RendicontazioneTab.vue'
import { useAuthStore } from 'stores/auth.store'

const authStore = useAuthStore()
const verificaTab = ref('rendicontazione')
</script>
