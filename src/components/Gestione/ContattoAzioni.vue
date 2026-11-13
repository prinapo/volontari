<template>
  <q-btn
    flat
    round
    dense
    icon="edit"
    color="grey-6"
    size="sm"
    data-testid="btn-edit-contatto"
    aria-label="Modifica"
    @click="emit('edit', row)"
  >
    <q-tooltip>Modifica</q-tooltip>
  </q-btn>
  <q-btn
flat
round
dense
icon="groups"
size="sm"
aria-label="Assegna famiglia"
@click="emit('famiglie', row)">
    <q-tooltip>Assegna famiglia</q-tooltip>
  </q-btn>
  <q-btn
    v-if="row.IsVolontario"
    flat
    round
    dense
    icon="person_search"
    color="accent"
    size="sm"
    data-testid="btn-assigna-referente"
    aria-label="Assegna Referente"
    @click="emit('referente', row)"
  >
    <q-tooltip>Assegna Referente</q-tooltip>
  </q-btn>
  <q-btn
    v-if="showComms"
    flat
    round
    dense
    icon="mail"
    size="sm"
    data-testid="btn-comunicazioni-contatto"
    aria-label="Comunicazioni inviate"
    @click="emit('comunicazioni', row)"
  >
    <q-tooltip>Comunicazioni inviate</q-tooltip>
  </q-btn>
</template>

<script setup>
defineProps({
  row: { type: Object, required: true },
  showComms: { type: Boolean, default: true }
})

const emit = defineEmits(['edit', 'famiglie', 'referente', 'comunicazioni'])
</script>
