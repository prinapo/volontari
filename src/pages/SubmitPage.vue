<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="q-pa-md submit-page">
        <div class="page-inner">
          <div class="text-center q-mb-lg">
            <div class="text-h4 text-weight-medium">
              Invio giustificativi
            </div>
            <div class="text-body1 text-grey-7">
              Questo form è per famiglie senza un volontario assegnato.
            </div>
            <q-btn
              flat
              dense
              color="primary"
              icon="arrow_back"
              label="Torna al login"
              to="/login"
              class="q-mt-sm"
            />
          </div>

          <q-form ref="formRef" class="q-gutter-y-lg" @submit.prevent="handleSubmit">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-h6">
                  Chi sei
                </div>
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
                  v-model="form.telefono"
                  label="Telefono *"
                  type="tel"
                  outlined
                  :rules="[val => !!val || 'Campo obbligatorio']"
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
                <div class="text-h6">
                  Beneficiario
                </div>
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

            <template v-for="(g, i) in giustificativi" :key="i">
              <q-card flat bordered class="q-mt-md">
                <q-card-section class="q-gutter-y-md">
                  <div class="row items-center q-mb-sm">
                    <div class="text-subtitle2 text-grey-8">
                      Giustificativo #{{ i + 1 }}
                    </div>
                    <q-space />
                    <q-btn
                      v-if="giustificativi.length > 1"
                      icon="delete"
                      round
                      flat
                      dense
                      color="negative"
                      @click="removeGiustificativo(i)"
                    >
                      <q-tooltip>Rimuovi</q-tooltip>
                    </q-btn>
                  </div>
                  <q-input
                    v-model="g.descrizione"
                    label="Descrizione *"
                    outlined
                    type="textarea"
                    :rules="[val => !!val || 'Campo obbligatorio']"
                    lazy-rules
                  />
                  <div class="row q-col-gutter-md">
                    <div class="col-12 col-sm-6">
                      <q-input
                        v-model="g.importo"
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
                        v-model="g.data"
                        label="Data *"
                        type="date"
                        outlined
                        :rules="[val => !!val || 'Campo obbligatorio']"
                        lazy-rules
                      />
                    </div>
                  </div>
                  <q-file
                    v-model="g.file"
                    label="Allega file *"
                    :accept="FILE_ACCEPT"
                    :max-file-size="FILE_MAX_SIZE"
                    outlined
                    clearable
                    :rules="[val => !!val || 'Seleziona un file']"
                    lazy-rules
                  >
                    <template #prepend>
                      <q-icon name="attach_file" />
                    </template>
                    <template #hint>
                      Formati: {{ FILE_ACCEPT }}
                    </template>
                  </q-file>
                </q-card-section>
              </q-card>
            </template>

            <div class="text-center q-mt-md">
              <q-btn
                icon="add"
                unelevated
                color="secondary"
                label="Aggiungi giustificativo"
                @click="addGiustificativo"
              />
            </div>

            <div v-if="giustificativi.length > 0" class="text-center q-mb-xl q-mt-lg">
              <q-btn
                type="submit"
                color="primary"
                size="lg"
                label="Invia"
                :loading="saving"
              />
            </div>
          </q-form>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { submitService } from 'src/services/submit.service'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { FILE_ACCEPT, FILE_MAX_SIZE, FOLDERS } from 'src/utils/constants'

const $q = useQuasar()
const formRef = ref(null)
const saving = ref(false)

const today = new Date().toISOString().slice(0, 10)

const form = reactive({
  nome_richiedente: '',
  cognome_richiedente: '',
  email: '',
  telefono: '',
  iban: '',
  intestatario: '',
  nome_beneficiario: '',
  cognome_beneficiario: ''
})

const giustificativi = ref([])

function addGiustificativo() {
  giustificativi.value.push({ descrizione: '', importo: null, data: today, file: null })
}

function removeGiustificativo(index) {
  giustificativi.value.splice(index, 1)
}

async function handleSubmit() {
  const isValid = await formRef.value?.validate()
  if (!isValid) return

  saving.value = true
  try {
    for (const g of giustificativi.value) {
      const uploadRes = await submitService.uploadFile(g.file, FOLDERS.INVII_PUBBLICI)
      const allegatoId = uploadRes.data.data.id

      await submitService.createSubmission({
        ...form,
        descrizione: g.descrizione,
        importo: parseFloat(g.importo),
        data: g.data,
        allegato: allegatoId,
        stato: 'in_attesa',
        data_invio: new Date().toISOString()
      })
    }

    notifySuccess($q, 'Grazie! I tuoi giustificativi sono stati ricevuti. Verranno verificati al più presto.')

    resetForm()
  } catch (err) {
    notifyError($q, err, "Errore nell'invio. Riprova più tardi.")
  } finally {
    saving.value = false
  }
}

function resetForm() {
  form.nome_richiedente = ''
  form.cognome_richiedente = ''
  form.email = ''
  form.telefono = ''
  form.iban = ''
  form.intestatario = ''
  form.nome_beneficiario = ''
  form.cognome_beneficiario = ''
  giustificativi.value = []
}
</script>

<style scoped>
.page-inner {
  max-width: 640px;
  margin: 0 auto;
}
</style>
