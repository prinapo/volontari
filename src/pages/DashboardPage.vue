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
        <div v-for="card in metricCards" :key="card.label" class="col-6 col-sm-4 col-md-3">
          <q-card flat bordered class="dashboard-card">
            <q-card-section>
              <div class="text-caption text-grey-7">{{ card.label }}</div>
              <div class="text-h5 q-mt-xs">{{ card.value }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row q-col-gutter-md">
        <div class="col-12 col-lg-7">
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1">Avanzamento per anno (€)</div>
            </q-card-section>
            <q-card-section>
              <BaseChart :option="barOption" />
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-lg-5">
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1">% allocato erogato</div>
            </q-card-section>
            <q-card-section>
              <BaseChart :option="gaugeOption" />
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
              <div class="text-subtitle1">Importi pagamenti per stato</div>
            </q-card-section>
            <q-card-section>
              <BaseChart :option="pagamentiOption" />
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
import { formatCurrency } from 'src/utils/formatters'
import { useDashboardStore } from 'stores/dashboard.store'

const store = useDashboardStore()

const annoOptions = computed(() => {
  const anni = store.anni.map(a => ({ label: String(a), value: a }))
  return [{ label: 'Tutti gli anni', value: null }, ...anni]
})

const metriche = computed(() => store.metriche)

const metricCards = computed(() => {
  const m = metriche.value
  if (!m) return []
  const pct = m.allocato ? Math.round(((m.proposto + m.inPagamento + m.pagato) / m.allocato) * 100) : 0
  return [
    { label: 'Progetti', value: String(m.progetti) },
    { label: 'Famiglie', value: String(m.famiglie) },
    { label: 'Allocato', value: formatCurrency(m.allocato) },
    { label: 'Rendicontato', value: formatCurrency(m.rendicontato) },
    { label: 'Verificato', value: formatCurrency(m.verificato) },
    { label: 'Pagato', value: formatCurrency(m.pagato) },
    { label: 'Residuo', value: formatCurrency(m.residuo) },
    { label: 'Allocato erogato', value: `${pct}%` }
  ]
})

const barOption = computed(() => {
  const data = store.barProgressi
  return {
    tooltip: { trigger: 'axis', valueFormatter: v => formatCurrency(v) },
    legend: { bottom: 0 },
    grid: { left: 60, right: 16, top: 24, bottom: 48 },
    xAxis: { type: 'category', data: data.map(d => d.anno) },
    yAxis: { type: 'value', axisLabel: { formatter: v => v >= 1000 ? `${v / 1000}k` : v } },
    series: [
      { name: 'Allocato', type: 'bar', data: data.map(d => d.allocato), itemStyle: { color: '#2E5D6E' } },
      { name: 'Verificato', type: 'bar', data: data.map(d => d.verificato), itemStyle: { color: '#D4956A' } },
      { name: 'Pagato', type: 'bar', data: data.map(d => d.pagato), itemStyle: { color: '#4A7C59' } },
      { name: 'Residuo', type: 'bar', data: data.map(d => d.residuo), itemStyle: { color: '#BDBDBD' } }
    ]
  }
})

const gaugeOption = computed(() => ({
  series: [
    {
      type: 'gauge',
      min: 0,
      max: 100,
      progress: { show: true, width: 14 },
      axisLine: { lineStyle: { width: 14 } },
      detail: { formatter: '{value}%' },
      data: [{ value: store.gauge, name: 'Erogato' }]
    }
  ]
}))

const palette = ['#2E5D6E', '#D4956A', '#4A7C59', '#E8B86D', '#C0503A', '#6B6B7B', '#9C27B0', '#607D8B']

function donutOption(data) {
  return {
    tooltip: { trigger: 'item' },
    legend: { type: 'scroll', orient: 'vertical', right: 0, top: 'middle' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: true,
        label: { show: false },
        data: data.map((d, i) => ({ ...d, itemStyle: { color: palette[i % palette.length] } }))
      }
    ]
  }
}

const ambitoOption = computed(() => donutOption(store.donutAmbito))
const statiOption = computed(() => donutOption(store.donutStati))
const pagamentiOption = computed(() => donutOption(store.donutPagamenti))

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
