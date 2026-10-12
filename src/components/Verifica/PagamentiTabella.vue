<template>
  <q-table
    :rows="rows"
    :columns="columns"
    :row-key="rowKey"
    flat
    bordered
    class="bg-white"
    :loading="loading"
    :selection="selectable ? 'multiple' : undefined"
    :selected="selectable ? selected : undefined"
    :pagination="clientPagination || { rowsPerPage: 0 }"
    :hide-pagination="!clientPagination"
    :grid="$q.screen.lt.sm"
    :dense="$q.screen.lt.md"
    @update:selected="v => $emit('update:selected', v)"
    @request="r => $emit('request', r)"
  >
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps || {}" />
    </template>
  </q-table>
</template>

<script setup>
import { useQuasar } from 'quasar'

const $q = useQuasar()

defineProps({
  rows: { type: Array, default: () => [] },
  columns: { type: Array, required: true },
  rowKey: { type: String, default: 'id' },
  loading: { type: Boolean, default: false },
  selectable: { type: Boolean, default: false },
  selected: { type: Array, default: () => [] },
  clientPagination: { type: Object, default: null }
})

defineEmits(['update:selected', 'request'])
</script>