<template>
  <div>
    <q-inner-loading :showing="loadingVerifica">
      <q-spinner size="40px" color="primary" />
      <div class="q-mt-sm text-body2 text-grey-7">Caricamento progetti...</div>
    </q-inner-loading>
    <div class="row items-center q-gutter-sm q-mb-md">
      <q-tabs
        v-model="subTab"
        dense
        class="text-grey scroll"
        active-color="primary"
        indicator-color="primary"
        narrow-indicator
      >
        <q-tab name="proposti" label="Bonifici da fare" />
        <q-tab name="incorso" label="Da riscontrare" />
        <q-tab name="falliti" label="Falliti" />
        <q-tab v-if="authStore.canAdmin" name="annullati" label="Annullati" />
        <q-tab name="liste" label="Liste esportazione" />
      </q-tabs>
      <q-space />
    </div>

    <!-- Sotto-vista: Proposti -->
    <PagamentiProposti v-if="subTab === 'proposti'" @ricalcola="ricalcolaProposte" />

    <!-- Sotto-vista: In corso / Da riscontrare -->
    <PagamentiInCorso v-if="subTab === 'incorso'" />

    <!-- Sotto-vista: Falliti -->
    <PagamentiFalliti v-if="subTab === 'falliti'" />

    <!-- Sotto-vista: Annullati -->
    <PagamentiAnnullati v-if="subTab === 'annullati' && authStore.canAdmin" />

    <!-- Sotto-vista: Liste esportazione -->
    <PagamentiListe v-if="subTab === 'liste'" />
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, onMounted } from 'vue'
import PagamentiAnnullati from 'src/components/Verifica/pagamenti/PagamentiAnnullati.vue'
import PagamentiFalliti from 'src/components/Verifica/pagamenti/PagamentiFalliti.vue'
import PagamentiInCorso from 'src/components/Verifica/pagamenti/PagamentiInCorso.vue'
import PagamentiListe from 'src/components/Verifica/pagamenti/PagamentiListe.vue'
import PagamentiProposti from 'src/components/Verifica/pagamenti/PagamentiProposti.vue'
import { notifyError } from 'src/utils/notify'
import { useAuthStore } from 'stores/auth.store'
import { usePagamentiStore } from 'stores/pagamenti.store'
import { useVerificaStore } from 'stores/verifica.store'

const $q = useQuasar()
const store = usePagamentiStore()
const authStore = useAuthStore()
const verificaStore = useVerificaStore()

const subTab = ref('proposti')
const loadingVerifica = ref(false)

async function ricalcolaProposte() {
  if (verificaStore.rows.length === 0) {
    loadingVerifica.value = true
    try {
      await verificaStore.fetchAllPages()
    } catch (error) {
      notifyError($q, error, 'Errore caricamento progetti')
      return
    } finally {
      loadingVerifica.value = false
    }
  }
  if (verificaStore.rows.length > 0) {
    const res = await store.ricalcolaPropostiDaProgetti(verificaStore.rows)
    if (store.error) notifyError($q, store.error, 'Errore ricalcolo')
    else if (res?.failed?.length) notifyError($q, null, `${res.failed.length} progetti non ricalcolati`)
    await store.fetchProposti()
  }
}

onMounted(async () => {
  await store.init()
  loadingVerifica.value = true
  try {
    if (verificaStore.rows.length === 0) {
      await verificaStore.fetchAllPages()
    }
    if (verificaStore.rows.length > 0) {
      await store.ricalcolaPropostiDaProgetti(verificaStore.rows)
    }
  } catch (error) {
    notifyError($q, error, 'Errore caricamento progetti')
  } finally {
    loadingVerifica.value = false
  }
})
</script>
