<template>
  <div>
    <div class="row items-center q-mb-sm">
      <div class="text-subtitle2">Note</div>
      <q-space />
    </div>

    <q-inner-loading :showing="store.loading" />

    <div v-if="!store.loading && noteList.length === 0" class="text-caption text-grey q-mb-sm">Nessuna nota</div>
    <q-list v-else dense separator class="q-mb-sm">
      <q-item v-for="item in noteList" :key="item.id">
        <q-item-section>
          <q-item-label class="text-body2 text-pre-wrap">{{ item.Testo }}</q-item-label>
          <q-item-label caption> {{ authorName(item) }} · {{ formatDateTime(item.date_created) }} </q-item-label>
        </q-item-section>
      </q-item>
    </q-list>

<NotaInput
      v-model="testo"
      placeholder="Aggiungi una nota..."
      testid-input="note-input"
      testid-button="note-add"
      button-icon="add"
      button-label="Aggiungi nota"
      :loading="store.saving"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import NotaInput from 'src/components/Note/NotaInput.vue'
import { useNoteStore } from 'src/stores/note.store'
import { formatDateTime } from 'src/utils/formatters'

const props = defineProps({
  progettoId: { type: [Number, String], required: true }
})

const store = useNoteStore()
const testo = ref('')

const noteList = computed(() => store.notesByProgetto(props.progettoId))

function authorName(item) {
  if (item.AutoreNome) return item.AutoreNome
  const first = item.user_created?.first_name
  const last = item.user_created?.last_name
  return [first, last].filter(Boolean).join(' ') || 'Utente'
}

async function handleSubmit() {
  const value = testo.value.trim()
  if (!value) return
  try {
    await store.createNota(props.progettoId, value)
    testo.value = ''
  } catch {
    // errore già esposto dallo store
  }
}

watch(
  () => props.progettoId,
  id => {
    if (id) store.fetchByProgetto(id)
  },
  { immediate: true }
)
</script>
