<template>
  <div class="q-pa-xs col-12 col-sm-6">
    <q-expansion-item dense dense-toggle expand-separator header-class="expansion-header">
      <template #header>
        <q-item-section>
          <q-item-label>{{ displayFullName(row, 'nome_cognome') || '—' }}</q-item-label>
          <q-item-label caption>
            <q-badge v-if="row.IsReferente" color="primary" class="q-mr-xs">Referente</q-badge>
            <q-badge v-for="tipo in computedTipi(row)" :key="tipo" :color="tipoBadgeColor(tipo)" class="q-mr-xs">
              {{ tipo }}
            </q-badge>
            <q-badge :color="row.user_id?.status === 'suspended' ? 'negative' : 'positive'">
              {{ row.user_id?.status === 'suspended' ? 'Disattivato' : 'Attivo' }}
            </q-badge>
          </q-item-label>
        </q-item-section>
      </template>
      <q-card flat bordered>
        <q-card-section class="q-pa-sm">
          <q-separator class="q-mb-sm" />
          <div class="row q-col-gutter-sm">
            <div class="col-12">
              <div class="text-caption text-grey-7">Email</div>
              <div class="row items-center q-gutter-x-xs">
                <template v-if="row.user_id?.email">
                  <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" />
                  <ContactLink type="email" :value="row.user_id.email" />
                  <q-badge color="primary" label="Primaria" size="xs" class="q-ml-xs" />
                </template>
                <template v-else-if="row._emails?.length">
                  <div v-for="(em, idx) in row._emails" :key="idx" class="text-caption q-py-xs">
                    <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" />
                    <ContactLink type="email" :value="em.email_address" />
                    <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs" />
                  </div>
                </template>
                <span v-else class="text-grey-5">—</span>
              </div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-7">Cellulare</div>
              <div class="row items-center q-gutter-x-xs">
                <ContactLink v-if="row.Numero_di_cellulare" type="tel" :value="row.Numero_di_cellulare" /><span
                  v-else
                  class="text-grey-5"
                  >—</span
                >
                <FieldHistoryButton
                  collection="contatti"
                  :item-id="row.id_contatto"
                  field="Numero_di_cellulare"
                  label="Cellulare"
                  :revisions="revisioni?.['Numero_di_cellulare'] || []"
                />
              </div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-7">Telefono</div>
              <div class="row items-center q-gutter-x-xs">
                <ContactLink v-if="row.Numero_di_telefono" type="tel" :value="row.Numero_di_telefono" /><span
                  v-else
                  class="text-grey-5"
                  >—</span
                >
                <FieldHistoryButton
                  collection="contatti"
                  :item-id="row.id_contatto"
                  field="Numero_di_telefono"
                  label="Telefono"
                  :revisions="revisioni?.['Numero_di_telefono'] || []"
                />
              </div>
            </div>
            <div class="col-12">
              <div class="text-caption text-grey-7">Famiglie</div>
              <q-btn
                v-if="famiglieCount"
                flat
                dense
                no-caps
                :label="String(famiglieCount)"
                color="primary"
                size="sm"
                @click="emit('famiglie', row)"
              />
              <span v-else class="text-grey-5">0</span>
            </div>
          </div>
        </q-card-section>
        <q-card-actions class="q-pa-sm q-gutter-xs">
          <ContattoAzioni
            :row="row"
            :show-comms="false"
            @edit="emit('edit', row)"
            @famiglie="emit('famiglie', row)"
            @referente="emit('referente', row)"
          />
        </q-card-actions>

        <q-expansion-item
          icon="mail"
          label="Comunicazioni inviate"
          dense
          group="comunicazioni-contatti"
          @show="showComms = true"
          @hide="showComms = false"
        >
          <q-card-section v-if="showComms">
            <StoricoComunicazioni :contatto-id="row.id_contatto" />
          </q-card-section>
        </q-expansion-item>
      </q-card>
    </q-expansion-item>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ContactLink from 'components/Common/ContactLink.vue'
import FieldHistoryButton from 'components/Common/FieldHistoryButton.vue'
import StoricoComunicazioni from 'src/components/Comunicazioni/StoricoComunicazioni.vue'
import { tipoBadgeColor } from 'src/utils/badges'
import { computedTipi } from 'src/utils/contatti'
import { displayFullName } from 'src/utils/formatters'
import ContattoAzioni from './ContattoAzioni.vue'

defineProps({
  row: { type: Object, required: true },
  revisioni: { type: Object, default: null },
  famiglieCount: { type: Number, default: 0 }
})

const emit = defineEmits(['edit', 'famiglie', 'referente'])

const showComms = ref(false)
</script>
