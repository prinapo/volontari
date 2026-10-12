<template>
  <div>
    <div class="text-subtitle2 text-grey-8 q-mb-xs">Genitori</div>
    <div v-if="loading && !genitori" class="text-caption text-grey">
      <q-spinner size="xs" /> Caricamento...
    </div>
    <div v-else-if="empty(genitori)" class="text-caption text-grey q-mb-sm">Nessun genitore assegnato.</div>
    <q-list v-else dense class="q-mb-sm">
      <q-item v-for="g in genitori" :key="g.id" dense class="q-px-none q-py-xs">
        <q-item-section><ContattoInfoLine :contact="g.Contatto" :emails="g._emails || []" /></q-item-section>
      </q-item>
    </q-list>

    <div class="text-subtitle2 text-grey-8 q-mb-xs q-mt-md">Volontari</div>
    <div v-if="loading && !volontari" class="text-caption text-grey">
      <q-spinner size="xs" /> Caricamento...
    </div>
    <div v-else-if="empty(volontari)" class="text-caption text-grey q-mb-sm">Nessun volontario assegnato.</div>
    <q-list v-else dense class="q-mb-sm">
      <q-item v-for="v in volontari" :key="v.id" dense class="q-px-none q-py-xs">
        <q-item-section><ContattoInfoLine :contact="v.Contatto" :emails="v._emails || []" /></q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup>
import ContattoInfoLine from 'components/Common/ContattoInfoLine.vue'

defineProps({
  genitori: { type: Array, default: undefined },
  volontari: { type: Array, default: undefined },
  loading: { type: Boolean, default: false }
})

function empty(list) {
  return list == null || list.length === 0
}
</script>