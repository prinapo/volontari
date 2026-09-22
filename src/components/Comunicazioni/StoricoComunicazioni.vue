<template>
  <div>
    <div class="row items-center q-mb-sm">
      <div class="text-subtitle2">Comunicazioni inviate</div>
      <q-space />
      <q-btn
dense
flat
color="primary"
icon="mail"
label="Invia email"
@click="dialogOpen = true" />
    </div>

    <q-inner-loading :showing="store.storico.loading" />
    <div v-if="!store.storico.loading && store.storico.data.length === 0" class="text-caption text-grey">
      Nessuna comunicazione
    </div>
    <q-list v-else dense separator>
      <q-item v-for="item in store.storico.data" :key="item.id">
        <q-item-section>
          <q-item-label>{{ item.Comunicazione?.Oggetto || '(senza oggetto)' }}</q-item-label>
          <q-item-label caption>
            {{ formatDate(item.Comunicazione?.DataInvio) }} · {{ item.Esito }}
            <span v-if="item.Errore"> · {{ item.Errore }}</span>
          </q-item-label>
        </q-item-section>
      </q-item>
    </q-list>

    <InviaEmailDialog v-model="dialogOpen" :contatto-id="contattoId" :famiglia-id="famigliaId" @sent="reload" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import InviaEmailDialog from 'src/components/Comunicazioni/InviaEmailDialog.vue'
import { useComunicazioniStore } from 'stores/comunicazioni.store'

const props = defineProps({
  contattoId: { type: [Number, String], default: null },
  famigliaId: { type: [Number, String], default: null }
})

const store = useComunicazioniStore()
const dialogOpen = ref(false)

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('it-IT')
}

async function reload() {
  if (props.contattoId) await store.fetchStoricoContatto(props.contattoId).catch(() => {})
  else if (props.famigliaId) await store.fetchStoricoFamiglia(props.famigliaId).catch(() => {})
}

onMounted(reload)
</script>
