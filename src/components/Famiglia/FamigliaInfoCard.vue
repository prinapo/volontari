<template>
  <q-card flat bordered>
    <q-card-section>
      <div class="text-h6">{{ famigliaName }}</div>

      <div v-if="genitori.length > 0" class="q-mt-md q-gutter-y-sm">
        <div class="text-caption text-grey text-uppercase">Genitori</div>
        <div v-for="g in genitori" :key="g.id_contatto" class="q-py-xs">
          <div class="text-body1">{{ g.Nome }} {{ g.Cognome }}</div>
          <div class="text-body2 text-grey">
            <template v-if="g.Email">
              <a :href="'mailto:' + g.Email" class="text-primary">{{ g.Email }}</a><br>
            </template>
            <template v-if="g.Numero_di_cellulare">
              <a :href="'tel:' + g.Numero_di_cellulare" class="text-primary">{{ g.Numero_di_cellulare }}</a>
            </template>
            <template v-if="g.Numero_di_telefono && g.Numero_di_cellulare"> · </template>
            <template v-if="g.Numero_di_telefono">
              <a :href="'tel:' + g.Numero_di_telefono" class="text-primary">{{ g.Numero_di_telefono }}</a>
            </template>
          </div>
        </div>
      </div>
    </q-card-section>

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
  </q-card>
</template>

<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { useFamiglieStore } from 'stores/famiglie.store'
import InlineEditableField from 'components/Common/InlineEditableField.vue'

const $q = useQuasar()
const famiglieStore = useFamiglieStore()

const genitori = computed(() => famiglieStore.genitori)

const props = defineProps({
  famigliaName: { type: String, default: '' },
  iban: { type: String, default: '' },
  intestatarioCC: { type: String, default: '' },
  saving: { type: Boolean, default: false }
})

async function handleIBANSave(newIBAN) {
  const ok = await famiglieStore.updateIBAN(newIBAN, famiglieStore.intestatarioCC)
  if (ok) {
    $q.notify({ type: 'positive', message: 'IBAN aggiornato' })
  } else {
    $q.notify({ type: 'negative', message: 'Errore aggiornamento IBAN' })
  }
}

async function handleIntestatarioSave(newIntestatario) {
  const ok = await famiglieStore.updateIBAN(famiglieStore.iban, newIntestatario)
  if (ok) {
    $q.notify({ type: 'positive', message: 'Intestatario aggiornato' })
  } else {
    $q.notify({ type: 'negative', message: 'Errore aggiornamento intestatario' })
  }
}
</script>
