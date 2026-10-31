import { describe, expect, it } from "vitest";
import oldWorld from "../e2e/fixtures/v04-world.json";
import { build, fresh, log, migrate, requirements, type Save } from "./engine";
import {
  knownBuildings,
  knownResources,
  resourceSources,
} from "./guideContent";
import { settlementDetails } from "./SettlementLife";

describe("village update and existing worlds", () => {
  it("preserves an exported v0.4 world's history, balances and in-flight work", () => {
    const raw = structuredClone(oldWorld);
    const save = migrate(raw);
    for (const field of [
      "logs",
      "ledger",
      "inventory",
      "credentials",
      "buildings",
      "orders",
      "discoveries",
      "jobs",
      "gathering",
      "construction",
      "debt",
      "created",
      "clock",
      "workClock",
      "productionAt",
    ] as const)
      expect(save[field], field).toEqual(raw[field]);
    expect(save.rules.offlineHours).toBe(48);
    expect(save.rules.activities.walk.reward.wood).toBe(7);
    expect(save.rules.activities.meal.cap).toBe(4);
    expect(save.rules.buildings.blacksmith.goals).toEqual({ cardio: 1 });
    expect(save.ruleHistory!.slice(0, -1)).toEqual(raw.ruleHistory);
    expect(save.audit.slice(0, -1)).toEqual(raw.audit);
    expect(migrate(save)).toEqual(save);
    expect(raw).toEqual(oldWorld);
  });
  it("also migrates the former selected home-strength alternative", () => {
    const raw = structuredClone(oldWorld) as unknown as Save;
    raw.rules.strengthMode = "home";
    raw.rules.buildings.blacksmith.goals = {
      pushups: 7,
    };
    const save = migrate(raw);
    expect(save.rules.buildings.blacksmith.goals).toEqual({ cardio: 1 });
    expect(save.logs).toEqual(raw.logs);
  });
  it("keeps previously earned blacksmith access without inventing cardio credit", () => {
    const save = fresh(Date.now());
    delete save.contentVersion;
    save.rules.buildings.blacksmith.goals = { gym: 1 };
    log(
      save,
      { id: "earned-before-update", type: "gym", at: save.clock, amount: 0 },
      save.clock,
    );
    const upgraded = migrate(save);
    expect(upgraded.credentials["building:blacksmith"]).toBe(save.clock);
    expect(upgraded.logs).toEqual(save.logs);
    expect(upgraded.credentials["cardio:1"]).toBeUndefined();
    expect(requirements(upgraded, "blacksmith")).toEqual([]);
    expect(() => build(upgraded, "blacksmith", upgraded.clock)).not.toThrow();
  });
  it("does not grant a building whose other old requirements were incomplete", () => {
    const save = fresh(Date.now());
    delete save.contentVersion;
    save.rules.buildings.blacksmith.goals = { gym: 1, meal: 4 };
    log(
      save,
      { id: "lift", type: "gym", at: save.clock, amount: 0 },
      save.clock,
    );
    const upgraded = migrate(save);
    expect(upgraded.credentials["building:blacksmith"]).toBeUndefined();
    expect(requirements(upgraded, "blacksmith")).toContain("4 Balanced meal");
  });
  it("weightlifting remains additive and never satisfies the new cardio gate", () => {
    const save = fresh(Date.now());
    log(
      save,
      { id: "lift", type: "gym", at: save.clock, amount: 0 },
      save.clock,
    );
    expect(save.gathering.find((j) => j.resource === "ore")?.total).toBe(40);
    expect(requirements(save, "blacksmith")).toEqual(["1 Treadmill / cardio"]);
    expect(() => build(save, "blacksmith", save.clock)).toThrow("credentials");
    log(
      save,
      { id: "run", type: "cardio", at: save.clock, amount: 15 },
      save.clock,
    );
    expect(() => build(save, "blacksmith", save.clock)).not.toThrow();
    expect(requirements(save, "hall2").join(" ")).not.toMatch(
      /gym|weights|strength/i,
    );
    // Even older edited rules cannot silently make lifting mandatory.
    save.rules.buildings.kitchen.goals.gym = 20;
    expect(requirements(save, "kitchen").join(" ")).not.toMatch(/weights/i);
  });
  it("adds shops only for completed buildings, with no inventory or save mutation", () => {
    const save = migrate(oldWorld),
      before = structuredClone(save);
    const visible = settlementDetails(save).map((d) => d.id);
    expect(visible).toContain("carpenter");
    expect(visible).toContain("tools");
    expect(visible).not.toContain("bakery"); // kitchen still building in the export
    expect(save).toEqual(before);
  });
});
describe("guide follows the saved rules and discoveries", () => {
  it("shows configured resource quantities, costs, caps and gathering times", () => {
    const save = migrate(oldWorld);
    const walk = resourceSources(save, "wood").find(
      (s) => s.activity === "walk",
    )!;
    expect(walk.detail).toContain("7 over 2 hours");
    expect(walk.detail).toContain("minimum 5 minutes");
    save.rules.activities.walk.reward.wood = 9;
    save.rules.activities.walk.gatherHours = 3;
    expect(
      resourceSources(save, "wood").find((s) => s.activity === "walk")!.detail,
    ).toContain("9 over 3 hours");
    expect(
      resourceSources(save, "gold").find((s) => s.label === "A place to sit")!
        .detail,
    ).toContain("completed");
  });
  it("keeps future buildings and discoveries out of a new world's guide", () => {
    const save = fresh(Date.now());
    expect(knownBuildings(save).map(([id]) => id)).not.toContain("hall2");
    expect(knownResources(save)).not.toContain("discovery");
    expect(JSON.stringify(resourceSources(save, "discovery"))).not.toContain(
      "Brook",
    );
    save.buildings.push("blacksmith");
    expect(knownBuildings(save).map(([id]) => id)).toContain("hall2");
  });
});
