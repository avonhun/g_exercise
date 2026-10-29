import { activityNames, requirements, type Save } from "./engine";
import { durationLabel } from "./work";
export function constructionFeedback(save: Save, id: string) {
  const job = save.construction.find((j) => j.building === id && !j.done);
  if (job)
    return job.start > save.workClock
      ? "Queued — starts in " +
          durationLabel(job.start - save.workClock) +
          ". Materials are already reserved."
      : "Building — " +
          durationLabel(job.end - save.workClock) +
          " remaining. Materials are already reserved.";
  const missingGoals = requirements(save, id).map((requirement) => {
    const count = save.rules.buildings[id].goals.walk;
    if (count && requirement === `${count} ${activityNames.walk}`) {
      const minutes = save.rules.activities.walk.minimum;
      return `${count === 1 ? "a logged walk" : count + " logged walks"}${minutes > 0 ? " of at least " + minutes + " minutes" + (count === 1 ? "" : " each") : ""}`;
    }
    return requirement;
  });
  const missingMaterials = Object.entries(save.rules.buildings[id].cost)
    .filter(
      ([resource, cost]) =>
        save.inventory[resource as keyof typeof save.inventory] < cost!,
    )
    .map(
      ([resource, cost]) =>
        `${Math.ceil((cost! - save.inventory[resource as keyof typeof save.inventory]) * 10) / 10} more ${resource}`,
    );
  return [
    missingGoals.length ? "Requires: " + missingGoals.join(" · ") + "." : "",
    missingMaterials.length ? "Need " + missingMaterials.join(", ") + "." : "",
  ]
    .filter(Boolean)
    .join(" ");
}
