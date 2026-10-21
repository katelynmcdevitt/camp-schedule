<script setup lang="ts">
import { ChevronLeft, ChevronRight, Clock, Check } from "lucide-vue-next";
import type { Camp, WeekDay } from "../types";

import { formatTime } from "../lib/handoffs";
defineProps<{
  selectedWeek: string;
  weekDays: WeekDay[];
  kids: string[];
  filter: number;
  weekWarningDays: number;
  dateLabel: (date: string) => string;
}>();
const calendarView = defineModel<"week" | "month">("calendarView", {
  required: true,
});
const handoffBuffer = defineModel<number>("handoffBuffer", { required: true });
const emit = defineEmits<{
  edit: [camp: Camp];
  moveWeek: [offset: number];
  selectWeek: [date: string];
}>();
</script>
<template>
  <section class="panel weekly-panel">
    <div class="panel-heading">
      <div>
        <h2>
          {{ calendarView === "week" ? "Weekly schedule" : "Monthly schedule" }}
        </h2>
      </div>
      <div class="filter">
        <button
          :class="{ chosen: calendarView === 'week' }"
          @click="calendarView = 'week'"
        >
          Week</button
        ><button
          :class="{ chosen: calendarView === 'month' }"
          @click="calendarView = 'month'"
        >
          Month
        </button>
      </div>
    </div>
    <template v-if="calendarView === 'week'">
      <div class="week-toolbar">
        <div class="month-control">
          <button aria-label="Previous week" @click="emit('moveWeek', -1)">
            <ChevronLeft :size="18" /></button
          ><strong
            >{{ dateLabel(selectedWeek) }} – {{ dateLabel(weekDays[4]!.date) }},
            {{ selectedWeek.slice(0, 4) }}</strong
          ><button aria-label="Next week" @click="emit('moveWeek', 1)">
            <ChevronRight :size="18" />
          </button>
        </div>
        <label
          >Week of
          <input
            type="date"
            :value="selectedWeek"
            @change="
              emit('selectWeek', ($event.target as HTMLInputElement).value)
            "
        /></label>
      </div>
      <div class="handoff-summary">
        <Clock :size="16" /><span
          >{{
            weekWarningDays
              ? `${weekWarningDays} days with handoff alerts`
              : "No handoff alerts"
          }}
          · Both kids · Travel unchecked</span
        ><label
          >Gap ≤
          <input
            v-model.number="handoffBuffer"
            type="number"
            min="0"
            max="180"
          />
          min</label
        >
      </div>
      <div class="weekly-scroll">
        <div class="weekly-grid">
          <article v-for="day in weekDays" :key="day.date" class="week-day">
            <h3>{{ day.label }}</h3>
            <template v-for="(kid, i) in kids"
              ><section
                v-if="filter < 0 || filter === i"
                :class="['week-camper', 'week-camper-' + i]"
              >
                <strong>{{ kid }}</strong
                ><button
                  v-for="camp in day.camps.filter((c) => c.kid === i)"
                  :key="camp.id"
                  class="week-booking"
                  @click="emit('edit', camp)"
                >
                  <b>{{ camp.name }}</b
                  ><span v-if="camp.type === 'Grandparent' && !camp.noCamp"
                    >Family care</span
                  ><span v-else-if="camp.noCamp">No camp</span
                  ><template v-else
                    ><span
                      >Drop-off <em>{{ formatTime(camp.dropoff) }}</em></span
                    ><span
                      >Pickup <em>{{ formatTime(camp.pickup) }}</em></span
                    ></template
                  ><small v-if="camp.location">{{ camp.location }}</small
                  ><small v-if="camp.status === 'Pending'">Pending</small>
                </button>
                <p v-if="!day.camps.some((c) => c.kid === i)" class="time-help">
                  No booking
                </p>
              </section></template
            >
            <div
              v-for="(warning, i) in day.warnings"
              :key="i"
              class="handoff-alert"
            >
              <b>{{
                warning.gap === 0
                  ? "Same-time handoffs"
                  : `${warning.gap}-minute gap`
              }}</b
              ><span
                >{{ kids[warning.a.camp.kid] }} ·
                {{ warning.a.kind === "dropoff" ? "Drop-off" : "Pickup" }}
                {{ formatTime(warning.a.time) }}</span
              ><span
                >{{ kids[warning.b.camp.kid] }} ·
                {{ warning.b.kind === "dropoff" ? "Drop-off" : "Pickup" }}
                {{ formatTime(warning.b.time) }}</span
              ><small>{{
                warning.a.camp.name === warning.b.camp.name
                  ? "Shared stop?"
                  : "Check travel time"
              }}</small>
            </div>
          </article>
        </div>
      </div>
    </template>
  </section>
</template>
