import { useState } from "react";
import {
  activityNames,
  requirements,
  type Activity,
  type Bag,
  type Save,
} from "./engine";
import { ResourceAmounts, ResourceName } from "./Resources";
import {
  buildingUses,
  knownBuildings,
  knownResources,
  resourceSources,
  resourceUses,
} from "./guideContent";
export function Guide({
  save,
  onLog,
  onNavigate,
}: {
  save: Save;
  onLog: (activity: Activity) => void;
  onNavigate: (tab: string) => void;
}) {
  const [section, setSection] = useState("resources");
  const [search, setSearch] = useState("");
  const buildings: [string, { name: string; hours: number; cost: Bag }][] = [
    ["hall", { name: "Gathering hall", hours: 0, cost: {} }],
    ...knownBuildings(save),
  ];
  const found = knownResources(save).filter((r) =>
    [r, resourceUses[r], ...resourceSources(save, r).map((s) => s.label)]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <section className="guide" aria-label="Game guide">
      <div className="section-heading">
        <h2>Guide</h2>
      </div>
      <div className="guide-tabs" role="group" aria-label="Guide sections">
        {[
          ["resources", "Resources"],
          ["activities", "Activities"],
          ["buildings", "Buildings"],
          ["instructions", "How to play"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={section === id}
            onClick={() => setSection(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {section === "resources" && (
        <>
          <label className="guide-search">
            Find a resource or activity
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Wood, food, walk…"
            />
          </label>
          {found.length === 0 && <p>No matching resources.</p>}
          {found.map((resource) => (
            <details className="guide-entry" key={resource}>
              <summary>
                <ResourceName name={resource} />
                <span>{Math.floor(save.inventory[resource])} in store</span>
              </summary>
              <p>{resourceUses[resource]}</p>
              <h3>How to get {resource}</h3>
              <ul className="guide-sources">
                {resourceSources(save, resource).map((source) => (
                  <li key={source.label}>
                    <strong>{source.label}</strong>
                    <p>{source.detail}</p>
                    {source.activity ? (
                      <button onClick={() => onLog(source.activity!)}>
                        Record {source.label.toLowerCase()}
                      </button>
                    ) : (
                      source.tab && (
                        <button onClick={() => onNavigate(source.tab!)}>
                          Open {source.tab}
                        </button>
                      )
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </>
      )}
      {section === "activities" && (
        <>
          <p>
            Qualifying logs earn permanent accomplishment credit immediately and
            fund finite gathering jobs. Lift weights is an optional source of
            ore; it is never a building requirement.
          </p>
          {Object.entries(save.rules.activities).map(([id, rule]) => (
            <details className="guide-entry" key={id}>
              <summary>
                {activityNames[id as Activity]}
                {id === "gym" && <span>Optional</span>}
              </summary>
              <p>
                {rule.minimum
                  ? `Minimum: ${rule.minimum} ${id === "pushups" ? "repetitions" : "minutes"}.`
                  : "Record a completed session or food accomplishment; minutes are optional."}{" "}
                Up to {rule.cap} rewarded {rule.cap === 1 ? "entry" : "entries"}{" "}
                per local day.
              </p>
              {id === "meal" && <p>{save.rules.mealDefinition}</p>}
              <p>
                <ResourceAmounts amounts={rule.reward} /> gathered over{" "}
                {rule.gatherHours} hours.
              </p>
              <button onClick={() => onLog(id as Activity)}>
                Record {activityNames[id as Activity].toLowerCase()}
              </button>
            </details>
          ))}
        </>
      )}
      {section === "buildings" && (
        <>
          <p>
            Materials and accomplishments are separate requirements.
            Construction uses one crew; additional buildings wait their turn.
          </p>
          {buildings.map(([id, b]) => {
            return (
              <details className="guide-entry" key={id}>
                <summary>
                  {b.name}
                  <span>
                    {save.buildings.includes(id) ? "Built" : `${b.hours} hours`}
                  </span>
                </summary>
                <p>
                  {buildingUses[id] || "Additional village infrastructure."}
                </p>
                {id !== "hall" && (
                  <>
                    <p>
                      Cost: <ResourceAmounts amounts={b.cost} />
                    </p>
                    <p>
                      {save.buildings.includes(id)
                        ? "Already completed."
                        : requirements(save, id).length
                          ? "Still needed: " +
                            requirements(save, id).join(" · ")
                          : "Accomplishments earned."}
                    </p>
                  </>
                )}
                <button onClick={() => onNavigate("workshops")}>
                  Open workshops
                </button>
              </details>
            );
          })}
        </>
      )}
      {section === "instructions" && (
        <div className="guide-instructions">
          <h3>Logging and gathering</h3>
          <p>
            Record completed exercise and nutrition accomplishments. Additional
            entries extend each resource’s queue; they do not multiply the
            gathering speed. Retroactive entries begin gathering when you log
            them. Entries below the minimum or beyond the daily cap remain in
            your journal without rewards.
          </p>
          <h3>Construction and crafting</h3>
          <p>
            Inputs are reserved when queued. Each workshop holds three jobs,
            worked in order. One construction crew works through building
            projects in order. A building becomes usable when construction
            finishes.
          </p>
          <h3>Closing the app</h3>
          <p>
            You can close the app. Gathering, construction, crafting, and
            background production continue offline for up to{" "}
            {save.rules.offlineHours} hours per absence. Remaining work resumes
            when you return. Changing a rate affects future work; existing jobs
            retain their captured rewards and durations.
          </p>
          <h3>Requests and trading</h3>
          <p>
            Requests are optional, one-time exchanges. They spend the listed
            supplies and immediately grant the displayed reward. The bench and
            supper also add details to your village. Keep supplies for a
            building if that is your priority. Gold buys ore from the merchant
            once per local day. Requests and trading never award exercise
            accomplishments.
          </p>
          <h3>Town life</h3>
          <p>
            Completed buildings add shops, homes, paths, and residents to their
            surroundings. These details have no upkeep or extra production.
            Working crews show active gathering and construction; walking
            residents show daily town life. Requests can add a bench or supper
            table.
          </p>
          <h3>Progress and corrections</h3>
          <p>
            Missed days do not remove buildings or earned milestones. Use
            Reverse in the journal to correct an entry, then record its
            replacement. Undelivered rewards are cancelled; already spent
            rewards are repaid from future earnings of the same resource. Earned
            milestones remain.
          </p>
          <h3>Saving and backups</h3>
          <p>
            Your world is saved in this browser on this device. Export world in
            Settings to keep a separate JSON file in Files or iCloud Drive.
            Import world restores it. A local backup shares the browser’s
            storage and is not a separate file. Clearing browser data can remove
            local saves.
          </p>
          <h3>iPhone installation</h3>
          <p>
            Open the site in Safari, then Share → Add to Home Screen. The first
            visit needs a connection. After the app has cached its files, you
            can reopen it offline.
          </p>
          <button onClick={() => onNavigate("settings")}>
            Open save settings
          </button>
        </div>
      )}
    </section>
  );
}
