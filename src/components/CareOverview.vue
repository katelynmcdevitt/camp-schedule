<script setup lang="ts">
import { ArrowUpRight, Check } from "lucide-vue-next";
import type { CareWeek } from "../types";

defineProps<{ weeks: CareWeek[]; kids: string[]; missingCount: number }>();
const emit = defineEmits<{ missing: [] }>();
</script>
<template>
  <section class="panel coverage-panel">
    <div class="panel-heading">
      <div><h2>Weeks with care</h2></div>
      <button
        class="missing-link"
        aria-haspopup="dialog"
        @click="emit('missing')"
      >
        Missing weeks ({{ missingCount }})
        <ArrowUpRight :size="14" />
      </button>
    </div>
    <div class="coverage-scroll">
      <div class="coverage-table" :style="{ '--week-count': weeks.length }">
        <div></div>
        <div v-for="week in weeks" class="week-label">
          {{ week.label }}
        </div>
        <template v-for="(kid, i) in kids"
          ><div class="coverage-kid">
            <span :class="['avatar', 'kid-' + i]">{{ kid.slice(0, 1) }}</span
            >{{ kid }}
          </div>
          <div
            v-for="week in weeks"
            :class="[
              'coverage-cell',
              { 'is-filled': week.filled[i] },
              'coverage-' + i,
            ]"
          >
            {{ week.filled[i] ? "Care arranged" : "Open week"
            }}<Check v-if="week.filled[i]" :size="12" /></div
        ></template>
      </div>
    </div>
  </section>
</template>
