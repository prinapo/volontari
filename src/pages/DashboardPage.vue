<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-gutter-sm q-mb-md">
      <div class="text-h5">Dashboard</div>
      <q-space />
      <q-select
        v-model="store.selectedAnno"
        :options="annoOptions"
        label="Anno"
        dense
        outlined
        clearable
        class="dashboard-anno-select"
        emit-value
        map-options
      />
    </div>

    <q-banner v-if="store.error" class="bg-negative text-white q-mb-md" rounded>
      {{ store.error }}
    </q-banner>

    <q-inner-loading :showing="store.loading">
      <q-spinner size="40px" color="primary" />
      <div class="q-mt-sm text-body2 text-grey-7">Caricamento dati...</div>
    </q-inner-loading>

    <template v-if="metriche && !store.loading">
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-md-4">
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1">Progetti e Famiglie</div>
            </q-card-section>
            <q-card-section>
              <BaseChart :option="famiglieProgettiOption" :height="280" />
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-md-4">
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1">Stato pagamenti</div>
              <div class="text-caption text-grey-7">su allocato {{ formatCurrency(metriche.allocato) }}</div>
            </q-card-section>
            <q-card-section>
              <BaseChart :option="statoPagamentiOption" />
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-md-4">
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1">In pagamento e Pagato</div>
              <div class="text-caption text-grey-7">su allocato {{ formatCurrency(metriche.allocato) }}</div>
            </q-card-section>
            <q-card-section>
              <BaseChart :option="incorsoPagatoOption" />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row q-col-gutter-md">
        <div class="col-12">
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1">Progetti per stato e anno</div>
            </q-card-section>
            <q-card-section>
              <BaseChart :option="barOption" />
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-4">
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1">Progetti per ambito</div>
            </q-card-section>
            <q-card-section>
              <BaseChart :option="ambitoOption" />
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-md-4">
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1">Progetti per stato rendicontazione</div>
            </q-card-section>
            <q-card-section>
              <BaseChart :option="statiOption" />
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-md-4">
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1">Indice gravità disabilità</div>
            </q-card-section>
            <q-card-section>
              <BaseChart :option="gravitaOption" />
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12">
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1">Gruppi ISEE</div>
            </q-card-section>
            <q-card-section>
              <BaseChart :option="iseeOption" :height="340" />
            </q-card-section>
          </q-card>
        </div>
      </div>
    </template>
  </q-page>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import BaseChart from 'components/Dashboard/BaseChart.vue'
import { statoProgettoLabel } from 'src/utils/badges'
import { formatCurrency } from 'src/utils/formatters'
import { useDashboardStore } from 'stores/dashboard.store'

const store = useDashboardStore()

const annoOptions = computed(() => {
  const anni = store.anni.map(a => ({ label: String(a), value: a }))
  return [{ label: 'Tutti gli anni', value: null }, ...anni]
})

const metriche = computed(() => store.metriche)

const CHART_COLOR_VARS = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5', '--chart-6', '--chart-7', '--chart-8']
const CHART_COLOR_FALLBACK = ['#5070dd', '#f57901', '#b6d633', '#fac858', '#9a60b4', '#3ba272', '#ea7ccc', '#73c0de']

function readChartPalette() {
  const cs = getComputedStyle(document.documentElement)
  return CHART_COLOR_VARS.map((v, i) => cs.getPropertyValue(v).trim() || CHART_COLOR_FALLBACK[i])
}

const palette = readChartPalette()

const famiglieProgettiOption = computed(() => {
  const m = metriche.value
  if (!m) return {}
  return {
    tooltip: { trigger: 'item', formatter: p => `${p.name}: ${p.value}` },
    grid: { left: 100, right: 56, top: 16, bottom: 8 },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', data: ['Famiglie', 'Progetti'], axisLabel: { color: '#666666', fontSize: 12 } },
    series: [
      {
        type: 'bar',
        barWidth: 40,
        data: [
          { value: m.famiglie, name: 'Famiglie', itemStyle: { color: palette[2] } },
          { value: m.progetti, name: 'Progetti', itemStyle: { color: palette[0] } }
        ],
        label: { show: true, position: 'right', fontSize: 14, fontWeight: 600, formatter: p => p.value }
      }
    ]
  }
})

function radialBarOption(data) {
  return {
    tooltip: {
      formatter: p => `${p.data.name}: ${formatCurrency(p.data.importo)} (${p.data.value}% dell'allocato)`
    },
    angleAxis: { type: 'value', max: 100, startAngle: 90, axisLabel: { show: false }, splitLine: { show: false } },
    radiusAxis: { type: 'category', data: data.map(d => d.name), z: 10, axisLabel: { show: false } },
    polar: {},
    series: [
      {
        type: 'bar',
        coordinateSystem: 'polar',
        data: data.map(d => ({ value: d.value, name: d.name, importo: d.importo })),
        barWidth: 18,
        itemStyle: { color: params => data[params.dataIndex].color },
        label: {
          show: true,
          position: 'end',
          rotate: 0,
          formatter: p => `${p.value}%`,
          fontSize: 13,
          fontWeight: 600
        },
        labelLayout: { hideOverlap: true }
      }
    ]
  }
}

const statoPagamentiOption = computed(() => {
  const m = metriche.value
  if (!m) return {}
  return radialBarOption([
    { name: 'Allocato', value: 100, importo: m.allocato, color: palette[0] },
    { name: 'Rendicontato', value: store.pctRendicontato, importo: m.rendicontato, color: palette[1] },
    { name: 'Verificato', value: store.pctVerificato, importo: m.verificato, color: palette[2] },
    { name: 'Somma pagamenti', value: store.pctTotale, importo: store.sommaPagamenti, color: palette[3] }
  ])
})

const incorsoPagatoOption = computed(() => {
  const m = metriche.value
  if (!m) return {}
  return radialBarOption([
    { name: 'In pagamento', value: store.pctInPagamento, importo: m.inPagamento, color: palette[2] },
    { name: 'Pagato', value: store.pctPagato, importo: m.pagato, color: palette[3] }
  ])
})

const STATI_PROGETTO_ORDINE = ['proposto', 'validato', 'approvato', 'accettato', 'in_rendicontazione', 'rimborso_parziale', 'chiuso']
const STATI_PROGETTO_COLOR = {
  proposto: '#9E9E9E',
  validato: palette[3],
  approvato: palette[1],
  accettato: palette[0],
  in_rendicontazione: palette[2],
  rimborso_parziale: palette[4],
  chiuso: '#607D8B'
}

const barOption = computed(() => {
  const data = store.serieProgettiStatoProgetto
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 4, data: STATI_PROGETTO_ORDINE.map(s => statoProgettoLabel(s)) },
    grid: { left: 8, right: 40, top: 60, bottom: 24 },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: { type: 'category', data: data.map(d => d.anno) },
    series: STATI_PROGETTO_ORDINE.map(s => ({
      name: statoProgettoLabel(s),
      type: 'bar',
      stack: 'tot',
      barWidth: 70,
      itemStyle: { color: STATI_PROGETTO_COLOR[s] },
      data: data.map(d => d.stati[s] || 0)
    }))
  }
})


function donutOption(data) {
  return {
    tooltip: { trigger: 'item', confine: true },
    series: [
      {
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        label: { show: true, position: 'outside', formatter: '{b}', fontSize: 11 },
        labelLine: { show: true, length: 10, length2: 10 },
        data: data.map((d, i) => ({ ...d, itemStyle: { color: palette[i % palette.length] } }))
      }
    ]
  }
}

const ambitoOption = computed(() => donutOption(store.donutAmbito))
const statiOption = computed(() => donutOption(store.donutStati))
const gravitaOption = computed(() => donutOption(store.donutGravita))
const iseeOption = computed(() => {
  const data = store.iseeSerie
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 24, top: 24, bottom: 48 },
    xAxis: { type: 'category', data: data.map(d => d.bucket), axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: 'Progetti',
        type: 'bar',
        data: data.map(d => d.count),
        itemStyle: { color: palette[1] },
        barWidth: 40,
        label: { show: true, position: 'top', formatter: p => p.value, fontSize: 12, fontWeight: 600 }
      }
    ]
  }
})

onMounted(() => {
  store.fetchDashboard()
})
</script>

<style scoped>
.dashboard-card {
  border-radius: 12px;
}
.dashboard-anno-select {
  min-width: 160px;
}
</style>
