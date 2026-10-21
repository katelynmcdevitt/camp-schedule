import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import ts from "typescript";
const source = fs.readFileSync(
  new URL("../src/lib/handoffs.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const { formatTime, handoffWarnings } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);
const camps = ["owen", "kayleigh"].flatMap((kid, i) =>
  JSON.parse(
    fs.readFileSync(new URL(`../src/data/${kid}.json`, import.meta.url)),
  ).camps.map((c) => ({ ...c, kid: i })),
);
test("handoffs detect simultaneous events, short gaps, and cross pickup/drop-off conflicts", () => {
  const first = handoffWarnings(camps, "2026-06-15", 30);
  assert.equal(first.length, 2);
  assert.ok(first.every((w) => w.gap === 0));
  assert.equal(handoffWarnings(camps, "2026-06-22", 30).length, 1);
  assert.equal(handoffWarnings(camps, "2026-06-22", 30)[0].gap, 15);
  assert.equal(handoffWarnings(camps, "2026-06-22", 10).length, 0);
  assert.equal(handoffWarnings(camps, "2026-06-29", 30).length, 0);
  assert.equal(handoffWarnings(camps, "2026-08-17", 30).length, 0);
  assert.equal(handoffWarnings(camps, "2026-07-06", 30).length, 2);
  assert.equal(formatTime("12:00"), "12:00 PM");
  assert.equal(formatTime("08:45"), "8:45 AM");
  assert.equal(formatTime(null), "N/A");
  const custom = (kid, dropoff, pickup) => ({
    id: String(kid),
    kid,
    name: "Camp",
    start: "2026-06-15",
    end: "2026-06-19",
    status: "Confirmed",
    type: "art",
    dropoff,
    pickup,
  });
  assert.ok(
    handoffWarnings(
      [custom(0, "08:00", "12:00"), custom(1, "12:15", "17:00")],
      "2026-06-15",
      30,
    ).some((w) => w.a.kind === "pickup" && w.b.kind === "dropoff"),
  );
  assert.equal(
    handoffWarnings(
      [custom(0, "08:00", "12:00"), custom(0, "08:00", "12:00")],
      "2026-06-15",
      30,
    ).length,
    0,
  );
  assert.equal(
    handoffWarnings(
      [
        { ...custom(1, "08:00", "12:00"), status: "Wishlist" },
        custom(0, "08:00", "12:00"),
      ],
      "2026-06-15",
      30,
    ).length,
    0,
  );
  assert.equal(camps.length, 22);
  assert.equal(
    camps.filter((c) => c.dropoff === null && c.pickup === null).length,
    7,
  );
});
