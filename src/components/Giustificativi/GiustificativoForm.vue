<template>
  <q-dialog v-model="model" persistent>
    <q-card style="width: 100%; max-width: 520px; min-width: unset">
      <q-card-section class="row items-center">
        <div class="text-h6">
          Nuovo giustificativo
        </div>
        <q-space />
        <q-btn
          v-close-popup
          icon="close"
          flat
          round
          dense
          aria-label="Chiudi"
        >
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
                  <q-popup-proxy ref="dateProxy" cover>
                    <q-date v-model="form.Data" mask="YYYY-MM-DD" today-btn @update:model-value="dateProxy.hide()" />
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
          <div class="row items-center q-gutter-sm">
            <input
              ref="fileInput"
              type="file"
              :accept="FILE_ACCEPT"
              hidden
              @change="onFileChange"
            >
            <q-btn
              icon="attach_file"
              label="Allega file"
              :color="fileBtnColor"
              :flat="!fileTouched || !form.File"
              :outline="!form.File"
              :class="{ 'bg-green-1': form.File }"
              @click="$refs.fileInput.click()"
            />
            <q-btn
              v-if="form.File"
              flat
              dense
              icon="close"
              size="xs"
              color="negative"
              @click="removeFile"
            >
              <q-tooltip>Rimuovi file</q-tooltip>
            </q-btn>
          </div>
          <div v-if="form.File" class="text-caption text-green q-mt-xs">
            {{ form.File.name }}
          </div>
          <div v-else-if="fileTouched && !form.File" class="text-caption text-negative q-mt-xs">
            Campo obbligatorio
          </div>
        </q-form>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn v-close-popup data-testid="form-annulla" flat label="Annulla" />
        <q-btn
          color="accent"
          label="Salva"
          data-testid="giustform-salva"
          :loading="saving"
          @click="handleSave"
        />
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
  set: (val) => emit('update:modelValue', val)
})

const formRef = ref(null)
const dateProxy = ref(null)
const fileInput = ref(null)

const today = new Date().toISOString().slice(0, 10)
const form = reactive({
  Descrizione: '',
  Importo: null,
  Data: today,
  NotaVolontario: '',
  File: null
})
const fileTouched = ref(false)

const fileBtnColor = computed(() => {
  if (form.File) return 'green'
  if (fileTouched.value) return 'negative'
  return 'grey-7'
})

function onFileChange(event) {
  const file = event.target.files?.[0]
  if (file) {
    if (file.size > FILE_MAX_SIZE) return
    form.File = file
    fileTouched.value = true
  }
  event.target.value = ''
}

function removeFile() {
  form.File = null
  if (fileInput.value) fileInput.value.value = ''
}

async function handleSave() {
  fileTouched.value = true
  const isValid = await formRef.value?.validate()
  if (!isValid) return
  emit('save', {
    ...form,
    Stato: 'draft',
    Progetto: props.progettoId,
    Famiglia: props.famigliaId,
    AnnoBando: props.annoBando,
    Importo: Number.parseFloat(form.Importo)
  })
  resetForm()
}

function resetForm() {
  form.Descrizione = ''
  form.Importo = null
  form.Data = today
  form.NotaVolontario = ''
  form.File = null
  fileTouched.value = false
  if (fileInput.value) fileInput.value.value = ''
}
</script>
