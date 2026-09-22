<template>
  <q-dialog v-model="visible">
    <q-card style="min-width: 420px; max-width: 640px">
      <q-card-section class="text-h6">Invia email</q-card-section>
      <q-separator />
      <q-card-section>
        <q-input v-model="oggetto" label="Oggetto *" outlined dense maxlength="150" />
        <q-input
          v-model="corpo"
          label="Corpo *"
          type="textarea"
          autogrow
          outlined
          class="q-mt-sm"
          hint="Segnaposto: {nome}, {cognome}, {famiglia}, {email}"
        />
        <q-input v-model="link" label="Link allegato (opzionale)" outlined dense class="q-mt-sm" />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn v-close-popup flat label="Annulla" />
        <q-btn color="positive" label="Invia" :loading="sending" :disable="!oggetto || !corpo" @click="invia" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { computed, ref, watch } from 'vue'
import { inviaComunicazione } from 'src/usecases/comunicazioni'
import { notifyError, notifySuccess } from 'src/utils/notify'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  contattoId: { type: [Number, String], default: null },
  famigliaId: { type: [Number, String], default: null }
})

const emit = defineEmits(['update:modelValue', 'sent'])

const $q = useQuasar()
const oggetto = ref('')
const corpo = ref('')
const link = ref('')
const sending = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

watch(visible, value => {
  if (value) {
    oggetto.value = ''
    corpo.value = ''
    link.value = ''
  }
})

async function invia() {
  sending.value = true
  try {
    const esito = await inviaComunicazione({
      audience: 'contatto',
      contattoId: props.contattoId,
      subject: oggetto.value,
      body: corpo.value,
      link: link.value || null,
      tipo: 'contatto'
    })
    notifySuccess($q, `Email inviata (${esito.inviati} inviati, ${esito.falliti} falliti)`)
    emit('sent')
    visible.value = false
  } catch (error) {
    notifyError($q, error, "Errore nell'invio dell'email")
  } finally {
    sending.value = false
  }
}
</script>
