<template>
  <div>
    <q-inner-loading :showing="loading" />

    <template v-if="erogazioni.length === 0 && !loading">
      <q-card flat bordered class="q-mb-md">
        <q-card-section class="text-center text-grey"> Nessuna erogazione presente </q-card-section>
      </q-card>
    </template>

    <ErogazioneCard v-for="item in erogazioni" :key="item.id" :item="item" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useFamiglieStore } from 'stores/famiglie.store'
import ErogazioneCard from './ErogazioneCard.vue'

const famiglieStore = useFamiglieStore()

const erogazioni = computed(() => famiglieStore.erogazioni)
const loading = computed(() => famiglieStore.erogazioniLoading)
</script>
