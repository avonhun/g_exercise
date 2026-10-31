import {
  activityNames,
  orders,
  resources,
  type Activity,
  type Resource,
  type Save,
} from "./engine";
export function knownBuildings(save: Save) {
  return Object.entries(save.rules.buildings).filter(
    ([id]) =>
      id !== "hall2" ||
      save.buildings.includes("blacksmith") ||
      save.buildings.includes("kitchen") ||
      save.buildings.includes(id),
  );
}
export const buildingUses: Record<string, string> = {
  hall: "Dresses river stone from wood. Each workshop can queue three batches.",
  sawmill:
    "Crafts planks from wood and momentum. Adds a carpenter’s shop and a cottage.",
  farm: "Produces food each day. Adds a produce stall and a gardener’s cottage.",
  blacksmith:
    "Crafts metal fittings from ore and momentum. Adds a tool stall and a worker’s cottage.",
  kitchen:
    "Crafts travel rations from food and herbs. Adds a bakery and an outdoor table.",
  hall2:
    "Allows an expedition from the village. Adds another cottage and a busier square.",
};
export interface ResourceSource {
  label: string;
  detail: string;
  activity?: Activity;
  tab?: "workshops" | "requests";
}
export function resourceSources(
  save: Save,
  resource: Resource,
): ResourceSource[] {
  const sources: ResourceSource[] = [];
  for (const [id, rule] of Object.entries(save.rules.activities)) {
    const total = rule.reward[resource];
    if (!total) continue;
    sources.push({
      label: activityNames[id as Activity],
      activity: id as Activity,
      detail: `${total} over ${rule.gatherHours} hours · up to ${rule.cap} rewarded ${rule.cap === 1 ? "entry" : "entries"} per day${rule.minimum ? ` · minimum ${rule.minimum} ${id === "pushups" ? "reps" : "minutes"}` : ""}${id === "gym" ? " · optional bonus activity" : ""}`,
    });
  }
  const passive = save.rules.passive[resource] || 0;
  if (passive)
    sources.push({
      label: resource === "food" ? "Kitchen garden" : "Village workers",
      detail: `${passive} per day${resource === "food" && !save.buildings.includes("farm") ? " · build the kitchen garden to begin" : " · automatic background production"}`,
      ...(resource === "food" ? { tab: "workshops" as const } : {}),
    });
  const known = new Set(["hall", ...knownBuildings(save).map(([id]) => id)]);
  for (const recipe of Object.values(save.rules.recipes)) {
    const total = recipe.output[resource];
    if (!total || !known.has(recipe.building)) continue;
    sources.push({
      label: recipe.name,
      tab: "workshops",
      detail: `${total} per ${recipe.hours}-hour batch · needs ${Object.entries(
        recipe.input,
      )
        .map(([r, n]) => `${n} ${r}`)
        .join(
          ", ",
        )}${!save.buildings.includes(recipe.building) ? " · workshop not built yet" : ""}`,
    });
  }
  for (const order of orders) {
    const total = order.reward[resource];
    if (total)
      sources.push({
        label: order.name,
        tab: "requests",
        detail: `${total} for ${Object.entries(order.cost)
          .map(([r, n]) => `${n} ${r}`)
          .join(
            ", ",
          )} · one-time request${save.orders.includes(order.id) ? " · completed" : ""}`,
      });
  }
  if (resource === "ore")
    sources.push({
      label: "Passing merchant",
      tab: "requests",
      detail:
        "8 ore for 8 gold · once per local day. Gold comes from the finite village requests.",
    });
  if (resource === "discovery" && save.discoveries.includes("brook"))
    sources.push({
      label: "Charted trail",
      detail: "The expedition awarded 15 once. This trail is already charted.",
    });
  return sources;
}
export const resourceUses: Record<Resource, string> = {
  wood: "Construction, planks, and dressed river stone.",
  stone: "Building foundations and construction.",
  ore: "Forge into metal fittings at the blacksmith.",
  momentum: "Plank and fitting batches, and expeditions when available.",
  food: "Village requests and travel rations.",
  herbs: "Village requests and travel rations.",
  planks:
    "Construction, the village bench request, and expeditions when available.",
  fittings: "Advanced construction when it becomes available.",
  rations: "Expedition supplies when a trail becomes available.",
  gold: "Buy ore from the passing merchant. No other gold purchases are available yet.",
  discovery: "A record of exploration. There is no spending action for it yet.",
};
export function knownResources(save: Save) {
  return resources.filter(
    (r) =>
      r !== "discovery" ||
      save.inventory.discovery > 0 ||
      save.logs.some((l) => (l.reward.discovery || 0) > 0) ||
      save.discoveries.length > 0,
  );
}
