<script setup lang="ts">
import {
  Sun,
  CalendarDays,
  LayoutDashboard,
  Tent,
  Wallet,
  Settings2,
} from "lucide-vue-next";

defineProps<{ kids: string[]; campCount: number; storageError: boolean }>();
const tab = defineModel<string>("tab", { required: true });
const filter = defineModel<number>("filter", { required: true });
const emit = defineEmits<{ settings: [] }>();
</script>
<template>
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
          campCount
        }}</span>
      </button>
    </nav>
    <div class="sidebar-kids">
      <div class="workspace-label">
        YOUR CAMPERS
        <button aria-label="Edit campers" @click="emit('settings')">
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

    <button class="settings-link" @click="emit('settings')">
      <Settings2 :size="17" /> Family settings
    </button>
    <div class="local-note" role="status">
      <span></span>{{ storageError ? "Not saved" : "Saved on this device" }}
    </div>
  </aside>
</template>
