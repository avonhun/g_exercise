import { activityNames, resources, type Save } from "./engine";
import { ResourceName } from "./Resources";
import { durationLabel, fraction } from "./work";
export function WorkPanel({ save }: { save: Save }) {
  const pending = save.gathering.filter(
    (j) => !j.cancelled && j.delivered < j.total,
  );
  if (!pending.length) return null;
  return (
    <section className="work-panel" aria-label="Gathering work">
      <h2>Gathering</h2>
      {resources.map((resource) => {
        const jobs = pending.filter((j) => j.resource === resource);
        const first = jobs[0];
        if (!first) return null;
        const source = save.logs.find((l) => l.id === first.activityId);
        return (
          <div className="gather-row" key={resource}>
            <div className="work-heading">
              <ResourceName name={resource} />
              <span>
                {first.delivered} / {first.total}
              </span>
            </div>
            <progress
              aria-label={resource + " gathering progress"}
              value={fraction(first, save.workClock)}
              max={1}
            />
            <div className="work-details">
              <span>
                {source ? activityNames[source.type] : "Gathering job"}
              </span>
              <span>
                {first.start > save.workClock
                  ? "Starts in " + durationLabel(first.start - save.workClock)
                  : durationLabel(first.end - save.workClock) + " remaining"}
              </span>
            </div>
            {jobs.length > 1 && (
              <details>
                <summary>
                  {jobs.length - 1} more {jobs.length === 2 ? "job" : "jobs"}{" "}
                  queued
                </summary>
                {jobs.slice(1).map((j) => (
                  <p key={j.id}>
                    {j.total} {resource} · starts in{" "}
                    {durationLabel(j.start - save.workClock)}
                  </p>
                ))}
              </details>
            )}
          </div>
        );
      })}
      <p className="subtle">
        Crews collect a finite reward. Extra accomplishments extend the queue.
        Work continues offline for up to {save.rules.offlineHours} hours per
        absence.
      </p>
    </section>
  );
}
