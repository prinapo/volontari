<template>
  <span class="contatto-info-line">
    <span v-if="contact" class="text-body2">
      {{ contact.Nome || '' }} {{ contact.Cognome || '' }}
    </span>
    <template v-for="em in emails" :key="em.email_address">
      <q-icon name="email" size="xs" class="q-ml-sm q-mr-xs text-grey-6" />
      <a :href="'mailto:'+em.email_address" class="text-primary text-caption">{{ em.email_address }}</a>
      <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs q-mr-xs" />
    </template>
    <template v-if="contact?.Numero_di_cellulare">
      <q-icon name="smartphone" size="xs" class="q-ml-sm q-mr-xs text-grey-6" />
      <a :href="'tel:'+contact.Numero_di_cellulare" class="text-primary text-caption">{{ contact.Numero_di_cellulare }}</a>
    </template>
    <template v-if="contact?.Numero_di_telefono">
      <q-icon name="phone" size="xs" class="q-ml-sm q-mr-xs text-grey-6" />
      <a :href="'tel:'+contact.Numero_di_telefono" class="text-primary text-caption">{{ contact.Numero_di_telefono }}</a>
    </template>
  </span>
</template>

<script setup>
defineProps({
  contact: { type: Object, default: null },
  emails: { type: Array, default: () => [] }
})
</script>
