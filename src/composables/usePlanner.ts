import { ref, computed, watch } from "vue";
import owen from "../data/owen.json";
import kayleigh from "../data/kayleigh.json";
import general from "../data/general.json";
import { handoffWarnings } from "../lib/handoffs";
import type { Camp } from "../types";

export const usePlanner = (seasonYear: number) => {
  // Each mounted planner owns one season; switching years remounts it.
  const coverageDate = new Date(seasonYear, 5, 15, 12);
  coverageDate.setDate(
    coverageDate.getDate() - ((coverageDate.getDay() + 6) % 7),
  );
  const season =
    seasonYear === general.season.year
      ? general.season
      : {
          ...general.season,
          year: seasonYear,
          coverageStart: `${coverageDate.getFullYear()}-${String(coverageDate.getMonth() + 1).padStart(2, "0")}-${String(coverageDate.getDate()).padStart(2, "0")}`,
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
      camp.paid =
        initial.find((source) => source.id === camp.id)?.paid ?? false;
  }
  // Migrate the old categories without changing any other saved camp details.
  const campTypes = [
    "Dance",
    "Theater",
    "Soccer",
    "Sports",
    "YMCA",
    "Grandparent",
    "Other",
  ];
  for (const camp of startingCamps) {
    if (!campTypes.includes(camp.type)) {
      if (camp.type === "none") camp.noCamp = true;
      const name = camp.name.toLowerCase();
      camp.type = name.includes("dance")
        ? "Dance"
        : name.includes("soccer")
          ? "Soccer"
          : name === "ymca"
            ? "YMCA"
            : camp.type === "family"
              ? "Grandparent"
              : ["football", "sports"].some((sport) => name.includes(sport))
                ? "Sports"
                : "Other";
    }
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
  const missingWeeksDialog = ref<{
    showModal: () => void;
    close: () => void;
  } | null>(null);
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
        label: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        filled: kids.value.map((_, k) =>
          camps.value.some(
            (c) =>
              c.kid === k &&
              c.status === "Confirmed" &&
              !c.noCamp &&
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
              c.noCamp &&
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

  return {
    coverageDate,
    season,
    campers,
    initial,
    seasonStart,
    firstWeekEnd,
    defaultCampEnd,
    totalCamperWeeks,
    storageKey,
    importedSchedule,
    appliedImports,
    startingCamps,
    timesImport,
    camps,
    hasSeparateCost,
    paymentOwner,
    paymentLabel,
    togglePaid,
    sampleNames,
    kids,
    calendarView,
    selectedWeek,
    handoffBuffer,
    tab,
    missingWeeksDialog,
    modal,
    blank,
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
    localISO,
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
    month,
    year,
    settings,
    editing,
    error,
    storageError,
  };
};
