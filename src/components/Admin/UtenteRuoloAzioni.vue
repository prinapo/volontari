<template>
  <div class="row items-center q-gutter-xs no-wrap">
    <q-select
      :model-value="row.role?.id"
      :options="roleOptions"
      option-value="id"
      option-label="name"
      dense
      options-dense
      outlined
      emit-value
      map-options
      class="admin-role-select"
      :class="selectClass"
      :loading="saving"
      @update:model-value="val => $emit('role-change', val)"
    >
      <template #selected-item="opt">
        <div class="text-caption">{{ opt.opt.name }}</div>
      </template>
    </q-select>
    <q-btn
      flat
      round
      dense
      icon="theater_comedy"
      color="grey-6"
      size="sm"
      aria-label="Impersona utente"
      @click="$emit('impersona', row.id)"
    >
      <q-tooltip>Impersona {{ row.first_name || row.email }}</q-tooltip>
    </q-btn>
    <q-btn
      flat
      round
      dense
      icon="lock_reset"
      color="grey-6"
      size="sm"
      aria-label="Reset password"
      @click="$emit('reset', row)"
    >
      <q-tooltip>Reset password</q-tooltip>
    </q-btn>
  </div>
</template>

<script setup>
defineProps({
  row: { type: Object, required: true },
  roleOptions: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
  selectClass: { type: [String, Array, Object], default: '' }
})

defineEmits(['role-change', 'impersona', 'reset'])
</script>