<template>
  <q-page class="q-pa-md submit-page">
    <div class="page-inner">
      <div class="text-center q-mb-lg">
        <div class="text-h4 text-weight-medium">Invio giustificativi</div>
        <div class="text-body1 text-grey-7">
          Questo form è per famiglie senza un volontario assegnato.
        </div>
      </div>

      <q-banner v-if="submitted" class="bg-positive text-white q-mb-md" rounded>
        <div class="text-h6">Grazie!</div>
        <div>Il tuo giustificativo è stato ricevuto. Verrà verificato al più presto.</div>
      </q-banner>

      <q-banner v-if="error" class="bg-red-1 text-negative q-mb-md" rounded>
        {{ error }}
      </q-banner>

      <q-form v-if="!submitted" ref="formRef" @submit.prevent="handleSubmit" class="q-gutter-y-lg">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">Chi sei</div>
          </q-card-section>
          <q-card-section class="q-gutter-y-md">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="form.nome_richiedente"
                  label="Nome *"
                  outlined
                  :rules="[val => !!val || 'Campo obbligatorio']"
                  lazy-rules
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="form.cognome_richiedente"
                  label="Cognome *"
                  outlined
                  :rules="[val => !!val || 'Campo obbligatorio']"
                  lazy-rules
                />
              </div>
            </div>
            <q-input
              v-model="form.email"
              label="Email *"
              type="email"
              outlined
              :rules="[
                val => !!val || 'Campo obbligatorio',
                val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Email non valida'
              ]"
              lazy-rules
            />
            <q-input
              v-model="form.iban"
              label="IBAN *"
              outlined
              :rules="[val => !!val || 'Campo obbligatorio']"
              lazy-rules
            />
            <q-input
              v-model="form.intestatario"
              label="Intestatario CC *"
              outlined
              :rules="[val => !!val || 'Campo obbligatorio']"
              lazy-rules
            />
          </q-card-section>
        </q-card>

        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">Beneficiario</div>
          </q-card-section>
          <q-card-section class="q-gutter-y-md">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="form.nome_beneficiario"
                  label="Nome *"
                  outlined
                  :rules="[val => !!val || 'Campo obbligatorio']"
                  lazy-rules
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="form.cognome_beneficiario"
                  label="Cognome *"
                  outlined
                  :rules="[val => !!val || 'Campo obbligatorio']"
                  lazy-rules
                />
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">Giustificativo</div>
          </q-card-section>
          <q-card-section class="q-gutter-y-md">
            <q-input
              v-model="form.descrizione"
              label="Descrizione *"
              outlined
              type="textarea"
              :rules="[val => !!val || 'Campo obbligatorio']"
              lazy-rules
            />
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="form.importo"
                  label="Importo (€) *"
                  type="number"
                  outlined
                  step="0.01"
                  :rules="[val => !!val || 'Campo obbligatorio']"
                  lazy-rules
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="form.data"
                  label="Data *"
                  type="date"
                  outlined
                  :rules="[val => !!val || 'Campo obbligatorio']"
                  lazy-rules
                />
              </div>
            </div>
            <FileUploader
              :accept="FILE_ACCEPT"
              :max-size="FILE_MAX_SIZE"
              @file-selected="onFileSelected"
              @file-removed="onFileRemoved"
            />
          </q-card-section>
        </q-card>

        <div class="text-center q-mb-xl">
          <q-btn
            type="submit"
            color="primary"
            size="lg"
            label="Invia"
            :loading="saving"
          />
        </div>
      </q-form>

      <div v-else class="text-center q-mt-xl">
        <q-btn
          color="primary"
          outline
          label="Invia un altro giustificativo"
          @click="resetForm"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { submitService } from 'src/services/submit.service'
import { FILE_ACCEPT, FILE_MAX_SIZE, FOLDERS } from 'src/utils/constants'
import FileUploader from 'components/Common/FileUploader.vue'

const $q = useQuasar()
const formRef = ref(null)
const saving = ref(false)
const submitted = ref(false)
const error = ref('')
const selectedFile = ref(null)

const form = reactive({
  nome_richiedente: '',
  cognome_richiedente: '',
  email: '',
  iban: '',
  intestatario: '',
  nome_beneficiario: '',
  cognome_beneficiario: '',
  descrizione: '',
  importo: null,
  data: new Date().toISOString().slice(0, 10)
})

function onFileSelected(file) {
  selectedFile.value = file
}

function onFileRemoved() {
  selectedFile.value = null
}

async function handleSubmit() {
  const isValid = await formRef.value?.validate()
  if (!isValid) return
  if (!selectedFile.value) {
    error.value = 'Seleziona un file da allegare'
    return
  }

  saving.value = true
  error.value = ''
  try {
    const uploadRes = await submitService.uploadFile(selectedFile.value, FOLDERS.INVII_PUBBLICI)
    const allegatoId = uploadRes.data.data.id

    await submitService.createSubmission({
      ...form,
      importo: parseFloat(form.importo),
      allegato: allegatoId,
      stato: 'in_attesa',
      data_invio: new Date().toISOString()
    })

    submitted.value = true
  } catch {
    error.value = 'Errore nell\'invio. Riprova più tardi.'
  } finally {
    saving.value = false
  }
}

function resetForm() {
  form.nome_richiedente = ''
  form.cognome_richiedente = ''
  form.email = ''
  form.iban = ''
  form.intestatario = ''
  form.nome_beneficiario = ''
  form.cognome_beneficiario = ''
  form.descrizione = ''
  form.importo = null
  form.data = new Date().toISOString().slice(0, 10)
  selectedFile.value = null
  submitted.value = false
  error.value = ''
}
</script>

<style scoped>
.page-inner {
  max-width: 640px;
  margin: 0 auto;
}
</style>
