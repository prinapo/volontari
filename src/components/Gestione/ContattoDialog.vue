<template>
  <q-dialog v-model="visible" persistent>
    <q-card style="min-width: 450px">
      <q-card-section class="row items-center">
        <div class="text-h6">{{ isEdit ? 'Modifica Contatto' : 'Nuovo Contatto' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="handleSave">
          <q-input
            v-model="form.Nome"
            label="Nome *"
            :rules="[val => !!val || 'Campo obbligatorio']"
            lazy-rules
            class="q-mb-md"
          />
          <q-input
            v-model="form.Cognome"
            label="Cognome *"
            :rules="[val => !!val || 'Campo obbligatorio']"
            lazy-rules
            class="q-mb-md"
          />
          <q-input
            v-model="form.Email"
            label="Email"
            type="email"
            :disable="hasAccount"
            class="q-mb-md"
          />
          <q-input
            v-model="form.Numero_di_cellulare"
            label="Numero di cellulare"
            class="q-mb-md"
          />
          <q-input
            v-model="form.Numero_di_telefono"
            label="Numero di telefono"
            class="q-mb-md"
          />
        </q-form>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Annulla" v-close-popup />
        <q-btn
          color="primary"
          label="Salva"
          :loading="store.saving"
          :disable="!form.Nome || !form.Cognome"
          @click="handleSave"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useGestioneStore } from 'stores/gestione.store'

function generateContattoId() {
  const ts = Date.now()
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  return Number(ts + rand)
}

const props = defineProps({
  modelValue: Boolean,
  editItem: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const store = useGestioneStore()

const visible = ref(false)

const form = ref({
  Nome: '',
  Cognome: '',
  Email: '',
  Numero_di_cellulare: '',
  Numero_di_telefono: ''
})

const isEdit = computed(() => !!props.editItem)
const hasAccount = computed(() => !!props.editItem?.user_id)

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.editItem) {
    form.value.Nome = props.editItem.Nome || ''
    form.value.Cognome = props.editItem.Cognome || ''
    form.value.Email = props.editItem.Email || props.editItem.user_id?.email || ''
    form.value.Numero_di_cellulare = props.editItem.Numero_di_cellulare || ''
    form.value.Numero_di_telefono = props.editItem.Numero_di_telefono || ''
  } else if (val) {
    form.value.Nome = ''
    form.value.Cognome = ''
    form.value.Email = ''
    form.value.Numero_di_cellulare = ''
    form.value.Numero_di_telefono = ''
  }
})

watch(visible, (val) => {
  if (!val) emit('update:modelValue', false)
})

async function handleSave() {
  if (!form.value.Nome || !form.value.Cognome) return

  if (isEdit.value) {
    const ok = await store.updateContatto(props.editItem.id_contatto, {
      Nome: form.value.Nome,
      Cognome: form.value.Cognome,
      Email: hasAccount.value ? undefined : (form.value.Email || null),
      Numero_di_cellulare: form.value.Numero_di_cellulare || null,
      Numero_di_telefono: form.value.Numero_di_telefono || null
    })
    if (ok) {
      emit('saved')
      visible.value = false
    }
  } else {
    const ok = await store.createGenitore({
      id_contatto: generateContattoId(),
      Nome: form.value.Nome,
      Cognome: form.value.Cognome,
      Email: form.value.Email,
      Numero_di_cellulare: form.value.Numero_di_cellulare,
      Numero_di_telefono: form.value.Numero_di_telefono
    })
    if (ok) {
      emit('saved')
      visible.value = false
    }
  }
}
</script>
