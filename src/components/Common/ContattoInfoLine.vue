<template>
  <span class="contatto-info-line">
    <span v-if="contact" class="text-body2">
      {{ contact.Nome || '' }} {{ contact.Cognome || '' }}
    </span>
    <template v-for="em in emails" :key="em.email_address">
      <q-icon name="email" size="xs" class="q-ml-sm q-mr-xs text-grey-6" />
      <span class="text-caption text-grey-7">{{ em.email_address }}</span>
      <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs q-mr-xs" />
    </template>
    <template v-if="contact?.Numero_di_cellulare">
      <q-icon name="smartphone" size="xs" class="q-ml-sm q-mr-xs text-grey-6" />
      <span class="text-caption text-grey-7">{{ contact.Numero_di_cellulare }}</span>
    </template>
    <template v-if="contact?.Numero_di_telefono">
      <q-icon name="phone" size="xs" class="q-ml-sm q-mr-xs text-grey-6" />
      <span class="text-caption text-grey-7">{{ contact.Numero_di_telefono }}</span>
    </template>
  </span>
</template>

<script setup>
defineProps({
  contact: { type: Object, default: null },
  emails: { type: Array, default: () => [] }
})
</script>
