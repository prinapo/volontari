<template>
  <q-dialog v-model="model" persistent>
    <q-card>
      <q-card-section class="row items-center">
        <div class="text-h6">Nuovo giustificativo</div>
        <q-space />
        <q-btn
v-close-popup
icon="close"
flat
round
dense
aria-label="Chiudi">
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
              :rules="[
                val => !!val || 'Campo obbligatorio',
                val => Number.parseFloat(val) > 0 || 'Importo maggiore di 0'
              ]"
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
              :rules="[
                val => !!val || 'Campo obbligatorio',
                val => /^\d{4}-\d{2}-\d{2}$/.test(val) || 'Formato data non valido'
              ]"
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
          <GiustificativoFilePicker ref="filePickerRef" v-model="form.File" />
        </q-form>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
v-close-popup
data-testid="form-annulla"
flat
dense
size="sm"
label="Annulla" />
        <q-btn
          color="primary"
          label="Salva"
          data-testid="giustform-salva"
          :loading="saving"
          :disable="
            !form.Descrizione ||
            !form.Importo ||
            Number.parseFloat(form.Importo || 0) <= 0 ||
            !form.File ||
            !form.Data ||
            saving
          "
          @click="handleSave"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import GiustificativoFilePicker from './GiustificativoFilePicker.vue'

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
const filePickerRef = ref(null)

const today = new Date().toISOString().slice(0, 10)
const form = reactive({
  Descrizione: '',
  Importo: null,
  Data: today,
  NotaVolontario: '',
  File: null
})
async function handleSave() {
  console.log('[DEBUG GiustificativoForm] handleSave called, form.File:', form.File?.name || form.File, 'form.Importo:', form.Importo)
  filePickerRef.value?.touch()
  const isValid = await formRef.value?.validate()
  console.log('[DEBUG GiustificativoForm] isValid:', isValid)
  if (!isValid) return
  console.log('[DEBUG GiustificativoForm] emitting save event')
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
}
</script>
