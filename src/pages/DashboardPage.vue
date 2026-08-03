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
              <BaseChart :option="allocatoOption" />
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-md-4">
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1">Stato pagamenti (esempio)</div>
              <div class="text-caption text-grey-7">su allocato {{ formatCurrency(metriche.allocato) }}</div>
            </q-card-section>
            <q-card-section>
              <BaseChart :option="gaugeRingOption" />
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
  const items = [
    {
      value: store.pctRendicontato,
      name: 'Rendicontato',
      importo: m.rendicontato,
      color: palette[0],
      titleOffset: ['0%', '42%'],
      detailOffset: ['0%', '34%']
    },
    {
      value: store.pctVerificato,
      name: 'Verificato',
      importo: m.verificato,
      color: palette[1],
      titleOffset: ['0%', '31%'],
      detailOffset: ['0%', '24%']
    },
    {
      value: store.pctTotale,
      name: 'In pagamento + Pagato',
      importo: store.sommaPagamenti,
      color: palette[5],
      titleOffset: ['0%', '20%'],
      detailOffset: ['0%', '13%']
    },
    {
      value: store.pctTotale,
      name: 'In pagamento',
      importo: m.inPagamento,
      color: palette[2],
      titleOffset: ['0%', '10%'],
      detailOffset: ['0%', '3%']
    },
    {
      value: store.pctPagato,
      name: 'Pagato',
      importo: m.pagato,
      color: palette[3],
      titleOffset: ['0%', '2%'],
      detailOffset: ['0%', '-6%']
    }
  ]
  return {
    tooltip: {
      formatter: p => {
        const item = items.find(i => i.name === p.name)
        return `${p.name}: ${formatCurrency(item?.importo)} (${p.value}% dell'allocato)`
      }
    },
    series: [
      {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        min: 0,
        max: 100,
        pointer: { show: false },
        progress: { show: true, overlap: false, roundCap: true, clip: false },
        axisLine: { lineStyle: { width: 16 } },
        splitLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        title: { fontSize: 10 },
        detail: { formatter: '{value}%', fontSize: 12, fontWeight: 600 },
        data: items.map(i => ({
          value: i.value,
          name: i.name,
          itemStyle: { color: i.color },
          title: { offsetCenter: i.titleOffset },
          detail: { offsetCenter: i.detailOffset }
        }))
      }
    ]
  }
})

const gaugeRingOption = computed(() => {
  const m = metriche.value
  if (!m) return {}
  const items = [
    {
      value: store.pctRendicontato,
      name: 'Rendicontato',
      color: palette[0],
      titleOffset: ['0%', '40%'],
      detailOffset: ['0%', '32%']
    },
    {
      value: store.pctVerificato,
      name: 'Verificato',
      color: palette[1],
      titleOffset: ['0%', '29%'],
      detailOffset: ['0%', '21%']
    },
    {
      value: store.pctTotale,
      name: 'In pagamento + Pagato',
      color: palette[5],
      titleOffset: ['0%', '18%'],
      detailOffset: ['0%', '10%']
    },
    {
      value: store.pctTotale,
      name: 'In pagamento',
      color: palette[2],
      titleOffset: ['0%', '8%'],
      detailOffset: ['0%', '0%']
    },
    {
      value: store.pctPagato,
      name: 'Pagato',
      color: palette[3],
      titleOffset: ['0%', '0%'],
      detailOffset: ['0%', '-8%']
    }
  ]
  return {
    tooltip: {
      formatter: p => `${p.name}: ${p.value}% dell'allocato`
    },
    series: [
      {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        pointer: { show: false },
        progress: {
          show: true,
          overlap: false,
          roundCap: true,
          clip: false,
          itemStyle: { borderWidth: 1, borderColor: '#464646' }
        },
        axisLine: { lineStyle: { width: 40 } },
        splitLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        title: { fontSize: 13 },
        detail: {
          width: 56,
          height: 16,
          fontSize: 14,
          color: 'inherit',
          borderColor: 'inherit',
          borderRadius: 20,
          borderWidth: 1,
          formatter: '{value}%'
        },
        data: items.map(i => ({
          value: i.value,
          name: i.name,
          itemStyle: { color: i.color },
          title: { offsetCenter: i.titleOffset },
          detail: { offsetCenter: i.detailOffset }
        }))
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
