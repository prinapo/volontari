<template>
  <q-select
    :model-value="modelValue"
    :options="mappedOptions"
    option-value="id_progetto"
    option-label="label"
    emit-value
    map-options
    outlined
    dense
    color="primary"
    clearable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #option="scope">
      <q-item v-bind="scope.itemProps">
        <q-item-section>
          <q-item-label
            >{{ scope.opt.AnnoBando }} —
            {{ [scope.opt.Cognome_Beneficiario, scope.opt.Nome_Beneficiario].filter(Boolean).join(' ') }} —
            {{ scope.opt.Eta }} anni</q-item-label
          >
        </q-item-section>
        <q-item-section side>
          <q-item-label caption> €{{ scope.opt.Allocato }} </q-item-label>
        </q-item-section>
      </q-item>
    </template>

    <template #selected-item="scope">
      <div class="q-gutter-xs row items-center bg-green-1 rounded-borders q-pa-xs">
        <q-item-label class="text-primary text-weight-medium">
          {{ scope.opt.AnnoBando }} —
          {{ [scope.opt.Cognome_Beneficiario, scope.opt.Nome_Beneficiario].filter(Boolean).join(' ') }} —
          {{ scope.opt.Eta }} anni
        </q-item-label>
        <q-item-label caption class="text-grey-7 q-ml-xs"> €{{ scope.opt.Allocato }} </q-item-label>
      </div>
    </template>
  </q-select>
</template>

<script setup>
  import { computed } from 'vue'

  const props = defineProps({
    modelValue: { type: String, default: '' },
    options: { type: Array, default: () => [] }
  })

  defineEmits(['update:modelValue'])

  const mappedOptions = computed(() =>
    props.options.map(opt => ({
      ...opt,
      label: [opt.Cognome_Beneficiario, opt.Nome_Beneficiario].filter(Boolean).join(' ')
    }))
  )
</script>
