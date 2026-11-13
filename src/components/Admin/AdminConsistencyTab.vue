<template>
  <div>
    <CheckVolontariSection />
    <q-separator class="q-my-md" />
    <CheckEmailPrimarieSection />
    <q-separator class="q-my-md" />
    <CheckEmailLoginSection />
    <q-separator class="q-my-md" />
    <CheckListePagamentiSection />
  </div>
</template>

<script setup>
import CheckEmailLoginSection from 'src/components/Admin/Check/CheckEmailLoginSection.vue'
import CheckEmailPrimarieSection from 'src/components/Admin/Check/CheckEmailPrimarieSection.vue'
import CheckListePagamentiSection from 'src/components/Admin/Check/CheckListePagamentiSection.vue'
import CheckVolontariSection from 'src/components/Admin/Check/CheckVolontariSection.vue'
</script>
