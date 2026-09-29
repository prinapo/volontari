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
          <q-item-label caption> {{ authorName(item) }} · {{ formatDate(item.date_created) }} </q-item-label>
        </q-item-section>
      </q-item>
    </q-list>

    <div class="row items-end q-gutter-sm">
      <q-input
        v-model="testo"
        class="col"
        outlined
        dense
        autogrow
        type="textarea"
        placeholder="Aggiungi una nota..."
        data-testid="note-input"
        @keydown.enter.exact.prevent="handleSubmit"
      />
      <q-btn
        color="primary"
        icon="add"
        :loading="store.saving"
        :disable="!testo.trim()"
        aria-label="Aggiungi nota"
        data-testid="note-add"
        @click="handleSubmit"
      >
        <q-tooltip>Aggiungi nota</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useNoteStore } from 'src/stores/note.store'

const props = defineProps({
  progettoId: { type: [Number, String], required: true },
  origine: { type: String, default: 'volontario' }
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

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('it-IT')
}

async function handleSubmit() {
  const value = testo.value.trim()
  if (!value) return
  try {
    await store.createNota(props.progettoId, value, props.origine)
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
