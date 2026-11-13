<template>
  <CheckSection
    :check="!!store.emailPrimarieCheck"
    icon="mark_email_read"
    title="Email primarie"
    check-label="Verifica email primarie"
    :loading="store.emailPrimarieCheckLoading"
    button-class="q-mt-sm"
    @run="runEmailPrimarieCheck"
  >
    <template #summary>
      {{ store.emailPrimarieCheck.duplicati.length }} contatti con più primarie,
      {{ store.emailPrimarieCheck.senzaPrimaria.length }} senza primaria.
    </template>

    <template v-if="anomalie > 0">
      <q-list dense>
        <q-item v-for="v in store.emailPrimarieCheck.duplicati" :key="v.contattoId" dense class="q-px-none">
          <q-item-section>
            <q-item-label>{{ v.nome }} {{ v.cognome }}</q-item-label>
            <q-item-label caption>{{ v.extraIds.length + 1 }} email primarie</q-item-label>
          </q-item-section>
        </q-item>
        <q-item v-for="v in store.emailPrimarieCheck.senzaPrimaria" :key="'n-' + v.contattoId" dense class="q-px-none">
          <q-item-section>
            <q-item-label>{{ v.nome }} {{ v.cognome }}</q-item-label>
            <q-item-label caption>Nessuna email primaria</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
      <q-btn
        color="primary"
        icon="auto_fix_high"
        label="Correggi tutte"
        class="q-mt-sm"
        :loading="store.emailPrimarieCheckLoading"
        @click="correggiEmailPrimarie"
      />
    </template>

    <CheckOkState v-else />
  </CheckSection>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { computed } from 'vue'
import CheckOkState from 'src/components/Admin/Check/CheckOkState.vue'
import CheckSection from 'src/components/Admin/Check/CheckSection.vue'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { useAdminStore } from 'stores/admin.store'

const $q = useQuasar()
const store = useAdminStore()

const anomalie = computed(() => {
  if (!store.emailPrimarieCheck) return -1
  return store.emailPrimarieCheck.duplicati.length + store.emailPrimarieCheck.senzaPrimaria.length
})

async function runEmailPrimarieCheck() {
  await store.fetchEmailPrimarieConsistency()
  if (store.error) {
    notifyError($q, store.error, 'Errore verifica email primarie')
  } else {
    notifySuccess($q, 'Verifica email primarie completata')
  }
}

async function correggiEmailPrimarie() {
  try {
    const result = await store.correggiEmailPrimarie()
    notifySuccess($q, `Contatti corretti: ${result.contattiCorretti}`)
  } catch {
    notifyError($q, store.error || 'Errore nella correzione email primarie')
  }
}
</script>
