<script setup lang="ts">
import { ref, computed, watch } from "vue";
import owen from "./data/owen.json";
import kayleigh from "./data/kayleigh.json";
import general from "./data/general.json";
import { formatTime, handoffWarnings } from "./lib/handoffs";
import {
  Sun,
  CalendarDays,
  LayoutDashboard,
  Tent,
  Wallet,
  Plus,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Clock,
  Check,
  Settings2,
  Download,
  Leaf,
  Waves,
  Palette,
  Mountain,
} from "lucide-vue-next";
const props = defineProps<{ seasonYear: number; availableYears: number[] }>();
const emit = defineEmits<{ changeYear: [year: number] }>();
// Each mounted planner owns one season; switching years remounts it.
const coverageDate = new Date(props.seasonYear, 5, 15, 12);
coverageDate.setDate(
  coverageDate.getDate() - ((coverageDate.getDay() + 6) % 7),
);
const season =
  props.seasonYear === general.season.year
    ? general.season
    : {
        ...general.season,
        year: props.seasonYear,
        coverageStart: `${coverageDate.getFullYear()}-${String(coverageDate.getMonth() + 1).padStart(2, "0")}-${String(coverageDate.getDate()).padStart(2, "0")}`,
      };
type Camp = {
  id: string;
  name: string;
  kid: number;
  start: string;
  end: string;
  time?: string;
  dropoff?: string | null;
  pickup?: string | null;
  location: string;
  paid?: boolean;
  cost: number | null;
  costIncludedIn?: string;
  status: string;
  type: string;
};
const campers = [owen, kayleigh];
const initial: Camp[] = campers.flatMap((camper, kid) =>
  camper.camps.map((camp) => ({ ...camp, kid })),
);
const seasonStart = new Date(season.coverageStart + "T12:00:00");
const firstWeekEnd = new Date(seasonStart);
firstWeekEnd.setDate(firstWeekEnd.getDate() + season.daysPerWeek - 1);
const defaultCampEnd = `${firstWeekEnd.getFullYear()}-${String(firstWeekEnd.getMonth() + 1).padStart(2, "0")}-${String(firstWeekEnd.getDate()).padStart(2, "0")}`;
const totalCamperWeeks = season.weekCount * campers.length;
const storageKey = `camp-days-${season.year}`;
let saved: any = null;
try {
  saved = JSON.parse(localStorage.getItem(storageKey) || "null");
} catch {}
const importedSchedule = "owen-2026-v1";
const appliedImports: string[] = saved?.appliedImports ?? [];
const startingCamps: Camp[] =
  saved?.camps ??
  (season.year === general.season.year ? structuredClone(initial) : []);
// Add this supplied schedule once without replacing existing browser edits.
if (
  season.year === general.season.year &&
  !appliedImports.includes(importedSchedule)
) {
  for (const camp of initial.filter((camp) => camp.kid === 0)) {
    if (!startingCamps.some((existing) => existing.id === camp.id))
      startingCamps.push({ ...camp });
  }
  const sharedCamp = startingCamps.find(
    (camp) => camp.id === "kayleigh-2026-week-6",
  );
  if (sharedCamp && sharedCamp.cost == null)
    sharedCamp.costIncludedIn = "owen-2026-week-6";
  appliedImports.push(importedSchedule);
}
const timesImport = "handoff-times-2026-v1";
if (
  season.year === general.season.year &&
  !appliedImports.includes(timesImport)
) {
  for (const camp of startingCamps) {
    const source = initial.find((item) => item.id === camp.id);
    if (!source) continue;
    if (camp.dropoff === undefined) camp.dropoff = source.dropoff;
    if (camp.pickup === undefined) camp.pickup = source.pickup;
  }
  appliedImports.push(timesImport);
}
for (const camp of startingCamps) {
  if (camp.paid === undefined)
    camp.paid = initial.find((source) => source.id === camp.id)?.paid ?? false;
}
const camps = ref<Camp[]>(startingCamps);
const hasSeparateCost = (camp: Camp) =>
  !camp.costIncludedIn && (camp.cost ?? 0) > 0;
const paymentOwner = (camp: Camp): Camp => {
  return camps.value.find((c) => c.id === camp.costIncludedIn) ?? camp;
};
const paymentLabel = (camp: Camp): string => {
  const owner = paymentOwner(camp);
  if (owner.cost === 0) return "No payment due";
  if (owner.cost == null) return "Cost needed";
  return owner.paid ? "Paid" : "Unpaid";
};
const togglePaid = (camp: Camp) => {
  const owner = paymentOwner(camp);
  owner.paid = !owner.paid;
};
// Replace the original sample names in existing browser saves.
const sampleNames = ["Oliver", "Emma"];
const kids = ref<string[]>(
  campers.map((camper, index) => {
    const savedName = saved?.kids?.[index];
    return savedName && savedName !== sampleNames[index]
      ? savedName
      : camper.name;
  }),
);
const calendarView = ref<"month" | "week">("week");
const selectedWeek = ref(season.coverageStart);
const handoffBuffer = ref<number>(
  saved?.handoffBuffer ?? general.handoffBufferMinutes,
);
const tab = ref("Overview"),
  filter = ref(-1),
  month = ref(seasonStart.getMonth()),
  year = ref(season.year);
const missingWeeksDialog = ref<HTMLDialogElement | null>(null);
const modal = ref(false),
  settings = ref(false),
  editing = ref(""),
  error = ref(""),
  storageError = ref(false);
const blank = (): Omit<Camp, "id"> => ({
  ...general.newCamp,
  name: "",
  kid: 0,
  start: season.coverageStart,
  end: defaultCampEnd,
  location: "",
});
const form = ref(blank());
watch(
  [camps, kids, handoffBuffer],
  () => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          camps: camps.value,
          kids: kids.value,
          handoffBuffer: handoffBuffer.value,
          appliedImports,
        }),
      );
    } catch {
      storageError.value = true;
    }
  },
  { deep: true, immediate: true, flush: "sync" },
);
const visible = computed(() =>
  camps.value
    .filter((c) => filter.value < 0 || c.kid === filter.value)
    .sort((a, b) => a.start.localeCompare(b.start)),
);
const total = computed(() =>
  camps.value
    .filter((c) => c.status !== "Wishlist" && c.paid)
    .reduce((s, c) => s + (c.cost ?? 0), 0),
);
const unpaidTotal = computed(() =>
  camps.value
    .filter((c) => c.status !== "Wishlist" && !c.paid)
    .reduce((s, c) => s + (c.cost ?? 0), 0),
);
const unknownCosts = computed(
  () =>
    camps.value.filter(
      (c) => c.status !== "Wishlist" && c.cost == null && !c.costIncludedIn,
    ).length,
);
const currency = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const costLabel = (camp: Camp) =>
  camp.cost == null
    ? camp.costIncludedIn
      ? "Included in Owen’s YMCA cost"
      : "Cost not provided"
    : currency(camp.cost);
const monthName = computed(() =>
  new Date(year.value, month.value).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  }),
);
const days = computed(() => {
  const offset = new Date(year.value, month.value, 1).getDay();
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(year.value, month.value, i - offset + 1);
    return {
      number: d.getDate(),
      current: d.getMonth() === month.value,
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      weekday: d.getDay(),
    };
  });
});
const forDay = (date: string) =>
  visible.value.filter(
    (c) => c.start <= date && c.end >= date && c.status !== "Wishlist",
  );
const conflicts = computed(() =>
  camps.value.filter(
    (c, i) =>
      c.status !== "Wishlist" &&
      camps.value.some(
        (o, j) =>
          i !== j &&
          o.status !== "Wishlist" &&
          o.kid === c.kid &&
          c.start <= o.end &&
          c.end >= o.start,
      ),
  ),
);
const weeks = computed(() =>
  Array.from({ length: season.weekCount }, (_, i) => {
    const d = new Date(seasonStart);
    d.setDate(d.getDate() + i * 7);
    const end = new Date(d);
    end.setDate(end.getDate() + season.daysPerWeek - 1);
    const iso = (v: Date) =>
      `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
    return {
      start: iso(d),
      end: iso(end),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      filled: kids.value.map((_, k) =>
        camps.value.some(
          (c) =>
            c.kid === k &&
            c.status === "Confirmed" &&
            c.type !== "none" &&
            c.start <= iso(d) &&
            c.end >= iso(end),
        ),
      ),
    };
  }),
);
const paymentRows = computed(() => {
  const rows = weeks.value.map((week, index) => ({
    key: week.start,
    label: `Week ${index + 1}`,
    dates: `${dateLabel(week.start)} – ${dateLabel(week.end)}`,
    entries: kids.value.map(() => [] as Camp[]),
  }));
  const other = {
    key: "other",
    label: "Other dates",
    dates: "",
    entries: kids.value.map(() => [] as Camp[]),
  };
  for (const camp of camps.value) {
    // Show each payment once, even when a camp spans multiple weeks.
    const index = weeks.value.findIndex(
      (week) => camp.start <= week.end && camp.end >= week.start,
    );
    const row = index < 0 ? other : rows[index]!;
    row.entries[camp.kid]?.push(camp);
  }
  if (other.entries.some((entries) => entries.length)) rows.push(other);
  return rows;
});
const paidByKid = computed(() =>
  kids.value.map((_, kid) =>
    camps.value
      .filter((c) => c.kid === kid && c.status !== "Wishlist" && c.paid)
      .reduce((sum, camp) => sum + (camp.cost ?? 0), 0),
  ),
);
const missingWeeks = computed(() =>
  kids.value.flatMap((kid, index) =>
    weeks.value
      .filter((week) => !week.filled[index])
      .map((week) => ({
        kid,
        kidIndex: index,
        start: week.start,
        end: week.end,
        reason: camps.value.some(
          (c) =>
            c.kid === index &&
            c.type === "none" &&
            c.start <= week.start &&
            c.end >= week.end,
        )
          ? "No camp"
          : "Care not confirmed for the full week",
      })),
  ),
);
const viewMissingWeek = (start: string, kid: number) => {
  selectedWeek.value = start;
  filter.value = kid;
  calendarView.value = "week";
  tab.value = "Schedule";
  missingWeeksDialog.value?.close();
};
const localISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const weekDays = computed(() =>
  Array.from({ length: 5 }, (_, i) => {
    const d = new Date(selectedWeek.value + "T12:00:00");
    d.setDate(d.getDate() + i);
    const date = localISO(d);
    return {
      date,
      label: d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      camps: visible.value.filter(
        (c) => c.start <= date && c.end >= date && c.status !== "Wishlist",
      ),
      warnings: handoffWarnings(camps.value, date, handoffBuffer.value),
    };
  }),
);
const weekWarningDays = computed(
  () => weekDays.value.filter((day) => day.warnings.length).length,
);
const moveWeek = (offset: number) => {
  const d = new Date(selectedWeek.value + "T12:00:00");
  d.setDate(d.getDate() + offset * 7);
  selectedWeek.value = localISO(d);
};
const selectWeek = (date: string) => {
  const d = new Date(date + "T12:00:00");
  if (Number.isNaN(d.getTime())) return;
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  selectedWeek.value = localISO(d);
};
const covered = computed(() =>
  weeks.value.reduce((s, w) => s + w.filled.filter(Boolean).length, 0),
);
const dateLabel = (s: string) =>
  new Date(s + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
const open = (c?: Camp) => {
  editing.value = c?.id ?? "";
  form.value = c ? { ...c } : blank();
  error.value = "";
  modal.value = true;
};
const save = () => {
  if (!form.value.name.trim() || !form.value.start || !form.value.end) {
    error.value = "Add a camp name and both dates.";
    return;
  }
  if (
    !form.value.start.startsWith(`${season.year}-`) ||
    !form.value.end.startsWith(`${season.year}-`)
  ) {
    error.value = `Use dates in ${season.year}, or select another year.`;
    return;
  }
  if (form.value.end < form.value.start) {
    error.value = "The end date must be on or after the start date.";
    return;
  }
  if (
    form.value.dropoff &&
    form.value.pickup &&
    form.value.pickup <= form.value.dropoff
  ) {
    error.value = "Pickup must be after drop-off.";
    return;
  }
  const c = {
    ...form.value,
    cost: typeof form.value.cost === "number" ? form.value.cost : null,
    name: form.value.name.trim(),
    id: editing.value || crypto.randomUUID(),
  };
  if (editing.value)
    camps.value = camps.value.map((o) => (o.id === editing.value ? c : o));
  else camps.value.push(c);
  modal.value = false;
};
const remove = () => {
  camps.value = camps.value.filter((c) => c.id !== editing.value);
  modal.value = false;
};
const move = (n: number) => {
  const d = new Date(year.value, month.value + n);
  year.value = d.getFullYear();
  month.value = d.getMonth();
};
const exportData = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob(
      [
        JSON.stringify(
          {
            year: season.year,
            kids: kids.value,
            camps: camps.value,
            handoffBuffer: handoffBuffer.value,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
  );
  a.download = `camp-days-${season.year}-backup.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <a class="brand" href="#" @click.prevent="tab = 'Overview'"
        ><span class="brand-mark"><Sun :size="25" /></span>camp days<span
          class="brand-dot"
          >.</span
        ></a
      >
      <nav>
        <button
          v-for="item in [
            { name: 'Overview', icon: LayoutDashboard },
            { name: 'Schedule', icon: CalendarDays },
            { name: 'Camps', icon: Tent },
            { name: 'Payments', icon: Wallet },
          ]"
          :class="{ active: tab === item.name }"
          @click="tab = item.name"
        >
          <component :is="item.icon" :size="19" />{{ item.name
          }}<span v-if="item.name === 'Camps'" class="nav-count">{{
            camps.length
          }}</span>
        </button>
      </nav>
      <div class="sidebar-kids">
        <div class="workspace-label">
          YOUR CAMPERS
          <button aria-label="Edit campers" @click="settings = true">
            <Settings2 :size="14" />
          </button>
        </div>
        <button
          v-for="(kid, i) in kids"
          @click="filter = filter === i ? -1 : i"
          :class="['kid-row', { selected: filter === i }]"
        >
          <span :class="['avatar', 'kid-' + i]">{{ kid.slice(0, 1) }}</span
          ><span>{{ kid }}</span
          ><span :class="['kid-dot', 'dot-' + i]"></span>
        </button>
      </div>

      <button class="settings-link" @click="settings = true">
        <Settings2 :size="17" /> Family settings
      </button>
      <div class="local-note" role="status">
        <span></span>{{ storageError ? "Not saved" : "Saved on this device" }}
      </div>
    </aside>
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
        <section v-if="tab === 'Overview' || tab === 'Payments'" class="stats">
          <button
            type="button"
            class="stat care-stat"
            aria-haspopup="dialog"
            @click="missingWeeksDialog?.showModal()"
          >
            <div class="stat-label">
              WEEKS WITH CARE <CalendarDays :size="18" />
            </div>
            <div class="stat-number">
              {{ covered
              }}<span class="fraction"> / {{ totalCamperWeeks }}</span>
              <span>kid-weeks</span>
            </div>
            <div class="mini-progress">
              <span
                :style="{ width: (covered / totalCamperWeeks) * 100 + '%' }"
              ></span>
            </div>
            <div class="stat-foot">
              {{ missingWeeks.length }} open
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

        <section v-if="tab === 'Schedule'" class="panel weekly-panel">
          <div class="panel-heading">
            <div>
              <h2>
                {{
                  calendarView === "week"
                    ? "Weekly schedule"
                    : "Monthly schedule"
                }}
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
                <button aria-label="Previous week" @click="moveWeek(-1)">
                  <ChevronLeft :size="18" /></button
                ><strong
                  >{{ dateLabel(selectedWeek) }} –
                  {{ dateLabel(weekDays[4]!.date) }},
                  {{ selectedWeek.slice(0, 4) }}</strong
                ><button aria-label="Next week" @click="moveWeek(1)">
                  <ChevronRight :size="18" />
                </button>
              </div>
              <label
                >Week of
                <input
                  type="date"
                  :value="selectedWeek"
                  @change="
                    selectWeek(($event.target as HTMLInputElement).value)
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
                <article
                  v-for="day in weekDays"
                  :key="day.date"
                  class="week-day"
                >
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
                        @click="open(camp)"
                      >
                        <b>{{ camp.name }}</b
                        ><span v-if="camp.type === 'family'">Family care</span
                        ><span v-else-if="camp.type === 'none'">No camp</span
                        ><template v-else
                          ><span
                            >Drop-off
                            <em>{{ formatTime(camp.dropoff) }}</em></span
                          ><span
                            >Pickup <em>{{ formatTime(camp.pickup) }}</em></span
                          ></template
                        ><small v-if="camp.location">{{ camp.location }}</small
                        ><small v-if="camp.status === 'Pending'">Pending</small>
                      </button>
                      <p
                        v-if="!day.camps.some((c) => c.kid === i)"
                        class="time-help"
                      >
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
        <div
          v-if="tab !== 'Payments'"
          class="main-grid"
          :class="{ 'full-grid': tab !== 'Overview' }"
        >
          <section
            v-if="
              tab === 'Overview' ||
              (tab === 'Schedule' && calendarView === 'month')
            "
            class="panel calendar-panel"
          >
            <div class="panel-heading">
              <div><h2>Calendar</h2></div>
              <button
                class="icon-btn"
                title="View all camps"
                @click="tab = 'Camps'"
              >
                <ArrowUpRight :size="19" />
              </button>
            </div>
            <div class="calendar-toolbar">
              <div class="month-control">
                <h3>{{ monthName }}</h3>
                <button aria-label="Previous month" @click="move(-1)">
                  <ChevronLeft :size="17" /></button
                ><button aria-label="Next month" @click="move(1)">
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
                  @click="open(camp)"
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
          <section
            v-if="tab === 'Overview' || tab === 'Camps'"
            class="panel camp-panel"
          >
            <div class="panel-heading">
              <div>
                <h2>{{ tab === "Camps" ? "All camps" : "Upcoming camps" }}</h2>
              </div>
              <span class="small-pill">{{ visible.length }} camps</span>
            </div>
            <div v-if="tab === 'Camps'" class="list-filters filter">
              <button :class="{ chosen: filter === -1 }" @click="filter = -1">
                Both kids</button
              ><button
                v-for="(kid, i) in kids"
                :class="{ chosen: filter === i }"
                @click="filter = i"
              >
                {{ kid }}
              </button>
            </div>
            <div class="camp-list">
              <button
                v-for="camp in tab === 'Camps' ? visible : visible.slice(0, 4)"
                :key="camp.id"
                class="camp-card"
                @click="open(camp)"
              >
                <div :class="['camp-art', camp.type]">
                  <component
                    :is="
                      camp.type === 'nature'
                        ? Leaf
                        : camp.type === 'water'
                          ? Waves
                          : camp.type === 'art'
                            ? Palette
                            : Mountain
                    "
                    :size="25"
                  />
                </div>
                <div class="camp-info">
                  <div class="camp-card-top">
                    <span :class="['kid-tag', 'tag-' + camp.kid]">{{
                      kids[camp.kid]
                    }}</span
                    ><span
                      :class="[
                        'status',
                        { pending: camp.status !== 'Confirmed' },
                      ]"
                      >{{ camp.status === "Confirmed" ? "✓ " : ""
                      }}{{ camp.status }}</span
                    >
                  </div>
                  <h3>{{ camp.name }}</h3>
                  <p>
                    {{ dateLabel(camp.start) }} – {{ dateLabel(camp.end)
                    }}<span>·</span>{{ costLabel(camp) }}
                  </p>
                </div>
                <ChevronRight :size="15" class="card-arrow" />
              </button>
              <p v-if="!visible.length" class="empty">No camps</p>
            </div>
            <button
              v-if="tab === 'Overview'"
              class="view-all"
              @click="tab = 'Camps'"
            >
              View all camps <ArrowUpRight :size="15" />
            </button>
          </section>
        </div>
        <section
          v-if="tab === 'Overview' || tab === 'Schedule'"
          class="panel coverage-panel"
        >
          <div class="panel-heading">
            <div><h2>Weeks with care</h2></div>
            <button
              class="missing-link"
              aria-haspopup="dialog"
              @click="missingWeeksDialog?.showModal()"
            >
              Missing weeks ({{ missingWeeks.length }})
              <ArrowUpRight :size="14" />
            </button>
          </div>
          <div class="coverage-scroll">
            <div
              class="coverage-table"
              :style="{ '--week-count': weeks.length }"
            >
              <div></div>
              <div v-for="week in weeks" class="week-label">
                {{ week.label }}
              </div>
              <template v-for="(kid, i) in kids"
                ><div class="coverage-kid">
                  <span :class="['avatar', 'kid-' + i]">{{
                    kid.slice(0, 1)
                  }}</span
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
        <section v-if="tab === 'Payments'" class="panel payments-panel">
          <div class="panel-heading">
            <h2>Payments</h2>
            <span v-if="unpaidTotal" class="small-pill"
              >{{ currency(unpaidTotal) }} unpaid</span
            >
          </div>
          <div class="payments-scroll">
            <table class="payments-table">
              <thead>
                <tr>
                  <th scope="col">Week</th>
                  <th v-for="(kid, i) in kids" :key="i" scope="col">
                    <span class="payment-camper"
                      ><span :class="['avatar', 'kid-' + i]">{{
                        kid.slice(0, 1)
                      }}</span
                      >{{ kid }}</span
                    >
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in paymentRows"
                  :key="row.key"
                  :class="{
                    'no-cost-week': !row.entries.some((entries) =>
                      entries.some(hasSeparateCost),
                    ),
                  }"
                >
                  <th scope="row">
                    <strong>{{ row.label }}</strong
                    ><small>{{ row.dates }}</small>
                  </th>
                  <td
                    v-for="(entries, i) in row.entries"
                    :key="i"
                    :class="{ 'no-cost-cell': !entries.some(hasSeparateCost) }"
                  >
                    <div
                      v-for="camp in entries"
                      :key="camp.id"
                      :class="[
                        'payment-record',
                        { 'no-cost-entry': !hasSeparateCost(camp) },
                      ]"
                    >
                      <button class="payment-entry" @click="open(camp)">
                        <span
                          >{{ camp.name
                          }}<small v-if="camp.status === 'Wishlist'"
                            >Wishlist · excluded</small
                          ></span
                        ><b>{{ costLabel(camp) }}</b></button
                      ><button
                        v-if="
                          paymentOwner(camp).cost != null &&
                          paymentOwner(camp).cost! > 0
                        "
                        :class="[
                          'paid-toggle',
                          { 'is-paid': paymentOwner(camp).paid },
                        ]"
                        :aria-pressed="!!paymentOwner(camp).paid"
                        :aria-label="`${kids[camp.kid]} · ${camp.name}: ${paymentLabel(camp)}. Toggle payment status${camp.costIncludedIn ? ' for shared payment' : ''}.`"
                        @click="togglePaid(camp)"
                      >
                        <Check v-if="paymentOwner(camp).paid" :size="12" />{{
                          paymentLabel(camp)
                        }}<span v-if="camp.costIncludedIn">
                          · shared</span
                        ></button
                      ><span v-else class="payment-note">{{
                        paymentLabel(camp)
                      }}</span>
                    </div>
                    <span v-if="!entries.length" class="payment-empty">—</span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total paid</th>
                  <td v-for="(paid, i) in paidByKid" :key="i">
                    {{ currency(paid) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
        <footer>
          <button @click="exportData">
            <Download :size="14" /> Export backup
          </button>
        </footer>
      </div>
    </main>
    <dialog
      ref="missingWeeksDialog"
      class="modal missing-weeks-dialog"
      aria-labelledby="missing-weeks-title"
      @click.self="missingWeeksDialog?.close()"
    >
      <button
        class="close"
        aria-label="Close missing weeks"
        @click="missingWeeksDialog?.close()"
      >
        <X :size="21" />
      </button>
      <h2 id="missing-weeks-title">Missing weeks</h2>
      <p v-if="!missingWeeks.length" class="empty">
        Care arranged for all weeks.
      </p>
      <button
        v-for="week in missingWeeks"
        :key="week.kidIndex + '-' + week.start"
        class="missing-week"
        @click="viewMissingWeek(week.start, week.kidIndex)"
      >
        <span :class="['avatar', 'kid-' + week.kidIndex]">{{
          week.kid.slice(0, 1)
        }}</span
        ><span class="missing-week-info"
          ><strong>{{ week.kid }}</strong
          ><span
            >{{ dateLabel(week.start) }} – {{ dateLabel(week.end) }},
            {{ week.start.slice(0, 4) }}</span
          ><small>{{ week.reason }}</small></span
        ><span class="missing-link">View week <ArrowUpRight :size="14" /></span>
      </button>
    </dialog>
    <div
      v-if="modal || settings"
      class="modal-backdrop"
      @click.self="
        modal = false;
        settings = false;
      "
    >
      <section
        class="modal"
        role="dialog"
        aria-modal="true"
        :aria-label="settings ? 'Family settings' : 'Camp details'"
      >
        <button
          class="close"
          aria-label="Close"
          @click="
            modal = false;
            settings = false;
          "
        >
          <X :size="21" /></button
        ><template v-if="settings"
          ><h2>Family settings</h2>
          <label v-for="(_, i) in kids"
            >Camper {{ i + 1
            }}<input
              v-model="kids[i]"
              maxlength="24"
              placeholder="Camper name" /></label
          ><label
            >Flag handoffs within (minutes)<input
              v-model.number="handoffBuffer"
              type="number"
              min="0"
              max="180"
              required /></label
          ><button class="primary" @click="settings = false">
            Done <Check :size="16" /></button
        ></template>
        <form v-else @submit.prevent="save">
          <h2>{{ editing ? "Camp details" : "Add a camp" }}</h2>
          <label
            >Camp name<input
              v-model="form.name"
              required
              placeholder="Camp name"
          /></label>
          <div class="form-row">
            <label
              >Camper<select v-model="form.kid">
                <option v-for="(kid, i) in kids" :value="i">{{ kid }}</option>
              </select></label
            ><label
              >Status<select v-model="form.status">
                <option>Confirmed</option>
                <option>Pending</option>
                <option>Wishlist</option>
              </select></label
            >
          </div>
          <div class="form-row">
            <label
              >First day<input
                v-model="form.start"
                type="date"
                :min="`${season.year}-01-01`"
                :max="`${season.year}-12-31`"
                required /></label
            ><label
              >Last day<input
                v-model="form.end"
                type="date"
                :min="`${season.year}-01-01`"
                :max="`${season.year}-12-31`"
                required
            /></label>
          </div>
          <div class="form-row">
            <label>Drop-off<input v-model="form.dropoff" type="time" /></label
            ><label>Pickup<input v-model="form.pickup" type="time" /></label>
          </div>
          <p class="time-help">Weekday times · blank = N/A</p>
          <label
            >Location<input v-model="form.location" placeholder="Location"
          /></label>
          <div class="form-row">
            <label
              >Cost ($)<span v-if="form.costIncludedIn && form.cost == null"
                >Included in Owen’s YMCA cost</span
              ><input
                v-model.number="form.cost"
                type="number"
                min="0"
                placeholder="Not provided" /></label
            ><label
              >Type<select v-model="form.type">
                <option value="nature">Nature</option>
                <option value="art">Arts & crafts</option>
                <option value="water">Water & swim</option>
                <option value="adventure">Adventure</option>
                <option value="family">Family care</option>
                <option value="none">No camp</option>
              </select></label
            >
          </div>
          <label v-if="!form.costIncludedIn"
            >Payment status<select v-model="form.paid">
              <option :value="false">Unpaid</option>
              <option :value="true">Paid</option>
            </select></label
          >
          <p v-if="error" class="error">{{ error }}</p>
          <div class="form-actions">
            <button v-if="editing" type="button" class="delete" @click="remove">
              Delete camp</button
            ><button class="primary" type="submit">
              {{ editing ? "Save changes" : "Add camp" }} <Check :size="16" />
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>
