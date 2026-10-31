import type { CSSProperties } from "react";
import townsfolk from "./assets/townsfolk.webp";
// Four hand-held-tool poses per row, composited from an original painted sheet.
// Animation is visual only: the engine owns work, rewards, and completion.
export function Villager({
  task,
  delay = 0,
}: {
  task: "wood" | "ore" | "food" | "carry" | "build" | "walk";
  delay?: number;
}) {
  const row =
    task === "wood" ? 1 : task === "ore" ? 2 : task === "build" ? 3 : 0;
  return (
    <span
      className={"villager villager-" + task}
      aria-hidden="true"
      style={
        {
          backgroundImage: `url(${townsfolk})`,
          "--sprite-row": `${(row * 100) / 3}%`,
          "--pose-delay": `${delay}s`,
        } as CSSProperties
      }
    />
  );
}
