<template>
  <AppDialog v-model="visible" title="Invia email" :persistent="false" :width="420">
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
    <template #footer>
      <q-btn v-close-popup flat dense size="sm" label="Annulla" />
      <q-btn color="positive" label="Invia" :loading="sending" :disable="!oggetto || !corpo" @click="invia" />
    </template>
  </AppDialog>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { computed, ref, watch } from 'vue'
import AppDialog from 'components/Common/AppDialog.vue'
import { inviaComunicazione } from 'src/usecases/comunicazioni'
import { notifyError, notifySuccess } from 'src/utils/notify'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  contattoId: { type: [Number, String], default: null },
  famigliaId: { type: [Number, String], default: null },
  email: { type: String, default: null }
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
      audience: props.contattoId ? 'contatto' : 'email',
      contattoId: props.contattoId,
      email: props.email,
      subject: oggetto.value,
      body: corpo.value,
      link: link.value || null,
      tipo: props.contattoId ? 'contatto' : 'email'
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
