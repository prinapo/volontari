<template>
  <q-table
    :rows="rows"
    :columns="columns"
    row-key="id"
    flat
    bordered
    hide-pagination
    :pagination="{ rowsPerPage: 0 }"
    class="bg-white q-mt-sm"
    :loading="loading"
    :grid="$q.screen.lt.sm"
    :dense="$q.screen.lt.md"
    :selection="selectable ? 'multiple' : undefined"
    :selected="selected"
    @update:selected="$emit('update:selected', $event)"
  >
    <template v-if="mode === 'download'" #top>
      <div class="full-width">
        <TableToolbar
          :search="searchModel"
          :search-placeholder="searchPlaceholder"
          :loading="loading"
          refresh
          @update:search="$emit('update:search', $event)"
          @refresh="$emit('refresh')"
        />
      </div>
    </template>

    <template #body-cell-data="sp">
      <q-td :props="sp">{{ formatDate(sp.row.DataCreazione) || '—' }}</q-td>
    </template>
    <template #body-cell-totale="sp">
      <q-td :props="sp">€{{ formatNumber(sp.row.Totale) }}</q-td>
    </template>
    <template v-if="mode === 'download'" #body-cell-azioni="sp">
      <q-td :props="sp">
        <q-btn
          flat
          round
          dense
          icon="download"
          color="primary"
          type="a"
          aria-label="Scarica Excel"
          :disable="!sp.row.File"
          :href="assetUrl(sp.row.File, true)"
          target="_blank"
        >
          <q-tooltip>Scarica Excel</q-tooltip>
        </q-btn>
      </q-td>
    </template>
    <template v-if="mode === 'check'" #body-cell-righe="sp">
      <q-td :props="sp">{{ sp.row.ConteggioRighe || 0 }}</q-td>
    </template>
    <template v-if="mode === 'check'" #body-cell-file="sp">
      <q-td :props="sp"><FileBadge :file-ok="sp.row.fileOk" /></q-td>
    </template>

    <template #item="sp">
      <div class="q-pa-xs col-12">
        <q-card flat bordered>
          <q-card-section>
            <template v-if="mode === 'download'">
              <div class="text-weight-medium">{{ sp.row.Nome || '—' }}</div>
              <div class="text-caption">{{ formatDate(sp.row.DataCreazione) }}</div>
              <div class="text-caption">Righe: {{ sp.row.ConteggioRighe || 0 }}</div>
              <div class="row items-center q-gutter-sm q-mt-sm">
                <span>€{{ formatNumber(sp.row.Totale) }}</span>
                <q-btn
                  flat
                  round
                  dense
                  icon="download"
                  color="primary"
                  size="sm"
                  type="a"
                  aria-label="Scarica Excel"
                  :disable="!sp.row.File"
                  :href="assetUrl(sp.row.File, true)"
                  target="_blank"
                >
                  <q-tooltip>Scarica Excel</q-tooltip>
                </q-btn>
              </div>
            </template>
            <template v-else>
              <div class="row items-center q-gutter-x-sm">
                <q-checkbox
                  :model-value="selected"
                  :val="sp.row"
                  dense
                  @update:model-value="$emit('update:selected', $event)"
                />
                <span class="text-weight-medium">{{ sp.row.Nome }}</span>
                <q-space />
                <FileBadge :file-ok="sp.row.fileOk" />
              </div>
              <div class="text-caption q-mt-xs">Data: {{ formatDate(sp.row.DataCreazione) || '—' }}</div>
              <div class="text-caption">
                Righe: {{ sp.row.ConteggioRighe || 0 }} · Totale: €{{ formatNumber(sp.row.Totale) }}
              </div>
            </template>
          </q-card-section>
        </q-card>
      </div>
    </template>
  </q-table>
</template>

<script setup>
import { computed } from 'vue'
import FileBadge from 'components/Admin/ListaFileBadge.vue'
import TableToolbar from 'components/TableToolbar.vue'
import { assetUrl } from 'src/utils/assets'
import { formatDate, formatNumber } from 'src/utils/formatters'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  mode: { type: String, default: 'download' }, // 'download' | 'check'
  selectable: { type: Boolean, default: false },
  selected: { type: Array, default: () => [] },
  searchModel: { type: String, default: undefined },
  searchPlaceholder: { type: String, default: 'Cerca lista...' }
})

defineEmits(['update:selected', 'update:search', 'refresh'])

const columns = computed(() => {
  const base = [
    { name: 'nome', label: 'Nome', field: 'Nome', sortable: true },
    { name: 'data', label: props.mode === 'check' ? 'Data' : 'Data creazione', field: 'DataCreazione' },
    { name: 'righe', label: 'Righe', field: 'ConteggioRighe', align: 'right' },
    { name: 'totale', label: 'Totale', field: 'Totale', align: 'right' }
  , 
    props.mode === 'check'
      ? { name: 'file', label: 'File', field: 'fileOk', align: 'center' }
      : { name: 'azioni', label: 'Azioni', field: 'id', align: 'center' }
  ]
  return base
})
</script>