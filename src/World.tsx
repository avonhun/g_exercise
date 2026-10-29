import type { Save } from "./engine";
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
      <span className="world-caption">A small beginning. A world to grow.</span>
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
