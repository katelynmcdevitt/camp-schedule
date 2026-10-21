import assert from "node:assert/strict";
import test from "node:test";
import { createPlanner } from "./helpers/planner.mjs";

test("edits, deletions, payment changes and settings persist independently across seasons", () => {
  const storage = new Map();
  const mount = (year) => createPlanner(year, storage);
  let plan = mount(2026);
  assert.equal(plan.state.camps.value.length, 22);
  plan.state.camps.value[0].paid = false;
  plan.state.handoffBuffer.value = 45;
  plan.state.kids.value[0] = "Owen edited";
  plan.state.camps.value = plan.state.camps.value.filter(
    (c) => c.id !== "owen-2026-week-2",
  );
  const original2026 = storage.get("camp-days-2026");
  plan.stop();
  plan = mount(2027);
  assert.equal(plan.state.camps.value.length, 0);
  assert.equal(plan.state.selectedWeek.value, "2027-06-14");
  assert.equal(plan.state.form.value.start, "2027-06-14");
  assert.equal(plan.state.form.value.end, "2027-06-18");
  plan.state.form.value = {
    ...plan.state.form.value,
    name: "2027 camp",
    cost: 200,
  };
  plan.state.save();
  assert.equal(plan.state.camps.value.length, 1);
  assert.equal(plan.state.camps.value[0].paid, false);
  assert.equal(storage.get("camp-days-2026"), original2026);
  plan.stop();
  plan = mount(2026);
  assert.equal(plan.state.camps.value.length, 21);
  assert.equal(plan.state.camps.value[0].paid, false);
  assert.equal(plan.state.kids.value[0], "Owen edited");
  assert.equal(plan.state.handoffBuffer.value, 45);
  plan.stop();
  plan = mount(2027);
  assert.equal(plan.state.camps.value[0].name, "2027 camp");
  plan.state.camps.value = [];
  plan.stop();
  plan = mount(2027);
  assert.equal(plan.state.camps.value.length, 0);
  plan.stop();
});
