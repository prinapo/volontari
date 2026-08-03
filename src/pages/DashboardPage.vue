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
        <div class="col-12 col-md-6">
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1">Progetti e Famiglie</div>
            </q-card-section>
            <q-card-section>
              <BaseChart :option="famiglieProgettiOption" :height="280" />
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-md-6">
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1">Stato pagamenti</div>
              <div class="text-caption text-grey-7">su allocato {{ formatCurrency(metriche.allocato) }}</div>
            </q-card-section>
            <q-card-section>
              <BaseChart :option="allocatoOption" />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row q-col-gutter-md">
        <div class="col-12">
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1">Avanzamento per anno (€)</div>
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

const palette = ['#2E5D6E', '#D4956A', '#4A7C59', '#E8B86D', '#C0503A', '#6B6B7B', '#9C27B0', '#607D8B']

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

const allocatoOption = computed(() => {
  const m = metriche.value
  if (!m) return {}
  const data = [
    { name: 'Rendicontato', value: store.pctRendicontato, importo: m.rendicontato, color: palette[0] },
    { name: 'Verificato', value: store.pctVerificato, importo: m.verificato, color: palette[1] },
    {
      name: 'In pagamento + Pagato',
      value: store.pctTotale,
      importo: store.sommaPagamenti,
      color: palette[5]
    },
    { name: 'In pagamento', value: store.pctTotale, importo: m.inPagamento, color: palette[2] },
    { name: 'Pagato', value: store.pctPagato, importo: m.pagato, color: palette[3] }
  ]
  return {
    tooltip: {
      formatter: p => `${p.name}: ${formatCurrency(p.data.importo)} (${p.data.value}% dell'allocato)`
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
        label: { show: true, position: 'outside', distance: 10, rotate: 0, formatter: p => `${p.value}%`, fontSize: 13, fontWeight: 600 }
      }
    ]
  }
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
