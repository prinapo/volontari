<template>
  <q-page class="q-pa-md">
    <div v-if="!authStore.initialized" class="text-center q-mt-xl">
      <q-spinner size="lg" />
      <div class="q-mt-sm">
        Caricamento...
      </div>
    </div>

    <q-inner-loading :showing="loading && authStore.initialized" />

    <template v-if="authStore.initialized">
      <div class="q-gutter-y-md q-mx-auto">

        <!-- Selettore famiglia (sempre visibile se multi-famiglia, anche senza famiglia caricata) -->
        <q-select
          v-if="famiglieStore.famiglieContatti.length > 1"
          :model-value="famiglieStore.selectedFamigliaId"
          :options="famiglieStore.famigliaOptions"
          label="Seleziona famiglia"
          outlined
          dense
          emit-value
          map-options
          @update:model-value="handleFamigliaChange"
        />

        <!-- Famiglia caricata: mostra contenuto -->
        <template v-if="famiglieStore.famiglia">
          <FamigliaInfoCard
            :famiglia-name="famiglieStore.famigliaName"
            :iban="famiglieStore.iban"
            :intestatario-cc="famiglieStore.intestatarioCC"
            :saving="famiglieStore.saving"
          />

          <ProgettoSelector
            :model-value="famiglieStore.selectedProgettoId"
            :options="famiglieStore.progetti"
            @update:model-value="handleProjectChange"
          />

          <template v-if="famiglieStore.selectedProgettoId">
            <q-card flat bordered class="q-mb-md">
              <q-card-section class="row items-center q-gutter-x-lg q-gutter-y-sm">
                <div>
                  <div class="text-caption text-grey">
                    Totale Giustificativi
                  </div>
                  <div class="text-h6 text-primary">
                    {{ formatCurrency(totaleGiustificativi) }}
                  </div>
                </div>
                <div>
                  <div class="text-caption text-grey">
                    Totale Rimborsabile
                  </div>
                  <div class="text-h6 text-positive">
                    {{ formatCurrency(totaleRimborsabile) }}
                  </div>
                </div>
                <q-space />
                <div class="text-caption text-grey">
                  Il totale rimborsabile è l'80% dei giustificativi fino al valore allocato ({{ formatCurrency(allocato) }})
                </div>
              </q-card-section>
            </q-card>
          </template>

          <GiustificativoList
            :progetto-id="famiglieStore.selectedProgettoId"
            :famiglia-id="famiglieStore.famiglia?.id_famiglia"
            :anno-bando="famiglieStore.selectedProgetto?.AnnoBando"
          />
        </template>

        <!-- Multi-famiglia ma nessuna selezionata: invito a scegliere -->
        <div v-else-if="famiglieStore.famiglieContatti.length > 1" class="text-center text-grey q-mt-lg">
          <q-icon name="arrow_upward" size="lg" />
          <div class="q-mt-sm">Seleziona una famiglia per iniziare</div>
        </div>

        <!-- Nessuna famiglia e utente ha accesso a verifica -->
        <div v-else-if="!loading && authStore.canManager" class="text-center q-mt-xl">
          <q-icon name="fact_check" size="lg" color="primary" />
          <div class="q-mt-sm text-h6">
            Area verifica disponibile
          </div>
          <div class="q-mt-xs text-grey-7">
            Questo utente non e' collegato a famiglie come volontario.
          </div>
          <q-btn
            class="q-mt-md"
            color="primary"
            icon="fact_check"
            label="Vai a Verifica"
            to="/verifica"
          />
        </div>

        <!-- Nessuna famiglia e nessun accesso -->
        <div v-else-if="!loading" class="text-center text-grey q-mt-xl">
          <q-icon name="info" size="lg" />
          <div class="q-mt-sm">
            Nessun dato disponibile
          </div>
        </div>
      </div>
    </template>
  </q-page>
</template>

<script setup>
import { computed, watch } from 'vue'
import FamigliaInfoCard from 'components/Famiglia/FamigliaInfoCard.vue'
import ProgettoSelector from 'components/Famiglia/ProgettoSelector.vue'
import GiustificativoList from 'components/Giustificativi/GiustificativoList.vue'
import { formatCurrency } from 'src/utils/formatters'
import { useAuthStore } from 'stores/auth.store'
import { useFamiglieStore } from 'stores/famiglie.store'
import { useGiustificativiStore } from 'stores/giustificativi.store'

const authStore = useAuthStore()
const famiglieStore = useFamiglieStore()
const giustificativiStore = useGiustificativiStore()

const loading = computed(() => famiglieStore.loading)

const allocato = computed(() => {
  return Number.parseFloat(famiglieStore.selectedProgetto?.Allocato) || 0
})

const totaleGiustificativi = computed(() => {
  return giustificativiStore.items.reduce((sum, item) => sum + (Number.parseFloat(item.Importo) || 0), 0)
})

const totaleRimborsabile = computed(() => {
  const ottantaPct = totaleGiustificativi.value * 0.8
  return Math.min(ottantaPct, allocato.value)
})

watch(() => authStore.contattoId, (id) => {
  if (id) {
    famiglieStore.init(id)
  }
}, { immediate: true })

function handleFamigliaChange(famigliaId) {
  famiglieStore.selectFamiglia(famigliaId)
}

function handleProjectChange(progettoId) {
  famiglieStore.selectProgetto(progettoId)
}
</script>
