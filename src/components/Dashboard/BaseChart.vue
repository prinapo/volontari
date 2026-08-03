<template>
  <v-chart class="dashboard-chart" :option="option" autoresize />
</template>

<script setup>
import { BarChart, GaugeChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

defineProps({
  option: { type: Object, required: true }
})

use([CanvasRenderer, BarChart, GaugeChart, LineChart, PieChart, GridComponent, LegendComponent, TitleComponent, TooltipComponent])
</script>

<style scoped>
.dashboard-chart {
  width: 100%;
  height: 300px;
}
</style>
