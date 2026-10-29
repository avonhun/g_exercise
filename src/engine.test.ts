import { describe, it, expect } from "vitest";
import {
  DAY,
  seed,
  fresh,
  log,
  count,
  queue,
  tick,
  build,
  requirements,
  reverse,
  applyRules,
  migrate,
  simulate,
  consecutive,
  validateRules,
  resources,
  fulfill,
  trade,
  afford,
  explore,
} from "./engine";
const t = new Date("2026-10-28T12:00:00").getTime();
function add(
  s: ReturnType<typeof fresh>,
  type: Parameters<typeof log>[1]["type"],
  at = t,
  id = "a",
  amount = 60,
) {
  log(s, { id, type, at, amount }, Math.max(t, at));
}
describe("activity and permanent accomplishments", () => {
  it("awards gym ore once per stable ID and caps same-day repeat logs", () => {
    const s = fresh(t);
    add(s, "gym");
    add(s, "gym");
    add(s, "gym", t, "b");
    expect(s.inventory.ore).toBe(40);
    expect(count(s, "gym")).toBe(1);
  });
  it("does not convert soccer or resources into strength credit", () => {
    const s = fresh(t);
    add(s, "soccer");
    s.inventory.wood = 10000;
    s.inventory.stone = 10000;
    expect(() => build(s, "blacksmith", t)).toThrow("credentials");
    expect(requirements(s, "blacksmith")).toContain("1 Gym session");
  });
  it("small activities reward daily consistency without becoming gym or hikes", () => {
    const s = fresh(t);
    add(s, "walk");
    add(s, "pushups", t, "b", 5);
    expect(count(s, "gym")).toBe(0);
    expect(count(s, "hike")).toBe(0);
    expect(s.inventory.ore).toBe(3);
    expect(s.credentials["pushups:1"]).toBe(t);
  });
  it("requires a meaningful walk or hike, not a zero-minute entry", () => {
    const s = fresh(t);
    add(s, "walk", t, "a", 0);
    add(s, "hike", t, "b", 20);
    expect(count(s, "walk")).toBe(0);
    expect(count(s, "hike")).toBe(0);
  });
  it("counts distinct consecutive calendar weeks, retaining lifetime credit after a gap", () => {
    const s = fresh(t - 40 * DAY);
    for (const [i, d] of [0, 1, 7, 14].entries())
      add(s, "gym", t + d * DAY, String(i));
    expect(consecutive(s, "gym")).toBe(3);
    expect(s.credentials["gym:weeks3"]).toBeTruthy();
    add(s, "gym", t + 35 * DAY, "end");
    expect(count(s, "gym")).toBe(5);
    expect(consecutive(s, "gym")).toBe(3);
  });
  it("corrections reverse rewards once and retain earned credentials", () => {
    const s = fresh(t);
    add(s, "gym");
    reverse(s, "a", t);
    reverse(s, "a", t);
    expect(s.inventory.ore).toBe(0);
    expect(count(s, "gym")).toBe(0);
    expect(s.credentials["gym:1"]).toBeTruthy();
  });
  it("spent corrections produce a debt repaid by future earnings without negative inventory", () => {
    const s = fresh(t);
    add(s, "gym");
    s.inventory.ore = 2;
    reverse(s, "a", t);
    expect(s.debt.ore).toBe(38);
    expect(s.inventory.ore).toBe(0);
    add(s, "gym", t + DAY, "next");
    expect(s.inventory.ore).toBe(2);
    expect(s.debt.ore).toBe(0);
  });
  it("rejects future timestamps and malformed input", () => {
    const s = fresh(t);
    expect(() =>
      log(s, { id: "bad", type: "gym", at: t + DAY, amount: 10 }, t),
    ).toThrow();
    expect(() =>
      log(s, { id: "bad", type: "walk", at: t, amount: NaN }, t),
    ).toThrow();
  });
});
describe("accounting and time", () => {
  it("reserves inputs atomically and prevents overdrafts", () => {
    const s = fresh(t);
    queue(s, "stone", "j1", t);
    expect(s.inventory.wood).toBe(42);
    s.inventory.wood = 0;
    const before = structuredClone(s);
    expect(() => queue(s, "stone", "j2", t)).toThrow();
    expect(s).toEqual(before);
  });
  it("completes serial queued jobs exactly once offline", () => {
    const s = fresh(t);
    queue(s, "stone", "a", t);
    queue(s, "stone", "b", t);
    expect(s.jobs[1].end).toBe(t + 2 * 3600000);
    tick(s, t + DAY);
    const stone = s.inventory.stone;
    tick(s, t + DAY);
    expect(s.inventory.stone).toBe(stone);
    expect(s.jobs.every((j) => j.done)).toBe(true);
    expect(s.ledger.filter((x) => x.source === "Craft stone")).toHaveLength(2);
  });
  it("caps offline production at 72h without destroying progress across a missed month", () => {
    const s = fresh(t);
    add(s, "gym");
    build(s, "blacksmith", t);
    const before = structuredClone(s);
    tick(s, t + 28 * DAY);
    expect(s.inventory.wood - before.inventory.wood).toBe(9);
    expect(s.buildings).toEqual(before.buildings);
    expect(s.credentials).toEqual(before.credentials);
    expect(s.inventory.ore).toBe(40);
  });
  it("does not reward rolling the clock backward", () => {
    const s = fresh(t);
    tick(s, t + DAY);
    const before = structuredClone(s);
    tick(s, t);
    tick(s, t + DAY);
    expect(s).toEqual(before);
  });
  it("inventory reconciles to resource ledger", () => {
    const s = fresh(t);
    add(s, "gym");
    queue(s, "stone", "j", t);
    tick(s, t + DAY);
    reverse(s, "a", t + DAY);
    for (const r of resources)
      expect(s.inventory[r]).toBeCloseTo(
        s.ledger.reduce((n, l) => n + (l.delta[r] || 0), 0),
      );
  });
  it("bounded merchant and commissions cannot award twice", () => {
    const s = fresh(t);
    s.inventory.food = 20;
    s.inventory.herbs = 4;
    fulfill(s, "pantry", t);
    expect(() => fulfill(s, "pantry", t)).toThrow();
    trade(s, t);
    expect(() => trade(s, t)).toThrow();
    expect(count(s, "gym")).toBe(0);
  });
});
describe("rules, saves and isolated simulation", () => {
  it("seed configuration validates", () =>
    expect(validateRules(seed)).toEqual([]));
  it("preserves prior awards, credentials and queued output on forward-only edits", () => {
    const s = fresh(t);
    add(s, "gym");
    queue(s, "stone", "j", t);
    const rules = structuredClone(s.rules);
    rules.activities.gym.reward.ore = 4;
    rules.activities.gym.minimum = 30;
    rules.recipes.stone.output.stone = 100;
    applyRules(s, rules);
    tick(s, t + DAY);
    add(s, "gym", t + DAY, "b");
    expect(s.inventory.ore).toBe(44);
    expect(s.jobs[0].output.stone).toBe(6);
    expect(s.credentials["gym:1"]).toBe(t);
  });
  it("rejects negative rates and circular building dependencies", () => {
    const r = structuredClone(seed);
    r.passive.wood = -1;
    r.buildings.sawmill.buildings = ["kitchen"];
    r.buildings.kitchen.buildings = ["sawmill"];
    expect(validateRules(r).join(" ")).toMatch("Circular");
    expect(validateRules(r)).toContain("Invalid passive production");
  });
  it("roundtrips saves with earned credit, jobs and discoveries", () => {
    const s = fresh(t);
    add(s, "gym");
    queue(s, "stone", "j", t);
    s.discoveries.push("brook");
    expect(migrate(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it("migrates v1 without erasing inventory or credentials", () => {
    const s = fresh(t);
    add(s, "gym");
    const old = { ...s, schema: 1, debt: undefined };
    const result = migrate(old);
    expect(result.schema).toBe(2);
    expect(result.credentials).toEqual(s.credentials);
    expect(result.inventory).toEqual(s.inventory);
    expect(result.debt).toEqual({});
  });
  it("rejects corrupt saves and unsupported future schemas", () => {
    expect(() => migrate({ schema: 99 })).toThrow();
    const s = fresh(t);
    s.inventory.wood = -1;
    expect(() => migrate(s)).toThrow();
  });
  it("simulations never alter live state or build gates automatically", () => {
    const s = fresh(t);
    const before = JSON.stringify(s);
    const result = simulate(s, 30, "routine");
    expect(JSON.stringify(s)).toBe(before);
    expect(count(result, "gym")).toBe(4);
    expect(result.buildings).toEqual(["hall"]);
  });
});

describe("starter campaign reachability", () => {
  it("reaches the concealed encounter through earned activities and production without grants", () => {
    const s = fresh(t);
    let serial = 0;
    for (let d = 0; d <= 28; d++) {
      const now = t + d * DAY;
      tick(s, now);
      const activity = (type: Parameters<typeof log>[1]["type"], amount = 60) =>
        log(s, { id: "routine" + serial++, type, at: now, amount }, now);
      activity("walk", 10);
      activity("meal", 0);
      activity("plants", 0);
      if ([7, 14, 21].includes(d)) activity("gym", 0);
      if (d % 7 === 0) activity("soccer", 0);
      if (d === 0 || d === 14) activity("hike", 60);
      for (const id of ["sawmill", "farm", "blacksmith", "kitchen", "hall2"])
        if (
          !s.buildings.includes(id) &&
          !requirements(s, id).length &&
          afford(s, s.rules.buildings[id].cost)
        )
          build(s, id, now);
      for (const [id, target] of [
        ["planks", 4],
        ["fittings", 2],
        ["rations", 2],
      ] as const) {
        const r = s.rules.recipes[id];
        if (
          s.buildings.includes(r.building) &&
          s.jobs.filter((j) => j.recipe === id).length < target &&
          afford(s, r.input)
        )
          queue(s, id, "job" + serial++, now);
      }
    }
    expect(s.buildings).toContain("hall2");
    explore(s, t + 28 * DAY);
    expect(s.discoveries).toContain("brook");
    expect(() => explore(s, t + 28 * DAY)).toThrow("already");
    for (const r of resources)
      expect(s.inventory[r]).toBeCloseTo(
        s.ledger.reduce((n, l) => n + (l.delta[r] || 0), 0),
      );
  });
  it("accepts a corrected replacement on the same day without duplicate payout", () => {
    const s = fresh(t);
    add(s, "gym");
    reverse(s, "a", t);
    add(s, "gym", t, "replacement");
    expect(count(s, "gym")).toBe(1);
    expect(s.inventory.ore).toBe(40);
  });
});

describe("long-term audit sizing and forward-only passive rates", () => {
  it("batches short ticks without losing elapsed production time", () => {
    const s = fresh(t);
    for (let m = 1; m <= 59; m++) tick(s, t + m * 60000);
    expect(s.inventory.wood).toBe(45);
    tick(s, t + 3600000);
    expect(s.inventory.wood).toBeCloseTo(45 + 3 / 24);
    expect(
      s.ledger.filter((x) => x.source === "Village production"),
    ).toHaveLength(1);
  });
  it("settles pending time at the old rate before a rule change", () => {
    const s = fresh(t);
    tick(s, t + 1800000);
    const r = structuredClone(s.rules);
    r.passive.wood = 24;
    applyRules(s, r);
    expect(s.inventory.wood).toBeCloseTo(45 + 3 / 48);
    tick(s, t + 5400000);
    expect(s.inventory.wood).toBeCloseTo(46 + 3 / 48);
    expect(s.ruleHistory).toHaveLength(2);
  });
});

it("detects implicit resource cycles even without explicit building prerequisites", () => {
  const r = structuredClone(seed);
  r.buildings.sawmill.cost = { planks: 1 };
  expect(validateRules(r).join(" ")).toContain(
    "Unreachable building / resource dependency: sawmill",
  );
});

describe("review regressions", () => {
  it("does not retroactively grow garden food before construction", () => {
    const s = fresh(t);
    add(s, "meal");
    tick(s, t + 1800000);
    build(s, "farm", t + 1800000);
    const food = s.inventory.food;
    tick(s, t + 5400000);
    expect(s.inventory.food - food).toBeCloseTo(8 / 24);
  });
  it("home strength cannot be bypassed with an old gym streak", () => {
    const s = fresh(t);
    s.rules.strengthMode = "home";
    s.credentials["gym:weeks3"] = t;
    expect(requirements(s, "hall2").join(" ")).toContain("home strength days");
  });
  it("limits backdating relative to now rather than world creation", () => {
    const s = fresh(t - 800 * DAY);
    expect(() =>
      log(s, { id: "old", type: "gym", at: t - 366 * DAY, amount: 0 }, t),
    ).toThrow();
  });
  it("rejects debt corruption, duplicate IDs and unknown output resources", () => {
    const s = fresh(t);
    add(s, "gym");
    s.logs.push({ ...s.logs[0] });
    expect(() => migrate(s)).toThrow();
    s.logs.pop();
    s.debt.ore = -4;
    expect(() => migrate(s)).toThrow();
    s.debt = {};
    queue(s, "stone", "j", t);
    (s.jobs[0].output as Record<string, number>).unobtainium = 100;
    expect(() => migrate(s)).toThrow();
  });
  it("allows deleted recipe history after all jobs complete", () => {
    const s = fresh(t);
    queue(s, "stone", "j", t);
    tick(s, t + DAY);
    const r = structuredClone(s.rules);
    delete r.recipes.stone;
    applyRules(s, r);
    expect(() => migrate(s)).not.toThrow();
  });
  it("prevents moving an active recipe to another workshop", () => {
    const s = fresh(t);
    queue(s, "stone", "j", t);
    const r = structuredClone(s.rules);
    r.recipes.stone.building = "sawmill";
    expect(() => applyRules(s, r)).toThrow("active recipes");
  });
  it("returns validation errors for malformed JSON instead of crashing", () => {
    expect(
      validateRules({ ...seed, recipes: { bad: null } } as never).length,
    ).toBeGreaterThan(0);
  });
});
