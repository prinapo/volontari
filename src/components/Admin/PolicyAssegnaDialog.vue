<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent maximized>
    <q-card class="policy-dialog-card">
      <q-card-section class="row items-center">
        <div class="col">
          <div class="text-h6">Policy — {{ role?.name }}</div>
          <div class="text-body2 text-grey-7">
            Seleziona le policy da assegnare a questo ruolo.
          </div>
        </div>
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section class="scroll" style="max-height: 60vh">
        <div v-if="!policies.length" class="text-center text-grey-5 q-py-lg">
          <q-icon name="warning" size="32px" />
          <div class="q-mt-sm">Nessuna policy disponibile.</div>
        </div>

        <q-list v-else bordered separator>
          <q-item
            v-for="policy in policies"
            :key="policy.id"
            tag="label"
            v-ripple
          >
            <q-item-section avatar>
              <q-checkbox
                :model-value="isSelected(policy.id)"
                @update:model-value="toggle(policy.id)"
                :disable="isPolicyOfAdmin(policy) && !canDeselectAdmin(policy.id)"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ policy.name }}</q-item-label>
              <q-item-label v-if="policy.description" caption>
                {{ policy.description }}
              </q-item-label>
            </q-item-section>
            <q-item-section v-if="isPolicyOfAdmin(policy)" side>
              <q-badge color="negative" outline>Admin</q-badge>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Annulla" v-close-popup />
        <q-btn
          color="primary"
          label="Salva"
          :loading="saving"
          :disable="saving"
          @click="handleSave"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  role: Object,
  policies: Array,
  saving: Boolean
})

const emit = defineEmits(['update:modelValue', 'save'])

const selectedIds = ref([])

const ADMIN_POLICY_NAMES = ['admin', 'administrator']

function isPolicyOfAdmin(policy) {
  return ADMIN_POLICY_NAMES.includes(policy?.name?.toLowerCase().trim())
}

function canDeselectAdmin(policyId) {
  return selectedIds.value.some(id => id !== policyId)
}

watch(() => props.role, (role) => {
  if (role) {
    selectedIds.value = (role.policies || [])
      .map(p => p.policy_id?.id)
      .filter(Boolean)
  }
}, { immediate: true })

function isSelected(id) {
  return selectedIds.value.includes(id)
}

function toggle(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx === -1) {
    selectedIds.value.push(id)
  } else {
    selectedIds.value.splice(idx, 1)
  }
}

function handleSave() {
  emit('save', [...selectedIds.value])
}
</script>

<style scoped>
.policy-dialog-card {
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
}
</style>
