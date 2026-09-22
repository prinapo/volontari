<template>
  <template v-if="value">
    <q-btn
      v-if="isInternalMail"
      flat
      dense
      no-caps
      size="sm"
      color="primary"
      class="text-caption q-pa-none"
      :label="value"
      @click="dialogOpen = true"
    />
    <q-btn
      v-else
      flat
      dense
      no-caps
      size="sm"
      color="primary"
      class="text-caption q-pa-none"
      :href="href"
      :label="value"
    />
    <InviaEmailDialog v-if="isInternalMail" v-model="dialogOpen" :email="value" />
  </template>
</template>

<script setup>
import { computed, ref } from 'vue'
import InviaEmailDialog from 'src/components/Comunicazioni/InviaEmailDialog.vue'
import { useAuthStore } from 'stores/auth.store'

const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: v => ['email', 'tel'].includes(v)
  },
  value: {
    type: String,
    default: null
  }
})

const authStore = useAuthStore()
const dialogOpen = ref(false)

const href = computed(() => (props.type === 'email' ? `mailto:${props.value}` : `tel:${props.value}`))

// Il volontario scrive dalla propria casella (mailto); admin/manager usano il
// mailer interno, che logga la comunicazione.
const isInternalMail = computed(() => props.type === 'email' && authStore.canManager)
</script>
