<template>
  <q-page class="q-pa-md crea-progetto-page">
    <div class="page-inner" style="max-width: 960px">
      <div class="text-h5 text-weight-medium q-mb-md">Crea progetto di test</div>

      <q-banner v-if="error" class="bg-red-1 text-negative q-mb-md" rounded>
        {{ error }}
      </q-banner>

      <q-form ref="formRef" class="q-gutter-y-md" @submit.prevent="handleSubmit">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">Dati anagrafici</div>
          </q-card-section>

          <q-card-section class="q-gutter-y-md">
            <q-select
              v-model="form.Famiglia"
              label="Famiglia *"
              outlined
              dense
              use-input
              input-debounce="300"
              :options="famigliaOptions"
              :loading="famigliaLoading"
              option-label="Nome_Famiglia"
              option-value="id_famiglia"
              emit-value
              map-options
              :rules="[val => !!val || 'Seleziona una famiglia']"
              lazy-rules
              @filter="filterFamiglie"
            />

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="form.Cognome_Beneficiario"
                  label="Cognome beneficiario *"
                  outlined
                  dense
                  :rules="[val => !!val || 'Campo obbligatorio']"
                  lazy-rules
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="form.Nome_Beneficiario"
                  label="Nome beneficiario *"
                  outlined
                  dense
                  :rules="[val => !!val || 'Campo obbligatorio']"
                  lazy-rules
                />
              </div>
            </div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-4">
                <q-input v-model="form.AnnoBando" label="Anno bando" outlined dense type="number" />
              </div>
              <div class="col-12 col-sm-4">
                <q-input
v-model="form.Allocato"
label="Allocato (€)"
outlined
dense
type="number"
step="0.01" />
              </div>
              <div class="col-12 col-sm-4">
                <q-input v-model="form.Eta" label="Età" outlined dense />
              </div>
            </div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input v-model="form.Data_Inizio_Progetto" label="Data inizio progetto" outlined dense type="date" />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="form.Data_Fine_Progetto" label="Data fine progetto" outlined dense type="date" />
              </div>
            </div>

            <q-input v-model="form.Titolo_Progetto" label="Titolo progetto" outlined dense />

            <q-input v-model="form.Ambito" label="Ambito" outlined dense />

            <q-input
              v-model="form.Relazione_con_il_soggetto_richiedente"
              label="Relazione con il richiedente"
              outlined
              dense
            />

            <q-input
              v-model="form.Descrizione_Progetto"
              label="Descrizione progetto"
              outlined
              dense
              type="textarea"
              rows="3"
            />

            <q-input
              v-model="form.Descrizione_Condizione"
              label="Descrizione condizione"
              outlined
              dense
              type="textarea"
              rows="2"
            />

            <q-input
v-model="form.Dettaglio_Costi"
label="Dettaglio costi"
outlined
dense
type="textarea"
rows="2" />
          </q-card-section>
        </q-card>

        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">Allegati</div>
          </q-card-section>

          <q-card-section class="q-gutter-y-md">
            <q-file
              v-model="allegati.Progetto"
              data-testid="file-allegato-progetto"
              label="Allegato progetto"
              outlined
              dense
              clearable
            >
              <template #prepend>
                <q-icon name="attach_file" />
              </template>
            </q-file>

            <q-file
v-model="allegati.ISEE"
data-testid="file-allegato-isee"
label="Allegato ISEE"
outlined
dense
clearable>
              <template #prepend>
                <q-icon name="attach_file" />
              </template>
            </q-file>

            <q-file
              v-model="allegati.Giustificativi"
              data-testid="file-allegato-giustificativi"
              label="Allegato giustificativi"
              outlined
              dense
              clearable
            >
              <template #prepend>
                <q-icon name="attach_file" />
              </template>
            </q-file>
          </q-card-section>
        </q-card>

        <div class="row q-gutter-sm">
          <q-btn
            data-testid="btn-crea-progetto"
            type="submit"
            color="primary"
            label="Crea progetto"
            :loading="saving"
            icon="save"
          />
          <q-btn flat color="primary" label="Annulla" :to="{ name: 'Admin' }" />
        </div>
      </q-form>
    </div>
  </q-page>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { filesService } from 'src/services/files.service'
import { gestioneService } from 'src/services/gestione.service'
import { progettiService } from 'src/services/progetti.service'
import { notifyError, notifySuccess } from 'src/utils/notify'

const $q = useQuasar()
const router = useRouter()

const formRef = ref(null)
const saving = ref(false)
const error = ref(null)

const form = reactive({
  Famiglia: null,
  Cognome_Beneficiario: '',
  Nome_Beneficiario: '',
  AnnoBando: String(new Date().getFullYear()),
  Allocato: '',
  Titolo_Progetto: '',
  Ambito: '',
  Data_Inizio_Progetto: '',
  Data_Fine_Progetto: '',
  Descrizione_Progetto: '',
  Descrizione_Condizione: '',
  Dettaglio_Costi: '',
  Eta: '',
  Relazione_con_il_soggetto_richiedente: ''
})

const allegati = reactive({
  Progetto: null,
  ISEE: null,
  Giustificativi: null
})

const famigliaOptions = ref([])
const famigliaLoading = ref(false)

async function filterFamiglie(search, update) {
  const normalizedSearch = search?.trim()

  if (!normalizedSearch) {
    famigliaLoading.value = false
    update(() => {
      famigliaOptions.value = []
    })
    return
  }

  famigliaLoading.value = true
  try {
    const res = await gestioneService.searchFamiglie(normalizedSearch)
    update(() => {
      famigliaOptions.value = res.data.data || []
    })
  } catch {
    update(() => {
      famigliaOptions.value = []
    })
  } finally {
    famigliaLoading.value = false
  }
}

function generateId() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`
}

function normalizeNumber(value, parser) {
  if (value === '' || value === null || value === undefined) return null
  return parser(value)
}

async function uploadAllegato(file) {
  if (!file) return null
  const res = await filesService.upload(file)
  return res.data.data.id
}

async function createAllegatoLink(progettoId, junctionTable, fileId) {
  if (!fileId) return
  await progettiService.createAllegato(junctionTable, {
    Progetti_id_progetto: progettoId,
    directus_files_id: fileId
  })
}

async function uploadAndLinkAllegato(file, progettoId, junctionTable) {
  if (!file) return
  const fileId = await uploadAllegato(file)
  await createAllegatoLink(progettoId, junctionTable, fileId)
}

async function handleSubmit() {
  const isValid = await formRef.value.validate()
  if (!isValid) return

  saving.value = true
  error.value = null

  try {
    const payload = {
      id_progetto: generateId(),
      Famiglia: form.Famiglia,
      Cognome_Beneficiario: form.Cognome_Beneficiario,
      Nome_Beneficiario: form.Nome_Beneficiario,
      AnnoBando: normalizeNumber(form.AnnoBando, value => Number.parseInt(value, 10)),
      Allocato: normalizeNumber(form.Allocato, value => Number.parseFloat(value)),
      Titolo_Progetto: form.Titolo_Progetto || null,
      Ambito: form.Ambito || null,
      Data_Inizio_Progetto: form.Data_Inizio_Progetto || null,
      Data_Fine_Progetto: form.Data_Fine_Progetto || null,
      Descrizione_Progetto: form.Descrizione_Progetto || null,
      Descrizione_Condizione: form.Descrizione_Condizione || null,
      Dettaglio_Costi: form.Dettaglio_Costi || null,
      Eta: form.Eta || null,
      Relazione_con_il_soggetto_richiedente: form.Relazione_con_il_soggetto_richiedente || null,
      StatoProgetto: 'aperto'
    }

    const progettoRes = await progettiService.createProgetto(payload)
    const progettoId = progettoRes.data.data?.id_progetto || payload.id_progetto

    await uploadAndLinkAllegato(allegati.Progetto, progettoId, 'Progetti_files')
    await uploadAndLinkAllegato(allegati.ISEE, progettoId, 'Progetti_files_1')
    await uploadAndLinkAllegato(allegati.Giustificativi, progettoId, 'Progetti_files_2')

    notifySuccess($q, `Progetto creato (ID: ${progettoId})`)
    await router.push({ name: 'Admin' })
  } catch (error_) {
    error.value = error_.response?.data?.errors?.[0]?.message || 'Errore nella creazione del progetto'
    notifyError($q, error_)
  } finally {
    saving.value = false
  }
}
</script>
