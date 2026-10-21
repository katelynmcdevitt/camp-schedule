<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Planner from './Planner.vue'
import general from './data/general.json'

const availableYears = ref(Array.from({ length: 6 }, (_, i) => general.season.year + i))
let lastYear = general.season.year
try {
  const storedYear = Number(localStorage.getItem('camp-days-selected-year'))
  if (Number.isInteger(storedYear) && storedYear >= 2000 && storedYear <= 2100) lastYear = storedYear
  for (let i = 0; i < localStorage.length; i++) {
    const match = localStorage.key(i)?.match(/^camp-days-(\d{4})$/)
    if (match) availableYears.value.push(Number(match[1]))
  }
} catch {}
const selectedYear = ref(lastYear)
const yearOptions = computed(() => [...new Set([...availableYears.value, selectedYear.value])].sort((a, b) => a - b))
watch(selectedYear, year => {
  try { localStorage.setItem('camp-days-selected-year', String(year)) } catch {}
}, { flush: 'sync' })
</script>

<template>
  <Planner :key="selectedYear" :season-year="selectedYear" :available-years="yearOptions" @change-year="selectedYear = $event" />
</template>
