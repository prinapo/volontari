<template>
  <q-select
    :model-value="modelValue"
    :options="options"
    option-value="id_progetto"
    option-label="Cognome_e__Nome_Beneficiario"
    emit-value
    map-options
    filled
    color="primary"
    clearable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template v-slot:option="scope">
      <q-item v-bind="scope.itemProps">
        <q-item-section>
          <q-item-label>{{ scope.opt.AnnoBando }} — {{ scope.opt.Cognome_e__Nome_Beneficiario }} — {{ scope.opt.Eta }} anni</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-item-label caption>€{{ scope.opt.Allocato }}</q-item-label>
        </q-item-section>
      </q-item>
    </template>

    <template v-slot:selected-item="scope">
      <div class="q-gutter-xs row items-center">
        <q-item-label class="text-primary text-weight-medium bg-green-1 q-pa-xs rounded-borders">
          {{ scope.opt.AnnoBando }} — {{ scope.opt.Cognome_e__Nome_Beneficiario }} — {{ scope.opt.Eta }} anni
        </q-item-label>
        <q-item-label caption class="text-grey-7 q-ml-xs">
          €{{ scope.opt.Allocato }}
        </q-item-label>
      </div>
    </template>
  </q-select>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] }
})

defineEmits(['update:modelValue'])
</script>
