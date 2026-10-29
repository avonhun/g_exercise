import type { ReactNode } from "react";
const marks: Record<string, ReactNode> = {
  arrow: <path d="M3 18 17 4H6V1h17v17h-3V7L6 21Z" />,
  down: <path d="M10 1h4v14l5-5 3 3-10 10L2 13l3-3 5 5Z" />,
  village: (
    <>
      <path d="M2 12 12 3l10 9-2 2-2-2v10H6V12l-2 2Z" />
      <path d="M10 22v-8h4v8" className="cut" />
    </>
  ),
  workshops: (
    <>
      <path d="M2 8h20v5H2zM4 13h3v10H4zM17 13h3v10h-3zM7 2h3v6H7zM14 1h3v7h-3z" />
      <path d="M2 17h20v2H2z" />
    </>
  ),
  requests: (
    <>
      <path d="M3 4h18v17H3zM6 1h2v6H6zM16 1h2v6h-2z" />
      <path d="M7 10h10M7 14h10M7 18h6" className="cut" />
    </>
  ),
  journal: (
    <>
      <path d="M3 2h15l3 3v18H3z" />
      <path d="M7 2v21M10 8h7M10 12h7M10 16h5" className="cut" />
    </>
  ),
  stores: (
    <>
      <path d="M2 8 6 3h12l4 5v14H2z" />
      <path d="M2 10h20M11 9v5h3V9" className="cut" />
    </>
  ),
  wood: (
    <>
      <path
        d="m2 7 13-5 7 4-13 5ZM2 10l7 4 13-5v4L9 18l-7-4Zm0 7 7 4 13-5v4L9 25l-7-4Z"
        transform="translate(0 -1)"
      />
    </>
  ),
  stone: (
    <>
      <path d="m2 15 5-10 11-2 5 13-8 6-11-2Z" />
      <path d="m7 5 5 9 11 2M12 14l3 8" className="cut" />
    </>
  ),
  ore: (
    <>
      <path d="M3 17 5 5l7-4 6 5 4 13-10 4Z" />
      <path d="m12 1-1 12 7-7M11 13l1 10M5 5l6 8 11 6" className="cut" />
    </>
  ),
  momentum: <path d="M14 0 3 14h7L8 24l14-16h-9Z" />,
  food: (
    <>
      <path d="M12 7C1 0-1 15 6 22c3 3 4 0 6 0s4 3 7 0C26 14 23 0 12 7Z" />
      <path d="M11 7V1h3v6M14 4q1-5 7-3-1 5-7 3" />
    </>
  ),
  herbs: (
    <>
      <path d="M11 2h2v21h-2zM11 9Q1 9 2 2q9 0 9 7M13 14q9 0 9-8-9 0-9 8M11 20Q1 20 2 12q9 0 9 8" />
    </>
  ),
  planks: (
    <>
      <path d="m2 7 14-5 6 3-14 5Zm0 4 6 3 14-5v4L8 18l-6-3Zm0 8 6 3 14-5v4L8 26l-6-3Z" />
    </>
  ),
  fittings: (
    <>
      <path d="M4 1h6v8l5 5h8v6H12L4 12Z" />
      <circle cx="7" cy="5" r="1.5" className="cut" />
      <circle cx="19" cy="17" r="1.5" className="cut" />
    </>
  ),
  rations: (
    <>
      <path d="M5 7h14l3 15H2ZM7 1h10v4H7Z" />
      <path d="M7 13h10M12 9v10" className="cut" />
    </>
  ),
  gold: (
    <>
      <path d="m7 1 11 2 5 10-7 10-11-2L1 10Z" />
      <path d="M13 5v14M17 8h-6l-2 4 7 2-2 4H7" className="cut" />
    </>
  ),
  discovery: (
    <>
      <path d="m12 0 4 8 8 4-8 4-4 8-4-8-8-4 8-4Z" />
      <path d="m12 5 2 7-2 7-2-7Z" className="cut" />
    </>
  ),
  settings: (
    <>
      <path d="M9 1h6l1 4 4 1 3 5-3 3 1 4-5 4-4-2-4 2-5-4 1-4-3-3 3-5 4-1Z" />
      <circle cx="12" cy="12" r="4" className="cut" />
    </>
  ),
  crest: (
    <>
      <path
        d="M3 2h18v13l-9 9-9-9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="m12 4-6 9h4v6h4v-6h4Z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="5" />
      <path d="M11 0h2v5h-2zM11 19h2v5h-2zM0 11h5v2H0zM19 11h5v2h-5zM3 4l2-2 3 4-2 2zM16 6l3-4 2 2-3 4zM3 20l3-4 2 2-3 4zM16 18l2-2 3 4-2 2z" />
    </>
  ),
};
export function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={"icon " + className}
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
    >
      {marks[name] || marks.crest}
    </svg>
  );
}
