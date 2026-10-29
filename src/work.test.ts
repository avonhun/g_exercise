import { it, expect, describe } from "vitest";
import {
  fresh,
  log,
  tick,
  build,
  reverse,
  migrate,
  applyRules,
  activeGathering,
  resources,
  DAY,
} from "./engine";
import { HOUR } from "./work";
const t = Date.UTC(2026, 9, 28, 12);
const gym = (s: ReturnType<typeof fresh>, id = "gym", at = t) =>
  log(s, { id, type: "gym", at, amount: 0 }, Math.max(t, at));
function noPassive() {
  const s = fresh(t);
  s.rules.passive = {};
  return s;
}
describe("finite gathering", () => {
  it("credits an accomplishment immediately, but delivers resources gradually and only once", () => {
    const s = noPassive();
    gym(s);
    expect(s.inventory.ore).toBe(0);
    expect(s.credentials["gym:1"]).toBe(t);
    tick(s, t + 4 * HOUR);
    expect(s.inventory.ore).toBe(20);
    tick(s, t + 8 * HOUR);
    expect(s.inventory.ore).toBe(40);
    tick(s, t + 20 * DAY);
    expect(s.inventory.ore).toBe(40);
    expect(activeGathering(s)).toHaveLength(0);
  });
  it("queues repeated activity per resource without increasing current collection speed", () => {
    const s = noPassive();
    s.rules.activities.gym.cap = 3;
    gym(s, "a");
    gym(s, "b");
    expect(s.gathering[1].start).toBe(s.gathering[0].end);
    tick(s, t + 4 * HOUR);
    expect(s.inventory.ore).toBe(20);
    tick(s, t + 12 * HOUR);
    expect(s.inventory.ore).toBe(60);
    tick(s, t + 16 * HOUR);
    expect(s.inventory.ore).toBe(80);
  });
  it("starts backdated activity work now, rather than granting overdue output", () => {
    const s = noPassive();
    log(s, { id: "past", type: "hike", at: t - DAY, amount: 60 }, t);
    expect(s.inventory.wood).toBe(45);
    expect(s.gathering.every((j) => j.start === t)).toBe(true);
    tick(s, t + 4 * HOUR);
    expect(s.inventory.wood).toBe(67);
  });
  it("bounds offline progress and resumes unfinished jobs without discarding them", () => {
    const s = noPassive();
    s.rules.offlineHours = 2;
    gym(s);
    tick(s, t + 10 * DAY);
    expect(s.inventory.ore).toBe(10);
    expect(s.workClock).toBe(t + 2 * HOUR);
    tick(s, t + 10 * DAY + HOUR);
    expect(s.inventory.ore).toBe(15);
    expect(s.gathering).toHaveLength(1);
  });
  it("does not reward reloading, splitting intervals or moving the clock backward", () => {
    const a = noPassive(),
      b = noPassive();
    gym(a);
    gym(b);
    tick(a, t + 7 * HOUR);
    for (let i = 1; i <= 28; i++) tick(b, t + (i * HOUR) / 4);
    expect(a.inventory).toEqual(b.inventory);
    const loaded = migrate(JSON.parse(JSON.stringify(a)));
    tick(loaded, t);
    tick(loaded, t + 7 * HOUR);
    expect(loaded.inventory).toEqual(a.inventory);
  });
  it("snapshots payouts and timing when rules change", () => {
    const s = noPassive();
    gym(s);
    const r = structuredClone(s.rules);
    r.activities.gym.reward.ore = 400;
    r.activities.gym.gatherHours = 1;
    applyRules(s, r);
    tick(s, t + 4 * HOUR);
    expect(s.inventory.ore).toBe(20);
    expect(s.gathering[0].duration).toBe(8 * HOUR);
  });
  it("cancels undelivered resources, reverses only collected resources and closes queue gaps", () => {
    const s = noPassive();
    s.rules.activities.gym.cap = 3;
    gym(s, "a");
    gym(s, "b");
    tick(s, t + 2 * HOUR);
    expect(s.inventory.ore).toBe(10);
    reverse(s, "a", t + 2 * HOUR);
    expect(s.inventory.ore).toBe(0);
    expect(s.debt.ore).toBe(0);
    expect(s.gathering[1].start).toBe(s.workClock);
    tick(s, t + 10 * HOUR);
    expect(s.inventory.ore).toBe(40);
    expect(s.credentials["gym:1"]).toBe(t);
    expect(() => migrate(s)).not.toThrow();
  });
  it("retains partial progress in another resource when a queued job is corrected", () => {
    const s = noPassive();
    s.rules.activities.gym.cap = 3;
    gym(s, "a");
    gym(s, "b");
    tick(s, t + 2 * HOUR);
    reverse(s, "b", t + 2 * HOUR);
    tick(s, t + 8 * HOUR);
    expect(s.inventory.ore).toBe(40);
    expect(() => migrate(s)).not.toThrow();
  });
});
describe("construction and work persistence", () => {
  it("reserves materials but offers no workshop until construction finishes", () => {
    const s = noPassive();
    gym(s);
    build(s, "blacksmith", t);
    expect(s.inventory.wood).toBe(15);
    expect(s.buildings).not.toContain("blacksmith");
    expect(() => build(s, "blacksmith", t)).toThrow("construction");
    tick(s, t + 7 * HOUR);
    expect(s.buildings).not.toContain("blacksmith");
    tick(s, t + 8 * HOUR);
    expect(s.buildings).toContain("blacksmith");
    expect(s.construction[0].done).toBe(true);
  });
  it("uses a single construction crew and completes each building once", () => {
    const s = noPassive();
    log(s, { id: "walk", type: "walk", at: t, amount: 10 }, t);
    log(s, { id: "meal", type: "meal", at: t, amount: 0 }, t);
    build(s, "sawmill", t);
    build(s, "farm", t);
    expect(s.construction[1].start).toBe(t + 4 * HOUR);
    tick(s, t + 5 * HOUR);
    expect(s.buildings).toContain("sawmill");
    expect(s.buildings).not.toContain("farm");
    tick(s, t + 6 * HOUR);
    tick(s, t + 7 * HOUR);
    expect(s.buildings.filter((b) => b === "farm")).toHaveLength(1);
  });
  it("limits offline building work and preserves captured durations across balancing edits", () => {
    const s = noPassive();
    s.rules.offlineHours = 1;
    gym(s);
    build(s, "blacksmith", t);
    const r = structuredClone(s.rules);
    r.buildings.blacksmith.hours = 0.1;
    applyRules(s, r);
    tick(s, t + DAY);
    expect(s.buildings).not.toContain("blacksmith");
    expect(s.construction[0].end - s.construction[0].start).toBe(8 * HOUR);
    for (let i = 1; i <= 7; i++) tick(s, t + DAY + i * HOUR);
    expect(s.buildings).toContain("blacksmith");
  });
  it("only grows passive food after a garden has finished, including during an offline interval", () => {
    const s = fresh(t);
    log(s, { id: "meal", type: "meal", at: t, amount: 0 }, t);
    build(s, "farm", t);
    tick(s, t + 4 * HOUR);
    expect(s.inventory.food).toBeCloseTo(12 + (8 * 2) / 24);
  });
  it("roundtrips active jobs and reconciles delivered resources to the ledger", () => {
    const s = noPassive();
    gym(s);
    build(s, "blacksmith", t);
    tick(s, t + HOUR);
    const loaded = migrate(JSON.parse(JSON.stringify(s)));
    expect(loaded).toEqual(s);
    tick(loaded, t + 8 * HOUR);
    for (const r of resources)
      expect(loaded.inventory[r]).toBeCloseTo(
        loaded.ledger.reduce((n, l) => n + (l.delta[r] || 0), 0),
      );
  });
  it("rejects corrupted/overlapping queues and invalid timing rules", () => {
    const s = noPassive();
    gym(s);
    s.gathering[0].delivered = 1000;
    expect(() => migrate(s)).toThrow();
    s.gathering[0].delivered = 0;
    const r = structuredClone(s.rules);
    r.buildings.farm.hours = 0;
    expect(() => applyRules(s, r)).toThrow();
    s.gathering[0].duration = NaN;
    expect(() => migrate(s)).toThrow();
  });
  it("migrates actual v2 rewards and completed buildings without replay or demolition", () => {
    const s = fresh(t);
    const old = JSON.parse(JSON.stringify(s));
    old.schema = 2;
    delete old.workClock;
    delete old.gathering;
    delete old.construction;
    for (const rule of Object.values(old.rules.activities) as Record<
      string,
      unknown
    >[])
      delete rule.gatherHours;
    for (const b of Object.values(old.rules.buildings) as Record<
      string,
      unknown
    >[])
      delete b.hours;
    old.buildings.push("sawmill");
    old.inventory.ore = 40;
    old.ledger.push({
      id: "legacy",
      at: t,
      source: "Activity old",
      delta: { ore: 40 },
      rule: 1,
    });
    old.logs.push({
      id: "old",
      type: "gym",
      at: t,
      entered: t,
      day: "2026-10-28",
      week: 1,
      amount: 0,
      notes: "",
      reward: { ore: 40 },
      qualified: true,
      rule: 1,
    });
    const next = migrate(old);
    expect(next.schema).toBe(3);
    expect(next.inventory.ore).toBe(40);
    expect(next.buildings).toContain("sawmill");
    expect(next.gathering).toHaveLength(0);
    tick(next, t + DAY);
    expect(next.inventory.ore).toBe(40);
    reverse(next, "old", t + DAY);
    expect(next.inventory.ore).toBe(0);
  });
});
it("a zero offline allowance pauses absence without preventing active play", () => {
  const s = fresh(t);
  s.rules.offlineHours = 0;
  gym(s);
  tick(s, t + DAY);
  expect(s.inventory.ore).toBe(0);
  tick(s, t + DAY + HOUR, { active: true });
  expect(s.inventory.ore).toBe(5);
  expect(s.inventory.wood).toBeCloseTo(45 + 3 / 24);
});
