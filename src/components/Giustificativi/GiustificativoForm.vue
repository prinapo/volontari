<template>
  <q-dialog v-model="model" persistent maximized>
    <q-card>
      <q-card-section class="row items-center">
        <div class="text-h6">Nuovo giustificativo</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      <q-separator />
      <q-card-section>
        <q-form @submit.prevent="handleSave" class="q-gutter-y-md" ref="formRef">
          <q-input
            v-model="form.Descrizione"
            label="Descrizione"
            filled
            :rules="[val => !!val || 'Campo obbligatorio']"
            lazy-rules
          />
          <q-input
            v-model="form.Importo"
            label="Importo (€)"
            type="number"
            filled
            step="0.01"
            :rules="[val => !!val || 'Campo obbligatorio']"
            lazy-rules
          />
          <q-date
            v-model="form.Data"
            label="Data"
            filled
            mask="YYYY-MM-DD"
            today-btn
            :rules="[val => !!val || 'Campo obbligatorio']"
            lazy-rules
          />
          <q-select
            v-model="form.Stato"
            :options="statoOptions"
            label="Stato"
            filled
          />
          <q-file
            v-model="form.File"
            label="Allega file"
            :accept="FILE_ACCEPT"
            :max-file-size="FILE_MAX_SIZE"
            filled
            clearable
            :rules="[val => !!val || 'Campo obbligatorio']"
            lazy-rules
          >
            <template v-slot:prepend>
              <q-icon name="attach_file" />
            </template>
            <template v-slot:hint>
              Formati: {{ FILE_ACCEPT }}
            </template>
          </q-file>
        </q-form>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn data-testid="form-annulla" flat label="Annulla" v-close-popup />
        <q-btn
          color="primary"
          label="Salva"
          :loading="saving"
          @click="handleSave"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { FILE_ACCEPT, FILE_MAX_SIZE } from 'src/utils/constants'

const $q = useQuasar()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  progettoId: { type: String, default: '' },
  saving: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'save'])

const model = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const formRef = ref(null)

const today = new Date().toISOString().slice(0, 10)
const form = reactive({
  Descrizione: '',
  Importo: null,
  Data: today,
  Stato: 'draft',
  File: null
})

const statoOptions = [
  { label: 'Bozza', value: 'draft' },
  { label: 'Inviato', value: 'Inviato' }
]

async function handleSave() {
  const isValid = await formRef.value?.validate()
  if (!isValid) return
  emit('save', {
    ...form,
    Progetto: props.progettoId,
    Importo: parseFloat(form.Importo)
  })
  resetForm()
}

function resetForm() {
  form.Descrizione = ''
  form.Importo = null
  form.Data = ''
  form.Stato = 'draft'
  form.File = null
}
</script>
