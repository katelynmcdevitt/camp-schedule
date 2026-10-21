import test from "node:test";
import assert from "node:assert/strict";
import { createPlanner } from "./helpers/planner.mjs";

const withPlanner = (year, run) => {
  const plan = createPlanner(year);
  try {
    run(plan.state, plan.storage);
  } finally {
    plan.stop();
  }
};

test("supplied payments total correctly and shared payments toggle once", () =>
  withPlanner(2026, (state) => {
    assert.equal(state.total.value, 4726.8);
    assert.deepEqual(state.paidByKid.value, [2959.8, 1767]);
    const shared = state.camps.value.find(
      (c) => c.id === "kayleigh-2026-week-6",
    );
    const owner = state.paymentOwner(shared);
    state.togglePaid(shared);
    assert.equal(owner.paid, false);
    assert.equal(state.paymentLabel(shared), "Unpaid");
    assert.ok(Math.abs(state.total.value - 4057) < 0.001);
    assert.equal(state.unpaidTotal.value, 669.8);
    state.togglePaid(owner);
    assert.equal(state.paymentLabel(shared), "Paid");
    assert.equal(state.total.value, 4726.8);
  }));

test("family care is covered and No Camp appears in missing weeks", () =>
  withPlanner(2026, (state) => {
    assert.equal(state.covered.value, 21);
    assert.equal(state.missingWeeks.value.length, 1);
    assert.equal(state.missingWeeks.value[0].kid, "Kayleigh");
    assert.equal(state.missingWeeks.value[0].start, "2026-08-17");
    assert.equal(state.missingWeeks.value[0].reason, "No camp");
    state.viewMissingWeek("2026-08-17", 1);
    assert.equal(state.tab.value, "Schedule");
    assert.equal(state.calendarView.value, "week");
    assert.equal(state.filter.value, 1);
  }));

test("payment rows contain all eleven weeks and count spanning camps once", () =>
  withPlanner(2027, (state) => {
    state.form.value = {
      ...state.form.value,
      name: "Two weeks",
      end: "2027-06-25",
      cost: 500,
      paid: true,
    };
    state.save();
    assert.equal(state.paymentRows.value.length, 11);
    assert.equal(
      state.paymentRows.value.flatMap((row) => row.entries.flat()).length,
      1,
    );
    assert.equal(state.total.value, 500);
    state.camps.value[0].status = "Wishlist";
    assert.equal(state.total.value, 0);
    assert.equal(state.covered.value, 0);
  }));

test("new camps start unpaid and can be edited and deleted", () =>
  withPlanner(2027, (state, storage) => {
    state.form.value.name = "New camp";
    state.form.value.cost = 200;
    state.save();
    assert.equal(state.camps.value.length, 1);
    assert.equal(state.total.value, 0);
    assert.equal(state.unpaidTotal.value, 200);
    state.open(state.camps.value[0]);
    state.form.value.name = "Updated camp";
    state.save();
    assert.equal(state.camps.value.length, 1);
    assert.equal(state.camps.value[0].name, "Updated camp");
    state.open(state.camps.value[0]);
    state.remove();
    assert.deepEqual(JSON.parse(storage.get("camp-days-2027")).camps, []);
  }));

test("invalid camp names, dates and pickup times do not save", () =>
  withPlanner(2027, (state) => {
    const original = { ...state.form.value };
    const invalid = [
      { name: "   " },
      { name: "Wrong year", start: "2026-06-15" },
      { name: "Reversed dates", end: "2027-06-13" },
      { name: "Reversed times", dropoff: "15:00", pickup: "08:00" },
    ];
    for (const fields of invalid) {
      state.form.value = { ...original, ...fields };
      state.save();
      assert.ok(state.error.value);
      assert.equal(state.camps.value.length, 0);
    }
  }));

test("handoff warnings compare both kids even when only one kid is visible", () =>
  withPlanner(2026, (state) => {
    state.filter.value = 0;
    assert.ok(
      state.weekDays.value.every((day) => day.camps.every((c) => c.kid === 0)),
    );
    assert.equal(state.weekWarningDays.value, 5);
    assert.equal(state.weekDays.value[0].warnings.length, 2);
  }));

test("storage failures warn the user while allowing in-memory editing", () =>
  withPlanner(2027, (state) => {
    globalThis.localStorage.setItem = () => {
      throw new Error("Storage full");
    };
    state.form.value.name = "Still editable";
    state.save();
    assert.equal(state.storageError.value, true);
    assert.equal(state.camps.value[0].name, "Still editable");
  }));

test("legacy camp types migrate without changing saved costs or no-care weeks", () => {
  const first = createPlanner(2026);
  const storage = first.storage;
  first.stop();
  const saved = JSON.parse(storage.get("camp-days-2026"));
  saved.camps.find((c) => c.id === "owen-2026-week-1").type = "adventure";
  saved.camps.find((c) => c.id === "kayleigh-2026-week-5").type = "art";
  saved.camps.find((c) => c.id === "kayleigh-2026-week-3").type = "family";
  const noCamp = saved.camps.find((c) => c.id === "kayleigh-2026-week-10");
  noCamp.type = "none";
  delete noCamp.noCamp;
  storage.set("camp-days-2026", JSON.stringify(saved));
  const migrated = createPlanner(2026, storage);
  try {
    const entries = migrated.state.camps.value;
    assert.equal(
      entries.find((c) => c.id === "owen-2026-week-1").type,
      "Sports",
    );
    assert.equal(
      entries.find((c) => c.id === "kayleigh-2026-week-5").type,
      "Dance",
    );
    assert.equal(
      entries.find((c) => c.id === "kayleigh-2026-week-3").type,
      "Grandparent",
    );
    assert.equal(
      entries.find((c) => c.id === "kayleigh-2026-week-10").type,
      "Other",
    );
    assert.equal(
      entries.find((c) => c.id === "kayleigh-2026-week-10").noCamp,
      true,
    );
    assert.equal(migrated.state.covered.value, 21);
    assert.equal(migrated.state.total.value, 4726.8);
    assert.equal(migrated.state.blank().type, "Other");
  } finally {
    migrated.stop();
  }
});
