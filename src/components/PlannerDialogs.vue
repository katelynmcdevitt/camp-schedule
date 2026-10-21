<script setup lang="ts">
import { X, Check } from "lucide-vue-next";
import type { Camp } from "../types";

defineProps<{ editing: string; error: string; seasonYear: number }>();
const modal = defineModel<boolean>("modal", { required: true });
const settings = defineModel<boolean>("settings", { required: true });
const kids = defineModel<string[]>("kids", { required: true });
const handoffBuffer = defineModel<number>("handoffBuffer", { required: true });
const form = defineModel<Omit<Camp, "id">>("form", { required: true });
const emit = defineEmits<{ save: []; remove: [] }>();
</script>
<template>
  <div
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
      <form v-else @submit.prevent="emit('save')">
        <h2>{{ editing ? "Camp details" : "Add a camp" }}</h2>
        <label
          >Camp name<input v-model="form.name" required placeholder="Camp name"
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
              :min="`${seasonYear}-01-01`"
              :max="`${seasonYear}-12-31`"
              required /></label
          ><label
            >Last day<input
              v-model="form.end"
              type="date"
              :min="`${seasonYear}-01-01`"
              :max="`${seasonYear}-12-31`"
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
          <button
            v-if="editing"
            type="button"
            class="delete"
            @click="emit('remove')"
          >
            Delete camp</button
          ><button class="primary" type="submit">
            {{ editing ? "Save changes" : "Add camp" }} <Check :size="16" />
          </button>
        </div>
      </form>
    </section>
  </div>
</template>
