<template>
  <q-card flat bordered>
    <q-card-section>
      <div class="text-h6">
        {{ famigliaName }}
      </div>

      <div v-if="genitori.length > 0" class="q-mt-md q-gutter-y-sm">
        <div class="text-caption text-grey text-uppercase">
          Genitori
        </div>
        <div v-for="g in genitori" :key="g.id_contatto" class="q-py-xs">
          <div class="text-body1">
            {{ g.Nome }} {{ g.Cognome }}
          </div>
          <div class="text-body2 text-grey">
            <div v-for="em in g._emails" :key="em.email_address" class="q-py-xs">
              <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" />
              <a :href="'mailto:'+em.email_address" class="text-primary text-caption">{{ em.email_address }}</a>
              <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs q-mr-sm" />
            </div>
            <template v-if="g.Numero_di_cellulare">
              <q-icon name="smartphone" size="xs" class="q-mr-xs text-grey-6" />
              <a :href="'tel:' + g.Numero_di_cellulare" class="text-primary text-caption q-mr-sm">{{ g.Numero_di_cellulare }}</a>
            </template>
            <template v-if="g.Numero_di_telefono">
              <q-icon name="phone" size="xs" class="q-mr-xs text-grey-6" />
              <a :href="'tel:' + g.Numero_di_telefono" class="text-primary text-caption">{{ g.Numero_di_telefono }}</a>
            </template>
          </div>
        </div>
      </div>

      <div v-if="altriVolontari.length > 0" class="q-mt-md q-gutter-y-sm">
        <div class="text-caption text-grey text-uppercase">
          Altri volontari
        </div>
        <div v-for="v in altriVolontari" :key="v.id_contatto" class="q-py-xs">
          <div class="text-body1">
            {{ v.Nome }} {{ v.Cognome }}
          </div>
          <div class="text-body2 text-grey">
            <div v-for="em in v._emails" :key="em.email_address" class="q-py-xs">
              <q-icon name="email" size="xs" class="q-mr-xs text-grey-6" />
              <a :href="'mailto:'+em.email_address" class="text-primary text-caption">{{ em.email_address }}</a>
              <q-badge v-if="em.Primary" color="primary" label="Primaria" size="xs" class="q-ml-xs q-mr-sm" />
            </div>
            <template v-if="v.Numero_di_cellulare">
              <q-icon name="smartphone" size="xs" class="q-mr-xs text-grey-6" />
              <a :href="'tel:' + v.Numero_di_cellulare" class="text-primary text-caption q-mr-sm">{{ v.Numero_di_cellulare }}</a>
            </template>
            <template v-if="v.Numero_di_telefono">
              <q-icon name="phone" size="xs" class="q-mr-xs text-grey-6" />
              <a :href="'tel:' + v.Numero_di_telefono" class="text-primary text-caption">{{ v.Numero_di_telefono }}</a>
            </template>
            <template v-if="v._referenti?.length">
              <div v-for="ref in v._referenti" :key="ref.id_contatto" class="q-py-xs">
                <q-icon name="person" size="xs" class="q-mr-xs text-grey-6" />
                <span class="text-caption text-secondary">Referente: {{ ref.Nome }} {{ ref.Cognome }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <q-separator />

      <q-expansion-item
        icon="account_balance"
        label="Dati bancari"
        header-class="text-body2 text-weight-medium"
        :content-inset-level="0.5"
      >
        <q-card-section class="q-gutter-y-sm">
          <InlineEditableField
            :model-value="famiglieStore.iban"
            label="IBAN"
            :readonly="props.saving"
            :rules="[val => !val || /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/i.test(val) || 'IBAN non valido']"
            @save="handleIBANSave"
          />
          <InlineEditableField
            :model-value="famiglieStore.intestatarioCC"
            label="Intestatario CC"
            :readonly="props.saving"
            @save="handleIntestatarioSave"
          />
        </q-card-section>
      </q-expansion-item>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { computed } from 'vue'
import InlineEditableField from 'components/Common/InlineEditableField.vue'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { useFamiglieStore } from 'stores/famiglie.store'

const $q = useQuasar()
const famiglieStore = useFamiglieStore()

const genitori = computed(() => famiglieStore.genitori)
const altriVolontari = computed(() => famiglieStore.altriVolontari)

const props = defineProps({
  famigliaName: { type: String, default: '' },
  iban: { type: String, default: '' },
  intestatarioCC: { type: String, default: '' },
  saving: { type: Boolean, default: false }
})

async function handleIBANSave(newIBAN) {
  const ok = await famiglieStore.updateIBAN(newIBAN, famiglieStore.intestatarioCC)
  if (ok) {
    notifySuccess($q, 'IBAN aggiornato')
  } else {
    notifyError($q, famiglieStore.error || 'Errore aggiornamento IBAN')
  }
}

async function handleIntestatarioSave(newIntestatario) {
  const ok = await famiglieStore.updateIBAN(famiglieStore.iban, newIntestatario)
  if (ok) {
    notifySuccess($q, 'Intestatario aggiornato')
  } else {
    notifyError($q, famiglieStore.error || 'Errore aggiornamento intestatario')
  }
}
</script>
