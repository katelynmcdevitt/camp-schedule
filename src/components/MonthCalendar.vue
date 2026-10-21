<script setup lang="ts">
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-vue-next";
import type { Camp, CalendarDay } from "../types";

defineProps<{
  kids: string[];
  days: CalendarDay[];
  monthName: string;
  forDay: (date: string) => Camp[];
}>();
const filter = defineModel<number>("filter", { required: true });
const emit = defineEmits<{
  edit: [camp: Camp];
  move: [offset: number];
  showCamps: [];
}>();
</script>
<template>
  <section class="panel calendar-panel">
    <div class="panel-heading">
      <div><h2>Calendar</h2></div>
      <button
        class="icon-btn"
        title="View all camps"
        @click="emit('showCamps')"
      >
        <ArrowUpRight :size="19" />
      </button>
    </div>
    <div class="calendar-toolbar">
      <div class="month-control">
        <h3>{{ monthName }}</h3>
        <button aria-label="Previous month" @click="emit('move', -1)">
          <ChevronLeft :size="17" /></button
        ><button aria-label="Next month" @click="emit('move', 1)">
          <ChevronRight :size="17" />
        </button>
      </div>
      <div class="filter">
        <button :class="{ chosen: filter === -1 }" @click="filter = -1">
          Both kids</button
        ><button
          v-for="(kid, i) in kids"
          :class="{ chosen: filter === i }"
          @click="filter = i"
        >
          <i :class="'dot-' + i"></i>{{ kid }}
        </button>
      </div>
    </div>
    <div class="calendar">
      <div
        v-for="d in ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']"
        class="weekday"
      >
        {{ d }}
      </div>
      <div
        v-for="day in days"
        :key="day.date"
        :class="[
          'day',
          {
            muted: !day.current,
            weekend: day.weekday === 0 || day.weekday === 6,
          },
        ]"
      >
        <span class="day-number">{{ day.number }}</span
        ><button
          v-for="camp in forDay(day.date)"
          :key="camp.id"
          :title="camp.name + ' · ' + kids[camp.kid]"
          :class="['calendar-event', 'event-' + camp.kid]"
          @click="emit('edit', camp)"
        >
          <span></span>{{ camp.name }}
        </button>
      </div>
    </div>
    <div class="calendar-footer">
      <span v-for="(kid, i) in kids"
        ><i :class="'dot-' + i"></i>{{ kid }}’s camps</span
      >
    </div>
  </section>
</template>
