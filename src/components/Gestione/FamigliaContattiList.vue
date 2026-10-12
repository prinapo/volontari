<template>
  <div>
    <div class="text-caption text-grey-7 q-mb-sm">Contatti</div>
    <div v-if="loading && !contatti" class="text-center q-py-md">
      <q-spinner size="sm" /> Caricamento...
    </div>
    <div v-else-if="!contatti || contatti.length === 0" class="text-grey q-py-sm">
      Nessun contatto assegnato a questa famiglia.
    </div>

    <q-list v-if="contatti?.length" dense>
      <template v-for="(group, gi) in groups" :key="gi">
        <q-separator v-if="gi === 1 && group.list.length" class="q-my-sm" />
        <template v-for="c in group.list" :key="c.id + '-' + gi">
          <q-item dense class="q-px-none">
            <q-item-section>
              <q-item-label>
                {{ c.Contatto?.Nome || '' }} {{ c.Contatto?.Cognome || '' }}
                <q-badge :color="tipoBadgeColor(c.Ruolo_nella_Famiglia)" class="q-ml-sm">
                  {{ c.Ruolo_nella_Famiglia }}
                </q-badge>
              </q-item-label>
              <q-item-label caption>
                <template v-for="em in c._emails" :key="em.email_address">
                  <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" />
                  <ContactLink type="email" :value="em.email_address" />
                  <q-badge
                    v-if="em.Primary"
                    color="primary"
                    label="Primaria"
                    size="xs"
                    class="q-ml-xs q-mr-sm"
                  />
                </template>
                <template v-if="c.Contatto?.Numero_di_cellulare">
                  <span class="q-ml-sm">
                    <q-icon name="smartphone" size="xs" class="q-mr-xs text-grey-6" />
                    <ContactLink type="tel" :value="c.Contatto.Numero_di_cellulare" />
                  </span>
                </template>
                <template v-if="c.Contatto?.Numero_di_telefono">
                  <span class="q-ml-sm">
                    <q-icon name="phone" size="xs" class="q-mr-xs text-grey-6" />
                    <ContactLink type="tel" :value="c.Contatto.Numero_di_telefono" />
                  </span>
                </template>
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
flat
round
dense
icon="delete"
size="sm"
color="negative"
@click="$emit('remove', c)">
                <q-tooltip>Rimuovi contatto</q-tooltip>
              </q-btn>
            </q-item-section>
          </q-item>
        </template>
      </template>
    </q-list>

    <q-btn
flat
dense
icon="person_add"
color="primary"
label="Aggiungi contatto"
class="q-mt-sm"
@click="$emit('add')" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ContactLink from 'components/Common/ContactLink.vue'
import { tipoBadgeColor } from 'src/utils/badges'

const props = defineProps({
  contatti: { type: Array, default: undefined },
  loading: { type: Boolean, default: false }
})

defineEmits(['remove', 'add'])

const genitori = computed(() => (props.contatti || []).filter(c => c.Ruolo_nella_Famiglia === 'Genitore'))
const altri = computed(() => (props.contatti || []).filter(c => c.Ruolo_nella_Famiglia !== 'Genitore'))

const groups = computed(() => [
  { list: genitori.value },
  { list: altri.value }
])
</script>