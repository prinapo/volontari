<template>
  <q-dialog v-model="model" persistent>
    <q-card style="min-width: 400px">
      <q-card-section>
        <div class="text-h6">
          Modifica dati bancari
        </div>
        <div class="text-caption text-grey-7">
          {{ famigliaName }}{{ beneficiario ? ` — ${beneficiario}` : '' }}
        </div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-input
          v-model="localIban"
          outlined
          dense
          label="IBAN"
          class="q-mb-md"
          :rules="[val => !val || /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/i.test(val) || 'IBAN non valido']"
        />
        <q-input
          v-model="localIntestatario"
          outlined
          dense
          label="Intestatario conto corrente"
        />
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn v-close-popup flat label="Annulla" color="negative" />
        <q-btn
          flat
          label="Salva"
          color="primary"
          :loading="saving"
          :disable="!hasChanges"
          @click="handleSave"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  famigliaName: { type: String, default: '' },
  beneficiario: { type: String, default: '' },
  initialIban: { type: String, default: '' },
  initialIntestatario: { type: String, default: '' },
  saving: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'save'])

const model = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const localIban = ref(props.initialIban)
const localIntestatario = ref(props.initialIntestatario)

watch(() => props.modelValue, (val) => {
  if (val) {
    localIban.value = props.initialIban
    localIntestatario.value = props.initialIntestatario
  }
})

const hasChanges = computed(() =>
  localIban.value !== props.initialIban ||
  localIntestatario.value !== props.initialIntestatario
)

function handleSave() {
  emit('save', {
    iban: localIban.value,
    intestatario: localIntestatario.value
  })
}
</script>
