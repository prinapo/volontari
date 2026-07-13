<template>
  <q-dialog v-model="model" persistent>
    <q-card>
      <q-card-section>
        <div class="text-h6">
          Modifica dati bancari
        </div>
        <div class="text-caption text-grey-7">
          {{ famigliaName }}{{ beneficiario ? ` — ${beneficiario}` : '' }}
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pt-none">
        <q-input
          v-model="localIban"
          outlined
          dense
          label="IBAN"
          data-testid="bancari-iban"
          class="q-mb-md"
          :rules="IBAN_RULES"
          @update:model-value="val => localIban = sanitizeIBAN(val)"
        />
        <q-input
          v-model="localIntestatario"
          outlined
          dense
          label="Intestatario conto corrente"
          data-testid="bancari-intestatario"
        />
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn v-close-popup flat label="Annulla" color="negative" />
        <q-btn
          flat
          label="Salva"
          color="primary"
          :loading="saving"
          :disable="!hasChanges || (!!localIban && !IBAN_REGEX.test(localIban))"
          @click="handleSave"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { IBAN_RULES, sanitizeIBAN, IBAN_REGEX } from 'src/utils/iban-validator'

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
