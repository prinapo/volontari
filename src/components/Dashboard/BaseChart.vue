<template>
  <v-chart class="dashboard-chart" :style="{ height: `${height}px` }" :option="option" autoresize />
</template>

<script setup>
import { BarChart, GaugeChart, LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  PolarComponent,
  TitleComponent,
  TooltipComponent
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

defineProps({
  option: { type: Object, required: true },
  height: { type: Number, default: 300 }
})

use([
  CanvasRenderer,
  BarChart,
  GaugeChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  PolarComponent,
  TitleComponent,
  TooltipComponent
])
</script>

<style scoped>
.dashboard-chart {
  width: 100%;
  min-height: 300px;
}
</style>
