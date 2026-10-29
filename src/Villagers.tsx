// Small original pixel figures. Tools animate separately from bodies, so crews
// remain anchored to the tree, rock, supply wagon, or construction footprint.
export function Villager({
  task,
  delay = 0,
}: {
  task: "wood" | "ore" | "food" | "carry" | "build";
  delay?: number;
}) {
  return (
    <svg
      className={"villager villager-" + task}
      viewBox="0 0 32 40"
      aria-hidden="true"
      style={{ animationDelay: delay + "s" }}
      shapeRendering="crispEdges"
    >
      <ellipse cx="14" cy="35" rx="9" ry="3" fill="#203829" opacity=".35" />
      {task === "wood" && (
        <g>
          <path d="M24 6h3v27h-3z" fill="#765338" />
          <path d="m17 13 8-13 7 13-4 1 4 7-8 4-8-5 5-6z" fill="#315642" />
          <path d="m20 15 5-8 3 9-4 4z" fill="#597e4b" />
        </g>
      )}
      {task === "ore" && <path d="m21 29 4-9 7 3v11H19z" fill="#808b81" />}
      {task === "food" && (
        <g fill="#6a8946">
          <path d="M23 29V17h2v12zM20 20h4v3h-4zM25 17h5v3h-5z" />
          <path d="m18 31 14-1v4H18z" fill="#806046" />
        </g>
      )}
      {task === "build" && (
        <path d="m21 27 11 2v4l-11-2zM22 23h9v3h-9z" fill="#aa8250" />
      )}
      <g className="worker-body">
        <path d="M9 28h4v7H8v-3h1zM15 28h4v8h-5v-3h1z" fill="#38474a" />
        <path
          d="M8 19h12v10H8z"
          fill={task === "build" ? "#bd8d4c" : "#66817b"}
        />
        <path d="M10 12h8v8h-8z" fill="#d3aa7b" />
        <path d="M9 11h10v4H9zM7 14h14v2H7z" fill="#d8b86b" />
        <path d="M18 17h2v2h-2z" fill="#9c7253" />
        <g className="worker-arm">
          <path d="M17 20h3v5h-3zM19 23h4v3h-4z" fill="#c39c72" />
          {task === "wood" ? (
            <>
              <path d="M22 13h2v13h-2z" fill="#b68a54" />
              <path d="m23 12 6 1v5l-6-1z" fill="#aebcba" />
            </>
          ) : task === "ore" ? (
            <>
              <path d="M22 12h2v14h-2z" fill="#ae8651" />
              <path d="m17 12 7-2 7 4v2l-7-3-7 1z" fill="#b9c1ba" />
            </>
          ) : task === "build" ? (
            <>
              <path d="M23 15h2v11h-2z" fill="#b48a58" />
              <path d="M21 13h7v5h-7z" fill="#667774" />
            </>
          ) : (
            <path d="M21 24h9v6h-9z" fill="#c8a36c" />
          )}
        </g>
      </g>
      <g
        className="work-particles"
        fill={task === "ore" ? "#d8d2a1" : "#e2bb7d"}
      >
        <path d="M26 25h2v2h-2zM29 28h2v2h-2zM24 22h2v2h-2z" />
      </g>
    </svg>
  );
}
