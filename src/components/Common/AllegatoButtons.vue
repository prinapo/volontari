<template>
  <span class="row items-center q-gutter-x-xs" :data-testid="testid">
    <template v-if="allegato">
      <span v-if="showFilename" class="text-caption text-grey-7 q-mr-xs q-my-none">
        {{ displayFilename }}
      </span>
      <q-btn
        :href="openUrl"
        target="_blank"
        type="a"
        flat
        dense
        round
        icon="open_in_new"
        :size="size"
        :color="color"
        :aria-label="openLabel"
      >
        <q-tooltip>{{ openTooltip || openLabel }}</q-tooltip>
      </q-btn>
      <q-btn
        v-if="showDownload"
        :href="downloadUrl"
        type="a"
        flat
        dense
        round
        icon="file_download"
        :size="size"
        :color="color"
        :aria-label="downloadLabel"
      >
        <q-tooltip>{{ downloadTooltip || downloadLabel }}</q-tooltip>
      </q-btn>
    </template>
    <span v-else class="text-grey-5">{{ emptyText }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { assetUrl } from 'src/utils/assets'

const props = defineProps({
  allegato: { type: [String, Number, Object], default: null },
  showDownload: { type: Boolean, default: true },
  showFilename: { type: Boolean, default: false },
  filename: { type: String, default: '' },
  size: { type: String, default: 'sm' },
  color: { type: String, default: undefined },
  emptyText: { type: String, default: '—' },
  openLabel: { type: String, default: 'Apri allegato' },
  openTooltip: { type: String, default: '' },
  downloadLabel: { type: String, default: 'Scarica allegato' },
  downloadTooltip: { type: String, default: '' },
  testid: { type: String, default: undefined }
})

const displayFilename = computed(() => {
  if (props.filename) return props.filename
  if (typeof props.allegato === 'object') return props.allegato?.filename_download || 'File'
  return 'File'
})

const openUrl = computed(() => assetUrl(props.allegato))
const downloadUrl = computed(() => assetUrl(props.allegato, true))
</script>