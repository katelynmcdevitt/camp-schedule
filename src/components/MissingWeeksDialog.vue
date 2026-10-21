<script setup lang="ts">
import { ArrowUpRight, X } from "lucide-vue-next";
import type { MissingWeek } from "../types";

import { ref } from "vue";
defineProps<{
  missingWeeks: MissingWeek[];
  dateLabel: (date: string) => string;
}>();
const emit = defineEmits<{ viewWeek: [start: string, kid: number] }>();
const dialog = ref<HTMLDialogElement | null>(null);
const showModal = () => dialog.value?.showModal();
const close = () => dialog.value?.close();
defineExpose({ showModal, close });
</script>
<template>
  <dialog
    ref="dialog"
    class="modal missing-weeks-dialog"
    aria-labelledby="missing-weeks-title"
    @click.self="close()"
  >
    <button class="close" aria-label="Close missing weeks" @click="close()">
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
      @click="emit('viewWeek', week.start, week.kidIndex)"
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
</template>
