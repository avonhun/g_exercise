import type { CSSProperties } from "react";
import type { Save } from "./engine";
import { Villager } from "./Villagers";
import cottage from "./assets/cottage.webp";
import carpenter from "./assets/carpenter.webp";
import produce from "./assets/produce.webp";
import bakery from "./assets/bakery.webp";
import well from "./assets/well.webp";
import tools from "./assets/tool-stall.webp";
const details = [
  {
    id: "keeper-cottage",
    building: "hall",
    name: "Keeper’s cottage",
    art: cottage,
    x: 43,
    y: 30,
    width: 12,
  },
  {
    id: "well",
    building: "hall",
    name: "Village well",
    art: well,
    x: 51,
    y: 55,
    width: 8,
  },
  {
    id: "carpenter",
    building: "sawmill",
    name: "Carpenter’s shop",
    art: carpenter,
    x: 25,
    y: 68,
    width: 12,
  },
  {
    id: "forester-home",
    building: "sawmill",
    name: "Forester’s cottage",
    art: cottage,
    x: 36,
    y: 70,
    width: 10,
  },
  {
    id: "produce",
    building: "farm",
    name: "Produce stall",
    art: produce,
    x: 75,
    y: 46,
    width: 11,
  },
  {
    id: "gardener-home",
    building: "farm",
    name: "Gardener’s cottage",
    art: cottage,
    x: 65,
    y: 25,
    width: 10,
  },
  {
    id: "tools",
    building: "blacksmith",
    name: "Tool merchant’s stall",
    art: tools,
    x: 78,
    y: 61,
    width: 11,
  },
  {
    id: "smith-home",
    building: "blacksmith",
    name: "Smith’s cottage",
    art: cottage,
    x: 69,
    y: 75,
    width: 10,
  },
  {
    id: "bakery",
    building: "kitchen",
    name: "Village bakery",
    art: bakery,
    x: 55,
    y: 82,
    width: 12,
  },
  {
    id: "hall-cottage",
    building: "hall2",
    name: "Square cottage",
    art: cottage,
    x: 40,
    y: 46,
    width: 10,
  },
];
export function settlementDetails(save: Save) {
  return details.filter((d) => save.buildings.includes(d.building));
}
const routes = [
  {
    id: "square",
    building: "hall",
    from: [47, 48],
    via: [49, 52],
    to: [54, 56],
    seconds: 34,
  },
  {
    id: "timber",
    building: "sawmill",
    from: [27, 58],
    via: [35, 57],
    to: [47, 48],
    seconds: 42,
  },
  {
    id: "market",
    building: "farm",
    from: [70, 40],
    via: [62, 45],
    to: [54, 56],
    seconds: 37,
  },
  {
    id: "tools",
    building: "blacksmith",
    from: [76, 62],
    via: [66, 58],
    to: [54, 56],
    seconds: 46,
  },
  {
    id: "bread",
    building: "kitchen",
    from: [52, 75],
    via: [51, 66],
    to: [54, 56],
    seconds: 40,
  },
  {
    id: "square-two",
    building: "hall2",
    from: [41, 45],
    via: [49, 52],
    to: [60, 56],
    seconds: 33,
  },
];
export function SettlementLife({ save }: { save: Save }) {
  return (
    <>
      <svg
        className="village-paths"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {routes
          .filter((r) => save.buildings.includes(r.building))
          .map((r) => (
            <path
              key={r.id}
              d={`M${r.from.join(" ")} Q${r.via.join(" ")} ${r.to.join(" ")}`}
            />
          ))}
      </svg>
      {settlementDetails(save).map((d) => (
        <img
          key={d.id}
          className="settlement-detail"
          data-detail={d.id}
          src={d.art}
          alt={d.name}
          draggable="false"
          width="256"
          height="256"
          style={{
            left: d.x + "%",
            top: d.y + "%",
            width: d.width + "%",
            zIndex: Math.round(d.y),
          }}
        />
      ))}
      {routes
        .filter((r) => save.buildings.includes(r.building))
        .map((r, i) => (
          <div
            className="town-resident"
            key={r.id}
            role="img"
            aria-label="Resident walking through the village"
            style={
              {
                "--from-x": r.from[0] + "%",
                "--from-y": r.from[1] + "%",
                "--via-x": r.via[0] + "%",
                "--via-y": r.via[1] + "%",
                "--to-x": r.to[0] + "%",
                "--to-y": r.to[1] + "%",
                "--journey": r.seconds + "s",
                "--journey-delay": -i * 7 + "s",
                zIndex: Math.round(Math.max(r.from[1], r.to[1])) + 1,
              } as CSSProperties
            }
          >
            <div className="resident-facing">
              <Villager task="walk" delay={-i * 0.19} />
            </div>
          </div>
        ))}
      {save.buildings.includes("blacksmith") && <Smoke x={65} y={43} />}
      {save.buildings.includes("kitchen") && <Smoke x={48} y={57} />}
      {save.orders.includes("bench") && (
        <svg
          className="village-furnishing"
          style={{ left: "55%", top: "57%", zIndex: 58 }}
          viewBox="0 0 64 48"
          role="img"
          aria-label="Mara’s bench"
        >
          <path d="m8 18 35-9 12 7-35 10Z" fill="#bb935e" />
          <path d="m8 18 12 8v9L8 28Z" fill="#65472f" />
          <path d="m20 35 35-10v-9L20 26Z" fill="#88623c" />
          <path
            d="M13 27v12m34-18v12M9 12l34-9 8 5-34 10Z"
            stroke="#523a29"
            strokeWidth="3"
            fill="#a88352"
          />
        </svg>
      )}
      {(save.buildings.includes("kitchen") ||
        save.orders.includes("pantry")) && (
        <svg
          className="village-furnishing"
          style={{ left: "46%", top: "77%", zIndex: 78 }}
          viewBox="0 0 64 48"
          role="img"
          aria-label={
            save.orders.includes("pantry")
              ? "Elin’s shared supper table"
              : "Outdoor kitchen table"
          }
        >
          <ellipse
            cx="32"
            cy="24"
            rx="28"
            ry="12"
            fill="#344232"
            opacity=".18"
          />
          <path
            d="M13 26v13m35-17v13M8 18 39 8l17 10-32 11Z"
            fill="#ae8252"
            stroke="#61442d"
            strokeWidth="2"
          />
          {save.orders.includes("pantry") && (
            <>
              <path d="m18 17 19-6 10 6-19 7Z" fill="#eee0c3" />
              <ellipse cx="28" cy="17" rx="5" ry="3" fill="#aa7241" />
              <circle cx="38" cy="16" r="3" fill="#66834c" />
            </>
          )}
        </svg>
      )}
      <div className="river-glint" aria-hidden="true" />
    </>
  );
}
function Smoke({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="chimney-smoke"
      style={{ left: x + "%", top: y + "%", zIndex: 85 }}
      aria-hidden="true"
    >
      <i />
      <i />
      <i />
    </div>
  );
}
