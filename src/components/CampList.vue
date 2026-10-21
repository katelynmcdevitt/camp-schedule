<script setup lang="ts">
import {
  ArrowUpRight,
  ChevronRight,
  Leaf,
  Waves,
  Palette,
  Mountain,
} from "lucide-vue-next";
import type { Camp } from "../types";

defineProps<{
  tab: string;
  visible: Camp[];
  kids: string[];
  dateLabel: (date: string) => string;
  costLabel: (camp: Camp) => string;
}>();
const filter = defineModel<number>("filter", { required: true });
const emit = defineEmits<{ edit: [camp: Camp]; showCamps: [] }>();
</script>
<template>
  <section class="panel camp-panel">
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
        @click="emit('edit', camp)"
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
            ><span :class="['status', { pending: camp.status !== 'Confirmed' }]"
              >{{ camp.status === "Confirmed" ? "✓ " : ""
              }}{{ camp.status }}</span
            >
          </div>
          <h3>{{ camp.name }}</h3>
          <p>
            {{ dateLabel(camp.start) }} – {{ dateLabel(camp.end) }}<span>·</span
            >{{ costLabel(camp) }}
          </p>
        </div>
        <ChevronRight :size="15" class="card-arrow" />
      </button>
      <p v-if="!visible.length" class="empty">No camps</p>
    </div>
    <button
      v-if="tab === 'Overview'"
      class="view-all"
      @click="emit('showCamps')"
    >
      View all camps <ArrowUpRight :size="15" />
    </button>
  </section>
</template>
