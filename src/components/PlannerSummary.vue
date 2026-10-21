<script setup lang="ts">
import { CalendarDays, Wallet, ArrowUpRight } from "lucide-vue-next";

defineProps<{
  covered: number;
  totalCamperWeeks: number;
  missingCount: number;
  total: number;
  unpaidTotal: number;
  currency: (value: number) => string;
}>();
const emit = defineEmits<{ missing: [] }>();
</script>
<template>
  <section class="stats">
    <button
      type="button"
      class="stat care-stat"
      aria-haspopup="dialog"
      @click="emit('missing')"
    >
      <div class="stat-label">WEEKS WITH CARE <CalendarDays :size="18" /></div>
      <div class="stat-number">
        {{ covered }}<span class="fraction"> / {{ totalCamperWeeks }}</span>
        <span>kid-weeks</span>
      </div>
      <div class="mini-progress">
        <span
          :style="{ width: (covered / totalCamperWeeks) * 100 + '%' }"
        ></span>
      </div>
      <div class="stat-foot">
        {{ missingCount }} open
        <span class="missing-link"
          >View missing weeks <ArrowUpRight :size="13"
        /></span>
      </div>
    </button>
    <div class="stat">
      <div class="stat-label">AMOUNT PAID <Wallet :size="18" /></div>
      <div class="stat-number">{{ currency(total) }}</div>
      <div v-if="unpaidTotal" class="stat-foot">
        {{ currency(unpaidTotal) }} unpaid
      </div>
    </div>
  </section>
</template>
