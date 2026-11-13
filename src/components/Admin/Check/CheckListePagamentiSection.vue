<template>
  <CheckSection
    :check="!!store.listeCheck"
    icon="receipt_long"
    title="Liste pagamenti"
    check-label="Verifica liste pagamenti"
    :loading="store.listeCheckLoading"
    button-class="q-mt-sm"
    @run="runListeCheck"
  >
    <template #summary>
      {{ store.listeCheck.liste.length }} liste · {{ store.listeCheck.mancanti.length }} mancanti,
      {{ store.listeCheck.orfane.length }} orfane, {{ store.listeCheck.duplicati.length }} nomi duplicati.
    </template>

    <div class="text-caption text-grey-7 q-mt-sm">
      Seleziona le liste e rigenera i file Excel dai pagamenti correnti (idempotente). Le liste non selezionate non
      vengono toccate.
    </div>

    <ListePagamentiTable
      :rows="store.listeCheck.liste"
      :loading="store.listeCheckLoading"
      mode="check"
      selectable
      :selected="selectedListe"
      @update:selected="val => (selectedListe = val)"
    />

    <div class="row items-center q-gutter-sm q-mt-sm">
      <q-btn
        outline
        color="primary"
        icon="fact_check"
        label="Controlla stato file"
        :loading="store.listeFileCheckLoading"
        @click="controllaFileListe"
      />
      <q-btn
        color="primary"
        icon="refresh"
        label="Rigenera selezionate"
        :disable="selectedListe.length === 0"
        :loading="store.listeCheckLoading"
        @click="rigeneraSelezionate"
      />
      <span v-if="selectedListe.length > 0" class="text-caption text-grey-7">
        {{ selectedListe.length }} selezionate
      </span>
    </div>

    <q-list v-if="store.listeCheck.mancanti.length > 0 || store.listeCheck.orfane.length > 0" dense class="q-mt-sm">
      <q-item v-for="m in store.listeCheck.mancanti" :key="'m-' + m.id" dense class="q-px-none">
        <q-item-section>
          <q-item-label caption>Batch senza lista: {{ m.Nome }} ({{ m.pagamenti }} pagamenti)</q-item-label>
        </q-item-section>
      </q-item>
      <q-item v-for="o in store.listeCheck.orfane" :key="'o-' + o.id" dense class="q-px-none">
        <q-item-section>
          <q-item-label caption>Lista orfana: {{ o.Nome }}</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </CheckSection>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref } from 'vue'
import CheckSection from 'src/components/Admin/Check/CheckSection.vue'
import ListePagamentiTable from 'src/components/Pagamenti/ListePagamentiTable.vue'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { useAdminStore } from 'stores/admin.store'

const $q = useQuasar()
const store = useAdminStore()

const selectedListe = ref([])

async function runListeCheck() {
  await store.fetchListeConsistency()
  if (store.error) {
    notifyError($q, store.error, 'Errore verifica liste')
  } else {
    selectedListe.value = []
    notifySuccess($q, 'Verifica liste completata')
  }
}

async function controllaFileListe() {
  await store.controllaFileListe()
  if (store.error) notifyError($q, store.error, 'Errore controllo file liste')
  else notifySuccess($q, 'Controllo file completato')
}

function rigeneraSelezionate() {
  if (selectedListe.value.length === 0) return
  $q.dialog({
    title: 'Rigenera liste selezionate',
    message: `Verranno rigenerati i file Excel di ${selectedListe.value.length} liste dai pagamenti correnti. Confermare?`,
    cancel: { label: 'Annulla', flat: true },
    ok: { label: 'Rigenera', color: 'primary' },
    persistent: true
  }).onOk(async () => {
    const selezionate = [...selectedListe.value]
    try {
      const summary = await store.rigeneraListeSelezionate(selezionate)
      const nErrori = summary.errori?.length || 0
      const msg =
        `${summary.aggiornate} aggiornate, ${summary.create} create, ${summary.eliminate} eliminate` +
        (nErrori ? `, ${nErrori} errori` : '')
      if (nErrori) notifyError($q, null, msg)
      else notifySuccess($q, msg)
      selectedListe.value = []
    } catch {
      notifyError($q, store.error || 'Errore rigenerazione liste')
    }
  })
}
</script>
