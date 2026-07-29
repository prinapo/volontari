<template>
  <div>
    <div class="row items-center q-mb-md">
      <div class="text-h6">Giustificativi</div>
      <q-space />
      <q-btn color="primary" icon="add" label="Aggiungi" :disable="!progettoId" @click="showForm = true" />
    </div>

    <q-inner-loading :showing="loading" />

    <template v-if="items.length === 0 && !loading">
      <q-card flat bordered>
        <q-card-section class="text-center text-grey"> Nessun giustificativo presente </q-card-section>
      </q-card>
    </template>

    <template v-for="item in items" :key="item.id">
      <GiustificativoCard
        :item="item"
        :can-edit="item.Stato === 'draft'"
        @save-field="handleSaveField"
        @submit="handleSubmit"
        @file-change="handleFileChange"
        @invalida="handleInvalida"
      />
    </template>

    <GiustificativoForm
      v-model="showForm"
      :progetto-id="progettoId"
      :famiglia-id="famigliaId"
      :anno-bando="annoBando"
      :saving="saving"
      @save="handleCreate"
    />
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, watch, computed } from 'vue'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { useGiustificativiStore } from 'stores/giustificativi.store'
import GiustificativoCard from './GiustificativoCard.vue'
import GiustificativoForm from './GiustificativoForm.vue'

const $q = useQuasar()
const giustificativiStore = useGiustificativiStore()

const props = defineProps({
  progettoId: { type: String, default: '' },
  famigliaId: { type: String, default: '' },
  annoBando: { type: [Number, String], default: '' }
})

const showForm = ref(false)

const items = computed(() => {
  return [...giustificativiStore.data].filter(i => !i.Invalidato).sort((a, b) => new Date(b.Data) - new Date(a.Data))
})
const loading = computed(() => giustificativiStore.loading)
const saving = computed(() => giustificativiStore.saving)

watch(
  () => props.progettoId,
  id => {
    if (id) {
      giustificativiStore.fetchByProgetto(id)
    }
  },
  { immediate: true }
)

async function handleCreate(formData) {
  try {
    await giustificativiStore.createGiustificativo(formData, formData.File)
    notifySuccess($q, 'Giustificativo creato')
    showForm.value = false
    if (props.progettoId) {
      giustificativiStore.fetchByProgetto(props.progettoId)
    }
  } catch {
    notifyError($q, giustificativiStore.error || 'Errore nella creazione')
  }
}

async function handleSaveField({ id, field, value }) {
  try {
    await giustificativiStore.saveInlineEdit(id, field, value)
    notifySuccess($q, 'Campo salvato')
  } catch {
    notifyError($q, giustificativiStore.error || 'Errore nel salvataggio')
  }
}

async function handleSubmit(item) {
  try {
    await giustificativiStore.submitGiustificativo(item.id)
    notifySuccess($q, 'Giustificativo inviato')
    if (props.progettoId) {
      await giustificativiStore.fetchByProgetto(props.progettoId)
    }
  } catch {
    notifyError($q, giustificativiStore.error || "Errore nell'invio")
  }
}

async function handleFileChange({ id, file }) {
  try {
    await giustificativiStore.updateGiustificativo(id, {}, file)
    notifySuccess($q, 'Allegato aggiornato')
    if (props.progettoId) {
      giustificativiStore.fetchByProgetto(props.progettoId)
    }
  } catch {
    notifyError($q, giustificativiStore.error || "Errore nell'aggiornamento")
  }
}

async function handleInvalida(id) {
  try {
    await giustificativiStore.invalidateGiustificativo(id)
    notifySuccess($q, 'Giustificativo eliminato')
  } catch {
    notifyError($q, giustificativiStore.error || "Errore nell'invalidazione")
  }
}
</script>
