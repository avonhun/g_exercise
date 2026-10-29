import { activeGathering, type Save } from "./engine";
import { fraction } from "./work";
import { Villager } from "./Villagers";
import landscape from "./assets/greenhaven.webp";
import portrait from "./assets/mara.webp";
import hall from "./assets/hall.webp";
import hall2 from "./assets/hall2.webp";
import sawmill from "./assets/sawmill.webp";
import blacksmith from "./assets/blacksmith.webp";
import kitchen from "./assets/kitchen.webp";
import farm from "./assets/farm.webp";
const places = [
  { id: "hall", name: "Gathering hall", x: 49, y: 45, art: hall },
  { id: "farm", name: "Kitchen garden", x: 68, y: 35, art: farm },
  { id: "sawmill", name: "Sawmill", x: 30, y: 57, art: sawmill },
  { id: "blacksmith", name: "Blacksmith", x: 69, y: 59, art: blacksmith },
  { id: "kitchen", name: "Village kitchen", x: 49, y: 76, art: kitchen },
];
export function World({
  save,
  onSelect,
}: {
  save: Save;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="world-scene"
      role="region"
      aria-label="Greenhaven settlement map"
    >
      <img
        className="world-landscape"
        src={landscape}
        alt="A sunlit woodland island surrounded by a winding river, wildflowers, stone paths and a footbridge"
        fetchPriority="high"
        width="1440"
        height="960"
      />
      {places
        .filter((p) => save.buildings.includes(p.id))
        .map((p) => (
          <button
            key={p.id}
            className="world-place"
            style={{ left: p.x + "%", top: p.y + "%", zIndex: Math.round(p.y) }}
            aria-label={`Visit ${p.name}`}
            onClick={() => onSelect(p.id)}
          >
            <img
              src={
                p.id === "hall" && save.buildings.includes("hall2")
                  ? hall2
                  : p.art
              }
              alt=""
              width="384"
              height="384"
            />
            <span>{p.name}</span>
          </button>
        ))}

      {save.construction
        .filter((j) => !j.done)
        .map((j) => {
          const place = places.find(
            (p) => p.id === (j.building === "hall2" ? "hall" : j.building),
          );
          if (!place) return null;
          const active = j.start <= save.workClock;
          const progress = fraction(j, save.workClock);
          return (
            <div
              className={
                "construction-site " + (active ? "is-building" : "is-queued")
              }
              key={j.id}
              style={{
                left: place.x + "%",
                top: place.y + "%",
                zIndex: Math.round(place.y) + 1,
              }}
              role="img"
              aria-label={
                (active ? "Building " : "Queued construction: ") +
                save.rules.buildings[j.building].name
              }
            >
              <img
                className="construction-preview"
                src={j.building === "hall2" ? hall2 : place.art}
                alt=""
                style={{ opacity: active ? 0.15 + progress * 0.65 : 0.12 }}
              />
              <svg
                className="scaffold"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <path
                  d="M8 74 48 94 92 68 50 48Z"
                  fill="#98734d"
                  opacity=".65"
                />
                <g fill="none" stroke="#bd9a67" strokeWidth="2">
                  <path d="M12 79V40l70 6v32M33 89V36l39-15v56M12 58l70 12M12 40l60-19 20 13v40M33 55l59-21M33 74l59-22" />
                  <path
                    d="M12 79 33 55 12 40M33 89 72 40 33 36"
                    strokeWidth="1"
                  />
                </g>
                <g fill="#dcc9a0">
                  <path d="m7 78 21 10 4-2-21-10ZM53 87l30-17 5 2-30 18Z" />
                </g>
              </svg>
              {active && (
                <>
                  <div className="builder builder-one">
                    <Villager task="build" />
                  </div>
                  <div className="builder builder-two">
                    <Villager task="build" delay={0.45} />
                  </div>
                </>
              )}
            </div>
          );
        })}
      {(
        [
          {
            resource: "wood",
            x: 14,
            y: 48,
            task: "wood",
            name: "Village forester",
          },
          {
            resource: "stone",
            x: 86,
            y: 49,
            task: "ore",
            name: "Village stone gatherer",
          },
          {
            resource: "food",
            x: 73,
            y: 42,
            task: "food",
            name: "Garden worker",
          },
        ] as const
      )
        .filter(
          (crew) =>
            (save.rules.passive[crew.resource] || 0) > 0 &&
            (crew.resource !== "food" || save.buildings.includes("farm")),
        )
        .map((crew) => (
          <div
            key={crew.resource}
            className="gather-crew background-crew"
            style={{
              left: crew.x + "%",
              top: crew.y + "%",
              zIndex: Math.round(crew.y),
            }}
            role="img"
            aria-label={crew.name + " — background production"}
          >
            <Villager task={crew.task} />
          </div>
        ))}
      {activeGathering(save).map((job) => {
        const positions: Record<string, [number, number]> = {
          wood: [22, 41],
          ore: [77, 68],
          food: [62, 35],
          herbs: [34, 70],
          momentum: [49, 58],
          discovery: [29, 58],
        };
        const [x, y] = positions[job.resource] || [40, 60];
        return (
          <div
            key={job.id}
            className={"gather-crew gather-" + job.resource}
            style={{ left: x + "%", top: y + "%", zIndex: Math.round(y) + 2 }}
            role="img"
            aria-label={"Townsfolk gathering " + job.resource}
          >
            <Villager
              task={
                job.resource === "wood"
                  ? "wood"
                  : job.resource === "ore"
                    ? "ore"
                    : job.resource === "food" || job.resource === "herbs"
                      ? "food"
                      : "carry"
              }
            />
          </div>
        );
      })}
    </div>
  );
}
export function Portrait() {
  return (
    <img
      className="portrait"
      src={portrait}
      width="560"
      height="700"
      alt="Mara, the village keeper, in an illustrated green shawl with a sprig of rosemary"
    />
  );
}
