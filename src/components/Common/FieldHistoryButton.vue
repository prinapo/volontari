<template>
  <q-btn
    v-if="visible"
    flat
    round
    dense
    size="sm"
    icon="history"
    color="grey-6"
    aria-label="Cronologia modifiche"
    @click="openDialog"
  >
    <q-tooltip>Cronologia modifiche</q-tooltip>

    <q-dialog v-model="showDialog" persistent>
      <q-card class="bg-grey-1" :style="$q.screen.lt.sm ? 'max-width:100vw' : ''">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Cronologia — {{ label || field }}</div>
          <q-space />
          <q-btn
v-close-popup
icon="close"
flat
round
dense
aria-label="Chiudi">
            <q-tooltip>Chiudi</q-tooltip>
          </q-btn>
        </q-card-section>
        <q-separator />

        <q-card-section v-if="loading" class="text-center q-py-md">
          <q-spinner size="sm" /> Caricamento...
        </q-card-section>

        <q-card-section v-else-if="filtered.length === 0" class="text-center q-py-md">
          <div class="text-grey-7">Nessuna modifica registrata per questo campo.</div>
        </q-card-section>

        <template v-else>
          <q-card-section class="q-pt-sm">
            <q-card flat bordered>
              <q-card-section class="q-pa-sm">
                <div class="row items-center q-gutter-x-xs q-mb-xs">
                  <q-icon name="check_circle" color="positive" size="sm" />
                  <span class="text-weight-medium text-positive">Valore attuale</span>
                  <q-space />
                  <span class="text-caption text-grey-7">{{ formatDate(filtered[0].activity?.timestamp) }}</span>
                </div>
                <div class="text-body2 text-weight-medium q-my-xs">{{ getNewValue(filtered[0]) }}</div>
                <div v-if="filtered[0].activity?.user" class="text-caption text-grey">
                  {{ filtered[0].activity.user.first_name }} {{ filtered[0].activity.user.last_name }}
                  <span
v-if="filtered[0].activity.user.email"
class="text-grey-6"
                    >({{ filtered[0].activity.user.email }})</span
                  >
                </div>
              </q-card-section>
            </q-card>
          </q-card-section>

          <q-card-section v-if="filtered.length > 1" class="q-pt-sm q-pb-none">
            <div class="text-caption text-weight-medium text-grey-7 q-mb-sm">Modifiche precedenti</div>
            <q-card v-for="rev in filtered.slice(1)" :key="rev.id" flat bordered class="q-mb-sm">
              <q-card-section class="q-pa-sm">
                <div class="row items-center q-gutter-x-xs q-mb-xs">
                  <q-icon name="schedule" size="xs" class="text-grey-6" />
                  <span class="text-caption text-grey-7">{{ formatDate(rev.activity?.timestamp) }}</span>
                  <q-space />
                  <q-badge :color="badgeColor(rev.activity?.action)" outline>{{
                    actionLabel(rev.activity?.action)
                  }}</q-badge>
                </div>
                <div v-if="rev.activity?.user" class="text-caption text-grey q-mb-sm">
                  {{ rev.activity.user.first_name }} {{ rev.activity.user.last_name }}
                  <span v-if="rev.activity.user.email" class="text-grey-6">({{ rev.activity.user.email }})</span>
                </div>
                <div class="text-body2">{{ getNewValue(rev) }}</div>
                <div class="row justify-end q-mt-xs">
                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="restore"
                    color="primary"
                    aria-label="Ripristina questo valore"
                    @click="ripristina(rev)"
                  >
                    <q-tooltip>Ripristina questo valore</q-tooltip>
                  </q-btn>
                </div>
              </q-card-section>
            </q-card>
          </q-card-section>
        </template>

        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn
v-close-popup
flat
dense
size="sm"
label="Chiudi" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-btn>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, computed } from 'vue'
import { revisionsService } from 'src/services/revisions.service'
import { formatDate } from 'src/utils/formatters'

const $q = useQuasar()

const props = defineProps({
  collection: { type: String, required: true },
  itemId: { type: [String, Number], required: true },
  field: { type: String, required: true },
  label: { type: String, default: '' },
  revisions: { type: Array, default: null }
})

const emit = defineEmits(['ripristina'])

const showDialog = ref(false)
const localRevisions = ref([])
const loading = ref(false)

const allRevisions = computed(() => props.revisions || localRevisions.value)

const filtered = computed(() => revisionsService.filterByField(allRevisions.value, props.field))

const visible = computed(() => {
  if (props.revisions !== null) return props.revisions.length > 0
  return true
})

async function openDialog() {
  if (props.revisions === null && localRevisions.value.length === 0) {
    loading.value = true
    try {
      const data = await revisionsService.getRevisions(props.collection, props.itemId, 20)
      localRevisions.value = data
    } catch {
      localRevisions.value = []
    } finally {
      loading.value = false
    }
  }
  showDialog.value = true
}

function actionLabel(action) {
  if (action === 'create') return 'Creazione'
  if (action === 'update') return 'Modifica'
  if (action === 'delete') return 'Eliminazione'
  return action || ''
}

function badgeColor(action) {
  if (action === 'create') return 'positive'
  if (action === 'update') return 'primary'
  if (action === 'delete') return 'negative'
  return 'grey'
}

function getNewValue(rev) {
  if (!rev.delta) return '(vuoto)'
  return rev.delta[props.field] === undefined ? '(vuoto)' : String(rev.delta[props.field])
}

async function ripristina(rev) {
  const nuovoValore = getNewValue(rev)
  emit('ripristina', { field: props.field, value: nuovoValore })
  $q.notify({ type: 'positive', message: `Valore ripristinato: ${nuovoValore}`, timeout: 3000 })
  showDialog.value = false
}
</script>
