<template>
  <q-page class="q-pa-md">
    <div class="text-h6 q-mb-md">Comunicazioni</div>

    <q-stepper
v-model="step"
vertical
animated
color="primary"
flat
bordered>
      <q-step :name="1" title="Destinatari" icon="group" :done="step > 1">
        <q-option-group v-model="store.audience" :options="audienceOptions" color="primary" inline @update:model-value="onAudienceChange" />
        <q-stepper-navigation>
          <q-btn color="primary" label="Continua" @click="step = 2" />
        </q-stepper-navigation>
      </q-step>

      <q-step :name="2" title="Filtri" icon="filter_alt" :done="step > 2">
        <div v-if="store.audience !== 'contatto'" class="q-mb-md" style="max-width: 320px">
          <q-input v-model="store.filters.cognome" label="Cognome contiene" outlined dense clearable />
        </div>

        <template v-if="store.audience === 'contatti'">
          <div class="text-subtitle2 q-mb-sm">Ruolo contatto</div>
          <q-option-group v-model="store.filters.ruoli" :options="ruoliContattiOptions" type="checkbox" color="primary" inline />
        </template>

        <template v-else-if="store.audience === 'famiglie'">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <div class="text-subtitle2 q-mb-sm">Ruolo nella famiglia</div>
              <q-option-group v-model="store.filters.ruoli" :options="ruoliFamigliaOptions" type="checkbox" color="primary" inline />
            </div>
            <div class="col-12 col-md-6">
              <q-select
                v-model="store.filters.statoProgetto"
                :options="statiProgettoOptions"
                label="Stato progetto"
                multiple
                use-chips
                outlined
                dense
                emit-value
                map-options
                clearable
              />
              <q-input
v-model.number="store.filters.annoBando"
type="number"
label="Anno bando"
outlined
dense
class="q-mt-sm"
clearable />
            </div>
            <div class="col-12 col-md-6">
              <q-select
                v-model="store.filters.giustificativi"
                :options="giustificativiOptions"
                label="Giustificativi"
                outlined
                dense
                emit-value
                map-options
                clearable
              />
              <q-select
                v-model="store.filters.pagamenti"
                :options="pagamentiOptions"
                label="Pagamenti"
                multiple
                use-chips
                outlined
                dense
                emit-value
                map-options
                clearable
                class="q-mt-sm"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-select
                v-model="store.filters.referenteId"
                :options="referenti"
                label="Referente"
                option-label="label"
                option-value="value"
                outlined
                dense
                emit-value
                map-options
                clearable
              />
              <q-toggle v-model="store.filters.senzaVolontario" label="Solo famiglie senza volontario associato" class="q-mt-sm" />
            </div>
          </div>
        </template>

        <template v-else>
          <q-select
            v-model="store.filters.contattoId"
            :options="contattiOptions"
            label="Cerca contatto"
            option-label="label"
            option-value="value"
            outlined
            dense
            use-input
            emit-value
            map-options
            input-debounce="300"
            @filter="filterContatti"
          />
        </template>

        <q-stepper-navigation>
          <q-btn flat label="Indietro" @click="step = 1" />
          <q-btn color="primary" label="Continua" @click="step = 3" />
        </q-stepper-navigation>
      </q-step>

      <q-step :name="3" title="Componi" icon="edit_note" :done="step > 3">
        <q-input
v-model="store.oggetto"
label="Oggetto *"
outlined
dense
maxlength="150"
counter />
        <q-input
          v-model="store.corpo"
          label="Corpo *"
          type="textarea"
          autogrow
          outlined
          class="q-mt-sm"
          hint="Segnaposto: {nome}, {cognome}, {famiglia}, {email}"
        />
        <q-input v-model="store.link" label="Link allegato (opzionale)" outlined dense class="q-mt-sm" />
        <q-stepper-navigation>
          <q-btn flat label="Indietro" @click="step = 2" />
          <q-btn color="primary" label="Continua" :disable="!store.oggetto || !store.corpo" @click="step = 4" />
        </q-stepper-navigation>
      </q-step>

      <q-step :name="4" title="Anteprima" icon="preview" :done="step > 4">
        <q-btn color="secondary" label="Calcola destinatari" :loading="store.loading" @click="calcolaDestinatari" />
        <div v-if="store.preview.count >= 0" class="q-mt-md">
          <q-banner dense class="bg-blue-1 text-primary q-mb-md">Destinatari trovati: <strong>{{ store.preview.count }}</strong></q-banner>
          <q-table
            v-if="store.preview.sample.length > 0"
            :rows="store.preview.sample"
            :columns="sampleColumns"
            row-key="email"
            dense
            flat
            bordered
            hide-bottom
          />
        </div>
        <q-stepper-navigation>
          <q-btn flat label="Indietro" @click="step = 3" />
          <q-btn
            color="positive"
            label="Invia"
            :loading="store.sending"
            :disable="store.preview.count === 0"
            @click="invia"
          />
        </q-stepper-navigation>
      </q-step>

      <q-step :name="5" title="Esito" icon="check_circle">
        <q-banner v-if="store.esito" dense class="bg-green-1 text-positive">
          Inviati: <strong>{{ store.esito.inviati }}</strong> · Falliti: <strong>{{ store.esito.falliti }}</strong> ·
          Totale: <strong>{{ store.esito.totale }}</strong>
        </q-banner>
        <q-list v-if="store.esito && store.esito.errori.length > 0" dense class="q-mt-md">
          <q-item v-for="errore in store.esito.errori" :key="errore.email">
            <q-item-section>
              <q-item-label>{{ errore.email }}</q-item-label>
              <q-item-label caption>{{ errore.message }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
        <q-stepper-navigation>
          <q-btn color="primary" label="Nuova comunicazione" @click="nuovaComunicazione" />
        </q-stepper-navigation>
      </q-step>
    </q-stepper>
  </q-page>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { onMounted, ref } from 'vue'
import { comunicazioniService } from 'src/services/comunicazioni.service'
import { contattiService } from 'src/services/contatti.service'
import { STATO_PROGETTO } from 'src/utils/constants'
import {
  GIUSTIFICATIVI_SELEZIONABILI,
  RUOLI_CANALE_CONTATTI,
  RUOLI_FAMIGLIA,
  STATI_PAGAMENTO_SELEZIONABILI
} from 'src/utils/filtriComunicazioni'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { useComunicazioniStore } from 'stores/comunicazioni.store'

const $q = useQuasar()
const store = useComunicazioniStore()
const step = ref(1)
const contattiOptions = ref([])
const referenti = ref([])

const audienceOptions = [
  { label: 'Volontari', value: 'contatti' },
  { label: 'Famiglie', value: 'famiglie' },
  { label: 'Contatto singolo', value: 'contatto' }
]

const ruoliContattiOptions = RUOLI_CANALE_CONTATTI.map(ruolo => ({ label: ruolo.value, value: ruolo.value }))
const ruoliFamigliaOptions = RUOLI_FAMIGLIA.map(ruolo => ({ label: ruolo, value: ruolo }))

const statiProgettoOptions = [
  STATO_PROGETTO.ACCETTATO,
  STATO_PROGETTO.IN_RENDICONTAZIONE,
  STATO_PROGETTO.RIMBORSO_PARZIALE,
  STATO_PROGETTO.CHIUSO
].map(stato => ({ label: stato, value: stato }))

const giustificativiOptions = GIUSTIFICATIVI_SELEZIONABILI.map(valore => ({ label: valore, value: valore }))
const pagamentiOptions = STATI_PAGAMENTO_SELEZIONABILI.map(valore => ({ label: valore, value: valore }))

const sampleColumns = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left' },
  { name: 'cognome', label: 'Cognome', field: 'cognome', align: 'left' },
  { name: 'email', label: 'Email', field: 'email', align: 'left' },
  { name: 'famiglia', label: 'Famiglia', field: 'famiglia', align: 'left' }
]

function onAudienceChange() {
  step.value = 2
}

async function filterContatti(input, update) {
  try {
    const res = input ? await contattiService.search(input) : { data: { data: [] } }
    const rows = res.data.data || []
    update(rows.map(row => ({ label: `${row.Nome || ''} ${row.Cognome || ''}`.trim(), value: row.id_contatto })))
  } catch {
    update([])
  }
}

async function caricaReferenti() {
  try {
    const res = await comunicazioniService.getFamiglieContatti({
      filter: { Ruolo_nella_Famiglia: { _eq: 'Referente' } },
      fields: 'Contatto.id_contatto,Contatto.Nome,Contatto.Cognome',
      limit: -1
    })
    const map = new Map()
    for (const link of res.data.data || []) {
      const contatto = link.Contatto
      if (contatto?.id_contatto && !map.has(contatto.id_contatto)) {
        map.set(contatto.id_contatto, {
          label: `${contatto.Nome || ''} ${contatto.Cognome || ''}`.trim(),
          value: contatto.id_contatto
        })
      }
    }
    referenti.value = [...map.values()]
  } catch {
    referenti.value = []
  }
}

async function calcolaDestinatari() {
  try {
    await store.anteprimaDestinatari()
  } catch (error) {
    notifyError($q, error, 'Errore nel calcolo dei destinatari')
  }
}

async function invia() {
  try {
    await store.invia()
    notifySuccess($q, `Comunicazione inviata a ${store.esito?.inviati ?? 0} destinatari`)
    step.value = 5
  } catch (error) {
    notifyError($q, error, "Errore nell'invio della comunicazione")
  }
}

function nuovaComunicazione() {
  store.reset()
  step.value = 1
}

onMounted(caricaReferenti)
</script>
