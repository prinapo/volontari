<template>
  <div>
    <div class="text-caption text-grey-7 q-mb-md">
      Le liste vengono generate automaticamente alla creazione di un gruppo di pagamento.
    </div>

    <ListePagamentiTable
      :rows="filteredListe"
      :loading="store.loading"
      mode="download"
      :search-model="searchListe"
      @update:search="val => (searchListe = val)"
      @refresh="store.fetchListe()"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ListePagamentiTable from 'src/components/Pagamenti/ListePagamentiTable.vue'
import { usePagamentiStore } from 'stores/pagamenti.store'

const store = usePagamentiStore()

const searchListe = ref('')

const filteredListe = computed(() => {
  if (!searchListe.value) return store.liste
  const q = searchListe.value.toLowerCase()
  return store.liste.filter(p => (p.Nome || '').toLowerCase().includes(q))
})
</script>
