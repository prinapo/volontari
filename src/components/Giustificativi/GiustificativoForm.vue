<template>
  <q-dialog v-model="model" persistent>
    <q-card style="width: 100%; max-width: 520px; min-width: unset">
      <q-card-section class="row items-center">
        <div class="text-h6">Nuovo giustificativo</div>
        <q-space />
        <q-btn v-close-popup icon="close" flat round dense aria-label="Chiudi">
          <q-tooltip>Chiudi</q-tooltip>
        </q-btn>
      </q-card-section>
      <q-separator />
      <q-card-section class="q-pt-sm">
        <q-form ref="formRef" @submit.prevent="handleSave">
          <q-input
            v-model="form.Descrizione"
            label="Descrizione *"
            outlined
            dense
            data-testid="giustform-descrizione"
            :rules="[val => !!val || 'Campo obbligatorio']"
            lazy-rules
            class="q-mb-sm"
          />
          <div class="row q-col-gutter-sm q-mb-sm">
            <q-input
              v-model="form.Importo"
              class="col-12 col-sm-6"
              label="Importo (€)"
              type="number"
              outlined
              dense
              data-testid="giustform-importo"
              step="0.01"
              :rules="[val => !!val || 'Campo obbligatorio']"
              lazy-rules
            />
            <q-input
              v-model="form.Data"
              class="col-12 col-sm-6 cursor-pointer"
              label="Data"
              outlined
              dense
              readonly
              data-testid="giustform-data"
              :rules="[val => !!val || 'Campo obbligatorio']"
              lazy-rules
              @click="dateProxy?.show()"
            >
              <template #append>
                <q-icon name="event" class="cursor-pointer">
                  <q-popup-proxy ref="dateProxy" cover transition-show="scale" transition-hide="scale">
                    <q-date v-model="form.Data" mask="YYYY-MM-DD" today-btn />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>
          <q-input
            v-model="form.NotaVolontario"
            label="Nota (opzionale)"
            type="textarea"
            outlined
            dense
            data-testid="giustform-nota"
            :maxlength="500"
            class="q-mb-sm"
            rows="2"
          />
          <div class="row q-gutter-sm items-center">
            <q-file
              v-model="form.File"
              label="Allega file *"
              :accept="FILE_ACCEPT"
              :max-file-size="FILE_MAX_SIZE"
              outlined
              dense
              clearable
              class="col"
              data-testid="giustform-file"
              :rules="[val => !!val || 'Campo obbligatorio']"
              lazy-rules
              hide-hint
            >
              <template #prepend>
                <q-icon name="attach_file" />
              </template>
            </q-file>
            <input
              ref="cameraInput"
              type="file"
              :accept="FILE_ACCEPT"
              capture="environment"
              class="hidden"
              @change="onCameraCapture"
            />
            <q-btn
              v-if="$q.platform.is.mobile"
              flat
              color="secondary"
              icon="photo_camera"
              aria-label="Foto"
              @click="$refs.cameraInput.click()"
            >
              <q-tooltip>Foto</q-tooltip>
            </q-btn>
          </div>
        </q-form>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn v-close-popup data-testid="form-annulla" flat label="Annulla" />
        <q-btn color="accent" label="Salva" data-testid="giustform-salva" :loading="saving" @click="handleSave" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
  import { reactive, ref, computed } from 'vue'
  import { FILE_ACCEPT, FILE_MAX_SIZE } from 'src/utils/constants'

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    progettoId: { type: String, default: '' },
    famigliaId: { type: String, default: '' },
    annoBando: { type: [Number, String], default: '' },
    saving: { type: Boolean, default: false }
  })

  const emit = defineEmits(['update:modelValue', 'save'])

  const model = computed({
    get: () => props.modelValue,
    set: val => emit('update:modelValue', val)
  })

  const formRef = ref(null)
  const dateProxy = ref(null)
  const cameraInput = ref(null)

  const today = new Date().toISOString().slice(0, 10)
  const form = reactive({
    Descrizione: '',
    Importo: null,
    Data: today,
    NotaVolontario: '',
    File: null
  })

  async function handleSave() {
    const isValid = await formRef.value?.validate()
    if (!isValid) return
    emit('save', {
      ...form,
      Stato: 'draft',
      Progetto: props.progettoId,
      Famiglia: props.famigliaId,
      AnnoBando: props.annoBando,
      Importo: parseFloat(form.Importo)
    })
    resetForm()
  }

  function resetForm() {
    form.Descrizione = ''
    form.Importo = null
    form.Data = today
    form.NotaVolontario = ''
    form.File = null
  }

  function onCameraCapture(event) {
    const file = event.target.files?.[0]
    if (file) {
      form.File = file
    }
    event.target.value = ''
  }
</script>
