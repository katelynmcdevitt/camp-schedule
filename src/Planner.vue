<script setup lang="ts">
import { usePlanner } from "./composables/usePlanner";
import { Plus, ChevronDown, Download } from "lucide-vue-next";
import PlannerSidebar from "./components/PlannerSidebar.vue";
import PlannerSummary from "./components/PlannerSummary.vue";
import WeeklySchedule from "./components/WeeklySchedule.vue";
import MonthCalendar from "./components/MonthCalendar.vue";
import CampList from "./components/CampList.vue";
import CareOverview from "./components/CareOverview.vue";
import PaymentsTable from "./components/PaymentsTable.vue";
import MissingWeeksDialog from "./components/MissingWeeksDialog.vue";
import PlannerDialogs from "./components/PlannerDialogs.vue";
const props = defineProps<{ seasonYear: number; availableYears: number[] }>();
const emit = defineEmits<{ changeYear: [year: number] }>();
const {
  season,
  totalCamperWeeks,
  camps,
  hasSeparateCost,
  paymentOwner,
  paymentLabel,
  togglePaid,
  kids,
  calendarView,
  selectedWeek,
  handoffBuffer,
  tab,
  missingWeeksDialog,
  modal,
  form,
  visible,
  total,
  unpaidTotal,
  unknownCosts,
  currency,
  costLabel,
  monthName,
  days,
  forDay,
  conflicts,
  weeks,
  paymentRows,
  paidByKid,
  missingWeeks,
  viewMissingWeek,
  weekDays,
  weekWarningDays,
  moveWeek,
  selectWeek,
  covered,
  dateLabel,
  open,
  save,
  remove,
  move,
  exportData,
  filter,
  settings,
  editing,
  error,
  storageError,
} = usePlanner(props.seasonYear);
</script>

<template>
  <div class="app-shell">
    <PlannerSidebar
      v-model:tab="tab"
      v-model:filter="filter"
      :kids="kids"
      :camp-count="camps.length"
      :storage-error="storageError"
      @settings="settings = true"
    />
    <main>
      <header>
        <div class="breadcrumb">
          <b>{{ tab }}</b>
        </div>
        <div class="header-right">
          <label class="season-picker"
            >Summer
            <span class="season-select"
              ><select
                :value="season.year"
                aria-label="Summer year"
                @change="
                  emit(
                    'changeYear',
                    Number(($event.target as HTMLSelectElement).value),
                  )
                "
              >
                <option
                  v-for="option in availableYears"
                  :key="option"
                  :value="option"
                >
                  {{ option }}
                </option></select
              ><ChevronDown :size="14" aria-hidden="true" /></span></label
          ><button
            class="family-avatar"
            @click="settings = true"
            aria-label="Family settings"
          >
            K
          </button>
        </div>
      </header>
      <div class="page-content">
        <div class="page-heading">
          <h1>{{ tab }}</h1>
          <button class="primary" @click="open()">
            <Plus :size="17" /> Add a camp
          </button>
        </div>
        <div v-if="storageError" class="warning">
          Changes not saved. Export a backup.
        </div>
        <div v-if="conflicts.length" class="warning">
          {{ conflicts.length }} overlapping bookings for the same camper.
        </div>
        <div v-if="unknownCosts" class="warning">
          {{ unknownCosts }} missing prices · excluded from totals
        </div>
        <PlannerSummary
          v-if="tab === 'Overview' || tab === 'Payments'"
          :covered="covered"
          :total-camper-weeks="totalCamperWeeks"
          :missing-count="missingWeeks.length"
          :total="total"
          :unpaid-total="unpaidTotal"
          :currency="currency"
          @missing="missingWeeksDialog?.showModal()"
        />

        <WeeklySchedule
          v-if="tab === 'Schedule'"
          v-model:calendar-view="calendarView"
          v-model:handoff-buffer="handoffBuffer"
          :selected-week="selectedWeek"
          :week-days="weekDays"
          :kids="kids"
          :filter="filter"
          :week-warning-days="weekWarningDays"
          :date-label="dateLabel"
          @edit="open"
          @move-week="moveWeek"
          @select-week="selectWeek"
        />
        <div
          v-if="tab !== 'Payments'"
          class="main-grid"
          :class="{ 'full-grid': tab !== 'Overview' }"
        >
          <MonthCalendar
            v-if="
              tab === 'Overview' ||
              (tab === 'Schedule' && calendarView === 'month')
            "
            v-model:filter="filter"
            :kids="kids"
            :days="days"
            :month-name="monthName"
            :for-day="forDay"
            @edit="open"
            @move="move"
            @show-camps="tab = 'Camps'"
          />
          <CampList
            v-if="tab === 'Overview' || tab === 'Camps'"
            v-model:filter="filter"
            :tab="tab"
            :visible="visible"
            :kids="kids"
            :date-label="dateLabel"
            :cost-label="costLabel"
            @edit="open"
            @show-camps="tab = 'Camps'"
          />
        </div>
        <CareOverview
          v-if="tab === 'Overview' || tab === 'Schedule'"
          :weeks="weeks"
          :kids="kids"
          :missing-count="missingWeeks.length"
          @missing="missingWeeksDialog?.showModal()"
        />
        <PaymentsTable
          v-if="tab === 'Payments'"
          :kids="kids"
          :payment-rows="paymentRows"
          :unpaid-total="unpaidTotal"
          :paid-by-kid="paidByKid"
          :currency="currency"
          :cost-label="costLabel"
          :has-separate-cost="hasSeparateCost"
          :payment-owner="paymentOwner"
          :payment-label="paymentLabel"
          @edit="open"
          @toggle-paid="togglePaid"
        />
        <footer>
          <button @click="exportData">
            <Download :size="14" /> Export backup
          </button>
        </footer>
      </div>
    </main>
    <MissingWeeksDialog
      ref="missingWeeksDialog"
      :missing-weeks="missingWeeks"
      :date-label="dateLabel"
      @view-week="viewMissingWeek"
    />
    <PlannerDialogs
      v-if="modal || settings"
      v-model:modal="modal"
      v-model:settings="settings"
      v-model:kids="kids"
      v-model:handoff-buffer="handoffBuffer"
      v-model:form="form"
      :editing="editing"
      :error="error"
      :season-year="season.year"
      @save="save"
      @remove="remove"
    />
  </div>
</template>
