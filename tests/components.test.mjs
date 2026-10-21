import test from "node:test";
import assert from "node:assert/strict";
import { nextTick } from "vue";
import { createPlanner } from "./helpers/planner.mjs";
import {
  loadComponent,
  mountComponent,
  findNodes,
  textContent,
} from "./helpers/components.mjs";

const Summary = await loadComponent("PlannerSummary");
const Sidebar = await loadComponent("PlannerSidebar");
const Payments = await loadComponent("PaymentsTable");
const Care = await loadComponent("CareOverview");

test("summary emits the missing-weeks action", () => {
  let opened = false;
  const view = mountComponent(Summary, () => ({
    covered: 21,
    totalCamperWeeks: 22,
    missingCount: 1,
    total: 4726.8,
    unpaidTotal: 0,
    currency: String,
    onMissing: () => {
      opened = true;
    },
  }));
  try {
    findNodes(view.root, (node) => node.tag === "button")[0].props.onClick();
    assert.equal(opened, true);
    assert.match(textContent(view.root), /21/);
  } finally {
    view.stop();
  }
});

test("sidebar emits navigation, filtering and settings actions", () => {
  const actions = [];
  const view = mountComponent(Sidebar, () => ({
    kids: ["Owen", "Kayleigh"],
    campCount: 22,
    storageError: false,
    tab: "Overview",
    filter: -1,
    "onUpdate:tab": (value) => actions.push(["tab", value]),
    "onUpdate:filter": (value) => actions.push(["filter", value]),
    onSettings: () => actions.push(["settings"]),
  }));
  try {
    const buttons = findNodes(view.root, (node) => node.tag === "button");
    buttons
      .find((node) => textContent(node).includes("Schedule"))
      .props.onClick();
    buttons
      .find((node) => textContent(node).includes("Kayleigh"))
      .props.onClick();
    buttons
      .find((node) => textContent(node).includes("Family settings"))
      .props.onClick();
    assert.deepEqual(actions, [
      ["tab", "Schedule"],
      ["filter", 1],
      ["settings"],
    ]);
  } finally {
    view.stop();
  }
});

test("payments component preserves editing, shared payment toggles and muted entries", async () => {
  const plan = createPlanner(2026);
  const state = plan.state;
  const view = mountComponent(Payments, () => ({
    kids: state.kids.value,
    paymentRows: state.paymentRows.value,
    unpaidTotal: state.unpaidTotal.value,
    paidByKid: state.paidByKid.value,
    currency: state.currency,
    costLabel: state.costLabel,
    hasSeparateCost: state.hasSeparateCost,
    paymentOwner: state.paymentOwner,
    paymentLabel: state.paymentLabel,
    onEdit: state.open,
    onTogglePaid: state.togglePaid,
  }));
  try {
    const shared = findNodes(
      view.root,
      (node) =>
        node.tag === "button" &&
        node.props["aria-label"]?.includes("Kayleigh · YMCA") &&
        node.props["aria-label"]?.includes("shared payment"),
    )[0];
    assert.ok(shared);
    shared.props.onClick();
    await nextTick();
    assert.equal(
      state.paymentOwner(
        state.camps.value.find((c) => c.id === "kayleigh-2026-week-6"),
      ).paid,
      false,
    );
    assert.ok(
      findNodes(view.root, (node) => node.props.class?.includes("no-cost-cell"))
        .length > 0,
    );
    findNodes(
      view.root,
      (node) => node.tag === "button" && node.props.class === "payment-entry",
    )[0].props.onClick();
    assert.equal(state.modal.value, true);
    assert.equal(state.form.value.name, "Football");
  } finally {
    view.stop();
    plan.stop();
  }
});

test("care grid keeps all eleven headers and both camper rows", () => {
  const plan = createPlanner(2026);
  let missing = false;
  const view = mountComponent(Care, () => ({
    weeks: plan.state.weeks.value,
    kids: plan.state.kids.value,
    missingCount: 1,
    onMissing: () => {
      missing = true;
    },
  }));
  try {
    assert.equal(
      findNodes(view.root, (node) => node.props.class === "week-label").length,
      11,
    );
    assert.equal(
      findNodes(view.root, (node) =>
        node.props.class?.includes("coverage-cell"),
      ).length,
      22,
    );
    const grid = findNodes(
      view.root,
      (node) => node.props.class === "coverage-table",
    )[0];
    assert.equal(grid.props.style["--week-count"], 11);
    findNodes(view.root, (node) => node.tag === "button")[0].props.onClick();
    assert.equal(missing, true);
  } finally {
    view.stop();
    plan.stop();
  }
});
