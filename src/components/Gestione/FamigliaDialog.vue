<template>
  <q-dialog v-model="visible" persistent>
    <q-card style="width: 100%; max-width: 600px; min-width: unset">
      <q-card-section class="row items-center">
        <div class="text-h6">
          {{ isEdit ? 'Modifica Famiglia' : 'Nuova Famiglia' }}
        </div>
        <q-space />
        <q-btn v-close-popup icon="close" flat round dense />
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="handleSave">
          <q-input
            v-model="form.Nome_Famiglia"
            label="Nome Famiglia *"
            data-testid="famiglia-nome"
            :rules="[val => !!val || 'Campo obbligatorio']"
            lazy-rules
            class="q-mb-md"
          />
          <q-input
            v-model="form.IBAN"
            label="IBAN"
            data-testid="famiglia-iban"
            class="q-mb-md"
          />
          <q-input
            v-model="form.Intestatario_CC"
            label="Intestatario CC"
            data-testid="famiglia-intestatario"
            class="q-mb-md"
          />
        </q-form>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn v-close-popup flat label="Annulla" />
        <q-btn
          color="primary"
          label="Salva"
          :loading="store.saving"
          :disable="!form.Nome_Famiglia"
          @click="handleSave"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useGestioneStore } from 'stores/gestione.store'
import { notifyError, notifySuccess } from 'src/utils/notify'

const props = defineProps({
  modelValue: Boolean,
  editItem: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const $q = useQuasar()
const store = useGestioneStore()

const visible = ref(false)

const form = ref({
  Nome_Famiglia: '',
  IBAN: '',
  Intestatario_CC: ''
})

const isEdit = computed(() => !!props.editItem)

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.editItem) {
    form.value.Nome_Famiglia = props.editItem.Nome_Famiglia || ''
    form.value.IBAN = props.editItem.IBAN || ''
    form.value.Intestatario_CC = props.editItem.Intestatario_CC || ''
  } else if (val) {
    form.value.Nome_Famiglia = ''
    form.value.IBAN = ''
    form.value.Intestatario_CC = ''
  }
})

watch(visible, (val) => {
  if (!val) emit('update:modelValue', false)
})

async function handleSave() {
  if (!form.value.Nome_Famiglia) return

  if (isEdit.value) {
    const ok = await store.updateFamiglia(props.editItem.id_famiglia, {
      Nome_Famiglia: form.value.Nome_Famiglia,
      IBAN: form.value.IBAN || null,
      Intestatario_CC: form.value.Intestatario_CC || null
    })
    if (ok) {
      notifySuccess($q, 'Famiglia modificata')
      emit('saved')
      visible.value = false
    } else if (store.error) {
      notifyError($q, store.error)
    }
  } else {
    const ok = await store.createFamiglia({
      Nome_Famiglia: form.value.Nome_Famiglia,
      IBAN: form.value.IBAN,
      Intestatario_CC: form.value.Intestatario_CC
    })
    if (ok) {
      notifySuccess($q, 'Famiglia creata')
      emit('saved')
      visible.value = false
    } else if (store.error) {
      notifyError($q, store.error)
    }
  }
}
</script>
