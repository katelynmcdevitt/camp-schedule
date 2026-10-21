<script setup lang="ts">
import { Check } from "lucide-vue-next";
import type { Camp, PaymentRow } from "../types";

defineProps<{
  kids: string[];
  paymentRows: PaymentRow[];
  unpaidTotal: number;
  paidByKid: number[];
  currency: (value: number) => string;
  costLabel: (camp: Camp) => string;
  hasSeparateCost: (camp: Camp) => boolean;
  paymentOwner: (camp: Camp) => Camp;
  paymentLabel: (camp: Camp) => string;
}>();
const emit = defineEmits<{ edit: [camp: Camp]; togglePaid: [camp: Camp] }>();
</script>
<template>
  <section class="panel payments-panel">
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
                <button class="payment-entry" @click="emit('edit', camp)">
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
                  @click="emit('togglePaid', camp)"
                >
                  <Check v-if="paymentOwner(camp).paid" :size="12" />{{
                    paymentLabel(camp)
                  }}<span v-if="camp.costIncludedIn"> · shared</span></button
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
</template>
