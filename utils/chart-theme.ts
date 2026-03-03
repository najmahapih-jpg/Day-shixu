/**
 * uCharts custom theme for HabitFlow
 * Keep color values in sync with $brand-* / $neutral-* in @/styles/variables.scss
 */

export const CHART_COLORS = [
  '#1E1E2E', // $brand-primary (coral red)
  '#8BA888', // $brand-tertiary (sage green)
  '#7EB8C9', // $brand-quaternary (misty blue)
  '#F5C563', // $brand-secondary (cream gold)
  '#C4856A', // $habit-learning
  '#D4A574', // $habit-social
]

export const chartTheme = {
  color: CHART_COLORS,
  fontColor: '#5C5650',  // $neutral-700
  fontSize: 11,
  padding: [15, 15, 0, 5],
  legend: {
    show: true,
    fontColor: '#5C5650',
    fontSize: 11,
  },
  xAxis: {
    axisLineColor: '#D4CEC8',   // $neutral-300
    fontColor: '#5C5650',        // $neutral-700
    fontSize: 10,
    gridColor: '#D4CEC8',
    gridType: 'dash',
    dashLength: 4,
  },
  yAxis: {
    axisLineColor: '#D4CEC8',
    fontColor: '#5C5650',
    fontSize: 10,
    gridColor: '#D4CEC8',
    gridType: 'dash',
    dashLength: 4,
  },
  extra: {
    column: {
      width: 20,
      barBorderRadius: [4, 4, 0, 0],
    },
  },
}

