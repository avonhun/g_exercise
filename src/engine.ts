import { HOUR, type GatherJob, type ConstructionJob } from "./work";
export const DAY = 86400000;
export const resources = [
  "wood",
  "stone",
  "ore",
  "momentum",
  "food",
  "herbs",
  "planks",
  "fittings",
  "rations",
  "gold",
  "discovery",
] as const;
export type Resource = (typeof resources)[number];
export type Bag = Partial<Record<Resource, number>>;
export const activityNames = {
  gym: "Gym session",
  soccer: "Soccer",
  hike: "Hike",
  cardio: "Treadmill / cardio",
  cycle: "Cycle / commute",
  walk: "Dog walk / short walk",
  pushups: "Nightly pushups",
  meal: "Balanced meal",
  plants: "Fruit & vegetables",
  snack: "Mindful snack",
};
export type Activity = keyof typeof activityNames;
export interface Rule {
  reward: Bag;
  cap: number;
  minimum: number;
  gatherHours: number;
}
export interface Recipe {
  name: string;
  building: string;
  input: Bag;
  output: Bag;
  hours: number;
}
export interface Gate {
  hours: number;
  name: string;
  cost: Bag;
  goals: Partial<Record<Activity, number>>;
  buildings?: string[];
}
export interface Rules {
  version: number;
  activities: Record<Activity, Rule>;
  recipes: Record<string, Recipe>;
  buildings: Record<string, Gate>;
  passive: Bag;
  offlineHours: number;
  strengthMode: "gym" | "home";
  strengthCount: number;
  mealDefinition: string;
}
export const seed: Rules = {
  version: 1,
  offlineHours: 72,
  strengthMode: "gym",
  strengthCount: 3,
  mealDefinition:
    "A satisfying meal with a protein source, plants, and enough food for you.",
  activities: {
    gym: { gatherHours: 8, reward: { ore: 40 }, cap: 1, minimum: 0 },
    soccer: { gatherHours: 6, reward: { momentum: 50 }, cap: 1, minimum: 0 },
    hike: {
      gatherHours: 8,
      reward: { wood: 45, discovery: 10 },
      cap: 1,
      minimum: 45,
    },
    cardio: { gatherHours: 4, reward: { momentum: 20 }, cap: 1, minimum: 15 },
    cycle: {
      gatherHours: 4,
      reward: { momentum: 12, wood: 5 },
      cap: 2,
      minimum: 5,
    },
    walk: {
      gatherHours: 2,
      reward: { wood: 5, momentum: 1 },
      cap: 2,
      minimum: 5,
    },
    pushups: {
      gatherHours: 2,
      reward: { ore: 3, momentum: 2 },
      cap: 1,
      minimum: 1,
    },
    meal: { gatherHours: 4, reward: { food: 12 }, cap: 3, minimum: 0 },
    plants: { gatherHours: 2, reward: { herbs: 4 }, cap: 3, minimum: 0 },
    snack: { gatherHours: 2, reward: { food: 3 }, cap: 1, minimum: 0 },
  },
  passive: { wood: 3, stone: 8, food: 8 },
  recipes: {
    planks: {
      name: "Saw timber",
      building: "sawmill",
      input: { wood: 20, momentum: 5 },
      output: { planks: 15 },
      hours: 8,
    },
    fittings: {
      name: "Forge fittings",
      building: "blacksmith",
      input: { ore: 15, momentum: 5 },
      output: { fittings: 10 },
      hours: 8,
    },
    rations: {
      name: "Pack travel rations",
      building: "kitchen",
      input: { food: 20, herbs: 4 },
      output: { rations: 10 },
      hours: 4,
    },
    stone: {
      name: "Dress river stone",
      building: "hall",
      input: { wood: 3 },
      output: { stone: 6 },
      hours: 1,
    },
  },
  buildings: {
    sawmill: {
      hours: 4,
      name: "Sawmill",
      cost: { wood: 20, stone: 10 },
      goals: { walk: 1 },
    },
    farm: {
      hours: 2,
      name: "Kitchen garden",
      cost: { wood: 15, stone: 5 },
      goals: { meal: 1 },
    },
    blacksmith: {
      hours: 8,
      name: "Blacksmith",
      cost: { wood: 30, stone: 20 },
      goals: { gym: 1 },
    },
    kitchen: {
      hours: 8,
      name: "Village kitchen",
      cost: { planks: 15, stone: 15 },
      goals: { meal: 4 },
    },
    hall2: {
      hours: 48,
      name: "Gathering hall · level II",
      cost: { planks: 30, fittings: 20, rations: 10 },
      goals: { hike: 2, soccer: 2, meal: 12 },
      buildings: ["blacksmith", "kitchen"],
    },
  },
};
export interface Log {
  id: string;
  type: Activity;
  at: number;
  entered: number;
  day: string;
  week: number;
  amount: number;
  notes: string;
  reward: Bag;
  qualified: boolean;
  rule: number;
  voided?: boolean;
  delivery?: "instant" | "gather";
}
export interface Transaction {
  id: string;
  at: number;
  source: string;
  delta: Bag;
  rule: number;
}
export interface Save {
  schema: 3;
  workClock: number;
  gathering: GatherJob[];
  construction: ConstructionJob[];
  created: number;
  clock: number;
  productionAt?: number;
  ruleHistory?: { at: number; rules: Rules }[];
  rules: Rules;
  inventory: Record<Resource, number>;
  logs: Log[];
  ledger: Transaction[];
  jobs: {
    id: string;
    recipe: string;
    building?: string;
    end: number;
    output: Bag;
    done: boolean;
  }[];
  buildings: string[];
  credentials: Record<string, number>;
  discoveries: string[];
  orders: string[];
  audit: string[];
  debt: Bag;
}
export function fresh(now: number): Save {
  const s: Save = {
    schema: 3,
    workClock: now,
    gathering: [],
    construction: [],
    created: now,
    clock: now,
    productionAt: now,
    ruleHistory: [{ at: now, rules: structuredClone(seed) }],
    rules: structuredClone(seed),
    inventory: Object.fromEntries(resources.map((r) => [r, 0])) as Record<
      Resource,
      number
    >,
    logs: [],
    ledger: [],
    jobs: [],
    buildings: ["hall"],
    credentials: {},
    discoveries: [],
    orders: [],
    audit: [],
    debt: {},
  };
  move(s, { wood: 45, stone: 30, momentum: 10 }, "Welcome supplies", now);
  return s;
}
function move(s: Save, bag: Bag, source: string, now: number) {
  const delta: Bag = {};
  for (const r of resources) {
    let n = bag[r] || 0;
    if (n > 0 && s.debt[r]) {
      const paid = Math.min(n, s.debt[r]!);
      s.debt[r]! -= paid;
      n -= paid;
    }
    if (s.inventory[r] + n < -1e-7) throw Error("Insufficient " + r);
    s.inventory[r] = Math.max(0, s.inventory[r] + n);
    if (n) delta[r] = n;
  }
  s.ledger.push({
    id: String(s.ledger.length),
    at: now,
    source,
    delta,
    rule: s.rules.version,
  });
}
export function afford(s: Save, b: Bag) {
  return resources.every((r) => s.inventory[r] >= (b[r] || 0));
}
function spend(s: Save, b: Bag, source: string, t: number) {
  if (!afford(s, b)) throw Error("More supplies needed");
  move(
    s,
    Object.fromEntries(Object.entries(b).map(([k, v]) => [k, -v!])),
    source,
    t,
  );
}
export function count(s: Save, type: Activity) {
  return s.logs.filter((l) => l.type === type && l.qualified && !l.voided)
    .length;
}
export function consecutive(s: Save, type: Activity) {
  const weeks = [
    ...new Set(
      s.logs
        .filter((l) => l.type === type && l.qualified && !l.voided)
        .map((l) => l.week),
    ),
  ].sort((a, b) => a - b);
  let best = 0,
    run = 0,
    last = -Infinity;
  for (const w of weeks) {
    run = w === last + 1 ? run + 1 : 1;
    last = w;
    best = Math.max(best, run);
  }
  return best;
}
function earn(s: Save, t: number) {
  for (const a of Object.keys(activityNames) as Activity[])
    for (const n of new Set(
      [
        1,
        2,
        3,
        4,
        6,
        7,
        12,
        21,
        s.rules.strengthCount,
        ...Object.values(s.rules.buildings).map((b) => b.goals[a] || 0),
      ].filter((n) => n > 0),
    ))
      if (count(s, a) >= n) s.credentials[a + ":" + n] ??= t;
  if (consecutive(s, "gym") >= 3) s.credentials["gym:weeks3"] ??= t;
}
export function goal(s: Save, a: Activity, n: number) {
  return s.credentials[a + ":" + n] !== undefined || count(s, a) >= n;
}
function accrue(s: Save, now: number, force = false) {
  // This is simulated work time, already bounded by tick's offline allowance.
  const elapsed = Math.max(0, now - (s.productionAt ?? s.workClock));
  const b: Bag = {};
  for (const r of resources) {
    if (r === "food" && !s.buildings.includes("farm")) continue;
    b[r] = ((s.rules.passive[r] || 0) * elapsed) / DAY;
  }
  // Batch passive earnings hourly to keep years of history reasonably small.
  // productionAt is separate from the clock high-water mark: short ticks lose no time.
  if (elapsed > 0 && (force || elapsed >= HOUR)) {
    if (Object.values(b).some((v) => v! > 0))
      move(s, b, "Village production", now);
    s.productionAt = now;
  }
}
export function tick(s: Save, now: number, options: { active?: boolean } = {}) {
  if (!Number.isFinite(now) || now <= s.clock) return;
  const start = s.workClock;
  const end =
    start +
    (options.active
      ? now - s.clock
      : Math.min(now - s.clock, s.rules.offlineHours * HOUR));
  // Resolve building completions chronologically so a new garden only produces
  // during the part of this interval in which it actually exists.
  const boundaries = [
    ...new Set([
      ...s.construction
        .filter((j) => !j.done && j.end > start && j.end <= end)
        .map((j) => j.end),
      end,
    ]),
  ].sort((a, b) => a - b);
  for (const boundary of boundaries) {
    const completed = s.construction.filter(
      (j) => !j.done && j.end <= boundary,
    );
    accrue(s, boundary, completed.length > 0);
    for (const j of completed) {
      j.done = true;
      if (!s.buildings.includes(j.building)) s.buildings.push(j.building);
      s.audit.push("Completed construction: " + j.building);
    }
    for (const j of s.jobs)
      if (!j.done && j.end <= boundary) {
        move(s, j.output, "Craft " + j.recipe, now);
        j.done = true;
      }
  }
  for (const j of s.gathering) {
    if (j.cancelled || j.delivered >= j.total || end <= j.start) continue;
    const amount =
      end >= j.end
        ? j.total
        : Math.floor(
            j.total * Math.min(1, (end - j.start) / j.duration) + 1e-9,
          );
    const delta = Math.max(0, amount - j.delivered);
    if (delta) {
      move(
        s,
        { [j.resource]: delta },
        "Gather " + j.activityId + " " + j.resource,
        now,
      );
      j.delivered = amount;
    }
  }
  s.workClock = end;
  s.clock = now;
}
export function activeGathering(s: Save) {
  return s.gathering.filter(
    (j) => !j.cancelled && j.delivered < j.total && j.start <= s.workClock,
  );
}
function reflowGathering(s: Save) {
  for (const resource of resources) {
    let cursor = s.workClock;
    for (const j of s.gathering.filter(
      (j) => j.resource === resource && !j.cancelled && j.delivered < j.total,
    )) {
      const remaining = j.end - Math.max(s.workClock, j.start);
      j.start = cursor - (j.duration - remaining);
      j.end = cursor + remaining;
      cursor = j.end;
    }
  }
}
export function calendar(at: number) {
  const d = new Date(at);
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return { day, week: Math.floor((utc + 3 * DAY) / (7 * DAY)) };
}
export function log(
  s: Save,
  input: {
    id: string;
    type: Activity;
    at: number;
    amount: number;
    notes?: string;
  },
  now: number,
) {
  if (s.logs.some((l) => l.id === input.id)) return;
  if (
    !Number.isFinite(input.at) ||
    input.at > now ||
    input.at < now - 365 * DAY
  )
    throw Error("Choose a valid past date (within one year)");
  if (!Number.isFinite(input.amount) || input.amount < 0)
    throw Error("Invalid activity amount");
  tick(s, now);
  const r = s.rules.activities[input.type];
  if (!r) throw Error("Unknown activity");
  const c = calendar(input.at);
  const existing = s.logs.filter(
    (l) => l.type === input.type && l.day === c.day && l.qualified && !l.voided,
  );
  const qualified = input.amount >= r.minimum && existing.length < r.cap;
  const reward = qualified ? structuredClone(r.reward) : {};
  s.logs.push({
    ...input,
    ...c,
    entered: now,
    notes: input.notes || "",
    reward,
    qualified,
    rule: s.rules.version,
    delivery: "gather",
  });
  if (qualified)
    for (const resource of resources) {
      const total = reward[resource] || 0;
      if (total <= 0) continue;
      const duration = r.gatherHours * HOUR;
      const start = Math.max(
        s.workClock,
        ...s.gathering
          .filter(
            (j) =>
              j.resource === resource && !j.cancelled && j.delivered < j.total,
          )
          .map((j) => j.end),
      );
      s.gathering.push({
        id: input.id + ":" + resource,
        activityId: input.id,
        resource,
        total,
        delivered: 0,
        start,
        end: start + duration,
        duration,
        rule: s.rules.version,
      });
    }
  earn(s, now);
}
export function reverse(s: Save, id: string, now: number) {
  const l = s.logs.find((l) => l.id === id);
  if (!l || l.voided) return;
  tick(s, now);
  l.voided = true;
  const delta: Bag = {};
  for (const r of resources) {
    const n =
      l.delivery === "gather"
        ? s.gathering
            .filter((j) => j.activityId === id && j.resource === r)
            .reduce((sum, j) => sum + j.delivered, 0)
        : l.reward[r] || 0;
    const available = Math.min(n, s.inventory[r]);
    delta[r] = -available;
    s.debt[r] = (s.debt[r] || 0) + n - available;
  }
  for (const job of s.gathering)
    if (job.activityId === id) job.cancelled = true;
  reflowGathering(s);
  move(s, delta, "Correction " + id, now);
  s.audit.push(
    "Corrected " +
      id +
      ". Earned credentials retained; spent rewards become future resource debt.",
  );
}
export function queue(s: Save, key: string, id: string, now: number) {
  tick(s, now);
  const r = s.rules.recipes[key];
  if (!r || !s.buildings.includes(r.building)) throw Error("Workshop needed");
  if (s.jobs.some((j) => j.id === id)) return;
  if (
    s.jobs.filter(
      (j) =>
        !j.done &&
        (j.building ?? s.rules.recipes[j.recipe]?.building) === r.building,
    ).length >= 3
  )
    throw Error("Workshop queue full");
  spend(s, r.input, "Queue " + key, now);
  const end =
    Math.max(
      s.workClock,
      ...s.jobs
        .filter(
          (j) =>
            !j.done &&
            (j.building ?? s.rules.recipes[j.recipe]?.building) === r.building,
        )
        .map((j) => j.end),
    ) +
    r.hours * 3600000;
  s.jobs.push({
    id,
    recipe: key,
    building: r.building,
    end,
    output: structuredClone(r.output),
    done: false,
  });
}
export function requirements(s: Save, key: string) {
  const g = s.rules.buildings[key];
  if (!g) return ["Unknown building"];
  const missing = Object.entries(g.goals)
    .filter(([a, n]) => !goal(s, a as Activity, n!))
    .map(([a, n]) => `${n} ${activityNames[a as Activity]}`);
  if (
    key === "hall2" &&
    !(s.rules.strengthMode === "gym" && s.credentials["gym:weeks3"]) &&
    !goal(
      s,
      s.rules.strengthMode === "gym" ? "gym" : "pushups",
      s.rules.strengthCount,
    )
  )
    missing.push(
      `${s.rules.strengthCount} ${s.rules.strengthMode === "gym" ? "gym sessions (or 3 consecutive gym weeks)" : "home strength days (selected alternative)"}`,
    );
  for (const b of g.buildings || [])
    if (!s.buildings.includes(b)) missing.push(s.rules.buildings[b]?.name || b);
  return missing;
}
export function build(s: Save, key: string, now: number) {
  tick(s, now);
  if (
    s.buildings.includes(key) ||
    s.construction.some((j) => j.building === key && !j.done)
  )
    throw Error("Already built or under construction");
  if (requirements(s, key).length)
    throw Error("Real-world credentials still needed");
  accrue(s, s.workClock, true);
  const definition = s.rules.buildings[key];
  spend(s, definition.cost, "Build " + key, now);
  const start = Math.max(
    s.workClock,
    ...s.construction.filter((j) => !j.done).map((j) => j.end),
  );
  s.construction.push({
    id: key + ":" + s.construction.length,
    building: key,
    start,
    end: start + definition.hours * HOUR,
    cost: structuredClone(definition.cost),
    rule: s.rules.version,
    done: false,
  });
}
export function explore(s: Save, now: number) {
  if (!s.buildings.includes("hall2"))
    throw Error("The council is not ready to send an expedition");
  if (s.discoveries.includes("brook"))
    throw Error("This trail is already charted");
  spend(s, { rations: 10, planks: 10, momentum: 10 }, "Expedition", now);
  s.discoveries.push("brook");
  move(s, { discovery: 15, herbs: 8 }, "Brook discovery", now);
}
export const orders = [
  {
    id: "bench",
    name: "A place to sit",
    text: "Mara needs timber for a bench beside the village well.",
    cost: { planks: 10 } as Bag,
    reward: { gold: 12, stone: 10 } as Bag,
  },
  {
    id: "pantry",
    name: "A shared supper",
    text: "Help Elin put something warm on every table.",
    cost: { food: 20, herbs: 4 } as Bag,
    reward: { gold: 10, momentum: 5 } as Bag,
  },
];
export function fulfill(s: Save, id: string, now: number) {
  const o = orders.find((o) => o.id === id);
  if (!o || s.orders.includes(id)) throw Error("Order unavailable");
  spend(s, o.cost, "Commission " + id, now);
  move(s, o.reward, "Commission reward " + id, now);
  s.orders.push(id);
}
export function trade(s: Save, now: number) {
  const key = "trade:" + calendar(now).day;
  if (s.orders.includes(key)) throw Error("Merchant returns tomorrow");
  spend(s, { gold: 8 }, "Merchant", now);
  move(s, { ore: 8 }, "Merchant", now);
  s.orders.push(key);
}
export function validateRules(r: Rules): string[] {
  try {
    return inspectRules(r);
  } catch {
    return ["Invalid rule structure"];
  }
}
function inspectRules(r: Rules): string[] {
  const errors: string[] = [];
  if (!r || !r.activities || !r.recipes || !r.buildings || !r.passive)
    return ["Missing rule sections"];
  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1e6;
  const bag = (b: Bag) =>
    b &&
    Object.entries(b).every(
      ([k, v]) => resources.includes(k as Resource) && num(v),
    );
  if (
    !num(r.offlineHours) ||
    r.offlineHours > 168 ||
    !num(r.strengthCount) ||
    r.strengthCount < 1 ||
    !["gym", "home"].includes(r.strengthMode) ||
    typeof r.mealDefinition !== "string"
  )
    errors.push("Invalid time / goal settings");
  for (const a of Object.keys(seed.activities) as Activity[]) {
    const x = r.activities[a];
    if (
      !x ||
      !bag(x.reward) ||
      !num(x.minimum) ||
      !num(x.gatherHours) ||
      x.gatherHours <= 0 ||
      x.gatherHours > 720 ||
      !Number.isInteger(x.cap) ||
      x.cap < 1 ||
      x.cap > 20
    )
      errors.push("Invalid activity " + a);
  }
  if (!bag(r.passive)) errors.push("Invalid passive production");
  for (const [k, x] of Object.entries(r.recipes))
    if (
      !bag(x.input) ||
      !bag(x.output) ||
      !num(x.hours) ||
      x.hours <= 0 ||
      !(x.building === "hall" || r.buildings[x.building])
    )
      errors.push("Invalid recipe " + k);
  for (const k of Object.keys(seed.buildings))
    if (!r.buildings[k]) errors.push("Missing building " + k);
  const visit = (k: string, path: string[]): void => {
    if (path.includes(k)) {
      errors.push("Circular building dependency: " + k);
      return;
    }
    const b = r.buildings[k];
    if (!b) {
      errors.push("Missing dependency " + k);
      return;
    }
    if (
      !bag(b.cost) ||
      !num(b.hours) ||
      b.hours <= 0 ||
      b.hours > 2160 ||
      !b.goals ||
      Object.entries(b.goals).some(
        ([a, n]) => !r.activities[a as Activity] || !num(n),
      )
    )
      errors.push("Invalid gate " + k);
    for (const dep of b.buildings || []) visit(dep, [...path, k]);
  };
  for (const k of Object.keys(r.buildings)) visit(k, []);
  // Fixed-point reachability catches workshop/input cycles that are not
  // explicit building prerequisites. This checks sources, not numeric balance.
  if (!errors.length) {
    const available = new Set<Resource>(["wood", "stone", "momentum"]);
    const reachable = new Set(["hall"]);
    const has = (cost: Bag) =>
      Object.entries(cost).every(
        ([key, amount]) => !amount || available.has(key as Resource),
      );
    const add = (output: Bag) => {
      for (const [key, amount] of Object.entries(output))
        if (amount! > 0) available.add(key as Resource);
    };
    for (const a of Object.values(r.activities)) add(a.reward);
    let changed = true;
    while (changed) {
      const size = available.size + reachable.size;
      for (const [resource, amount] of Object.entries(r.passive))
        if (amount! > 0 && (resource !== "food" || reachable.has("farm")))
          available.add(resource as Resource);
      for (const [id, building] of Object.entries(r.buildings))
        if (
          has(building.cost) &&
          (building.buildings || []).every((id) => reachable.has(id))
        )
          reachable.add(id);
      for (const recipe of Object.values(r.recipes))
        if (reachable.has(recipe.building) && has(recipe.input))
          add(recipe.output);
      for (const order of orders) if (has(order.cost)) add(order.reward);
      if (available.has("gold")) available.add("ore");
      changed = size !== available.size + reachable.size;
    }
    for (const id of Object.keys(r.buildings))
      if (!reachable.has(id))
        errors.push("Unreachable building / resource dependency: " + id);
    for (const [id, recipe] of Object.entries(r.recipes))
      if (!reachable.has(recipe.building) || !has(recipe.input))
        errors.push("Unreachable recipe inputs: " + id);
  }
  return [...new Set(errors)];
}
export function applyRules(s: Save, r: Rules) {
  const errors = validateRules(r);
  if (errors.length) throw Error(errors.join("; "));
  if (
    s.jobs.some(
      (j) =>
        !j.done &&
        (!r.recipes[j.recipe] ||
          r.recipes[j.recipe].building !==
            (j.building ?? s.rules.recipes[j.recipe]?.building)),
    )
  )
    throw Error(
      "Keep active recipes and their workshops until their queues finish",
    );
  if (s.construction.some((j) => !j.done && !r.buildings[j.building]))
    throw Error("Keep buildings with active construction");
  accrue(s, s.workClock, true);
  s.ruleHistory ??= [{ at: s.created, rules: structuredClone(s.rules) }];
  for (const job of s.jobs)
    job.building ??= s.rules.recipes[job.recipe]?.building;
  s.rules = structuredClone({ ...r, version: s.rules.version + 1 });
  s.ruleHistory.push({ at: s.clock, rules: structuredClone(s.rules) });
  s.audit.push(
    "Rules v" +
      s.rules.version +
      " applied prospectively; prior payouts and credentials retained.",
  );
}
export function migrate(raw: unknown): Save {
  try {
    return inspectSave(raw);
  } catch {
    throw Error("Unsupported or damaged save");
  }
}
function inspectSave(raw: unknown): Save {
  if (!raw || typeof raw !== "object") throw Error("Invalid save");
  const x = structuredClone(raw) as Save;
  if ((x.schema as number) === 1) {
    (x as unknown as { schema: number }).schema = 2;
    x.debt = {};
    x.audit = [...(x.audit || []), "Migrated v1 → v2"];
  }
  if ((x.schema as number) === 2) {
    x.schema = 3;
    x.workClock = x.clock;
    x.gathering = [];
    x.construction = [];
    for (const [id, rule] of Object.entries(x.rules.activities))
      rule.gatherHours ??= seed.activities[id as Activity]?.gatherHours || 4;
    for (const [id, definition] of Object.entries(x.rules.buildings))
      definition.hours ??= seed.buildings[id]?.hours || 12;
    for (const l of x.logs) l.delivery = "instant";
    x.audit.push(
      "Migrated v2 → v3: existing resources and buildings retained; future logs fund gathering jobs.",
    );
  }
  if (
    x.schema !== 3 ||
    !Array.isArray(x.gathering) ||
    !Array.isArray(x.construction) ||
    !Number.isFinite(x.workClock) ||
    x.workClock > x.clock ||
    !Array.isArray(x.logs) ||
    !Array.isArray(x.ledger) ||
    !Array.isArray(x.jobs) ||
    !Array.isArray(x.buildings) ||
    !Array.isArray(x.orders) ||
    !Array.isArray(x.discoveries) ||
    !x.credentials ||
    !x.debt ||
    !Array.isArray(x.audit) ||
    !Number.isFinite(x.clock) ||
    !Number.isFinite(x.created) ||
    resources.some(
      (r) => !Number.isFinite(x.inventory?.[r]) || x.inventory[r] < 0,
    ) ||
    validateRules(x.rules).length
  )
    throw Error("Unsupported or damaged save");
  if (
    x.logs.some((l) => !seed.activities[l.type] || !Number.isFinite(l.at)) ||
    x.jobs.some(
      (j) =>
        (!j.done && !x.rules.recipes[j.recipe]) ||
        !Number.isFinite(j.end) ||
        Object.values(j.output).some((v) => !Number.isFinite(v) || v! < 0),
    )
  )
    throw Error("Damaged event data");
  const bagValid = (bag: Bag, signed = false) =>
    bag &&
    !Array.isArray(bag) &&
    typeof bag === "object" &&
    Object.entries(bag).every(
      ([k, v]) =>
        resources.includes(k as Resource) &&
        typeof v === "number" &&
        Number.isFinite(v) &&
        (signed || v >= 0),
    );
  const unique = (items: { id: string }[]) =>
    items.every((i) => typeof i.id === "string" && i.id.length > 0) &&
    new Set(items.map((i) => i.id)).size === items.length;
  if (
    !bagValid(x.debt) ||
    !unique(x.logs) ||
    !unique(x.jobs) ||
    !unique(x.ledger) ||
    x.logs.some(
      (l) =>
        !["instant", "gather"].includes(l.delivery || "") ||
        !bagValid(l.reward) ||
        !Number.isFinite(l.amount) ||
        l.amount < 0 ||
        !Number.isFinite(l.entered) ||
        !Number.isInteger(l.week) ||
        typeof l.day !== "string" ||
        typeof l.qualified !== "boolean",
    ) ||
    x.jobs.some((j) => !bagValid(j.output) || typeof j.done !== "boolean") ||
    x.ledger.some(
      (t) =>
        !bagValid(t.delta, true) ||
        !Number.isFinite(t.at) ||
        typeof t.source !== "string",
    ) ||
    Object.values(x.credentials).some((t) => !Number.isFinite(t) || t < 0) ||
    [...x.buildings, ...x.orders, ...x.discoveries, ...x.audit].some(
      (v) => typeof v !== "string",
    ) ||
    (x.productionAt !== undefined &&
      (!Number.isFinite(x.productionAt) || x.productionAt > x.workClock))
  )
    throw Error("Damaged save fields");
  if (!unique(x.gathering) || !unique(x.construction))
    throw Error("Duplicate work IDs");
  const times = (j: { start: number; end: number }) =>
    Number.isFinite(j.start) && Number.isFinite(j.end) && j.end > j.start;
  for (const j of x.gathering) {
    const l = x.logs.find((l) => l.id === j.activityId);
    if (
      !l ||
      l.delivery !== "gather" ||
      !resources.includes(j.resource) ||
      !times(j) ||
      !Number.isFinite(j.duration) ||
      j.duration <= 0 ||
      Math.abs(j.end - j.start - j.duration) > 1 ||
      !Number.isFinite(j.total) ||
      j.total <= 0 ||
      j.total !== (l.reward[j.resource] || 0) ||
      !Number.isFinite(j.delivered) ||
      j.delivered < 0 ||
      j.delivered > j.total ||
      Boolean(j.cancelled) !== Boolean(l.voided)
    )
      throw Error("Damaged gathering job");
  }
  for (const l of x.logs)
    if (l.delivery === "gather")
      for (const resource of resources)
        if (
          (l.reward[resource] || 0) > 0 &&
          x.gathering.filter(
            (j) => j.activityId === l.id && j.resource === resource,
          ).length !== 1
        )
          throw Error("Missing gathering job");
  for (const j of x.construction)
    if (
      !x.rules.buildings[j.building] ||
      !times(j) ||
      !bagValid(j.cost) ||
      typeof j.done !== "boolean" ||
      (j.done && !x.buildings.includes(j.building))
    )
      throw Error("Damaged construction job");
  const lanes = [
    ...resources.map((resource) =>
      x.gathering.filter(
        (j) => j.resource === resource && !j.cancelled && j.delivered < j.total,
      ),
    ),
    x.construction.filter((j) => !j.done),
  ];
  for (const lane of lanes) {
    const sorted = [...lane].sort((a, b) => a.start - b.start);
    if (sorted.some((j, i) => i > 0 && j.start < sorted[i - 1].end))
      throw Error("Overlapping work queue");
  }
  for (const job of x.jobs)
    job.building ??= x.rules.recipes[job.recipe]?.building;
  x.productionAt ??= x.workClock;
  x.ruleHistory ??= [{ at: x.clock, rules: structuredClone(x.rules) }];
  return x;
}
export function simulate(s: Save, days: number, mode: string) {
  const copy = structuredClone(s);
  const start = copy.clock;
  for (let d = 1; d <= days; d++) {
    const t = start + d * DAY;
    tick(copy, t);
    if (mode === "nutrition")
      log(copy, { id: "sim-meal" + d, type: "meal", at: t, amount: 0 }, t);
    if (mode === "routine" && d % 7 === 0) {
      log(copy, { id: "sim-gym" + d, type: "gym", at: t, amount: 0 }, t);
      log(copy, { id: "sim-soccer" + d, type: "soccer", at: t, amount: 0 }, t);
    }
  }
  return copy;
}
