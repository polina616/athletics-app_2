import { SVGProps } from "react";

/** Единый минималистичный набор SVG-иконок дисциплин лёгкой атлетики —
 *  однотонная линия, без клипарта, наследует currentColor. */

const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function IconRunning(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="15.5" cy="4.5" r="1.6" />
      <path d="M13 8l2 3-1 3 4 2v4M13 8l-3 1-1 4-4 1M13 8l3-.5" />
      <path d="M8 13l3 2 2-1" />
    </svg>
  );
}

export function IconJump(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 19h5l3-6 4 2 3-7" />
      <circle cx="18" cy="6" r="1.6" />
      <path d="M15 19h6" />
    </svg>
  );
}

export function IconThrow(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20l14-14" />
      <path d="M14 4l4 0 0 4" />
      <path d="M4 20l4-1" />
    </svg>
  );
}

export function IconShooting(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
    </svg>
  );
}

export function IconUsers(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17.5" cy="8.5" r="2.4" />
      <path d="M15.5 14.2c2.4.4 4.5 2.5 4.5 5.8" />
    </svg>
  );
}

export function IconFlag(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M5 3v18" />
      <path d="M5 4h13l-3 4 3 4H5" />
    </svg>
  );
}

export function IconMedal(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="15" r="5" />
      <path d="M9 3h6l-2 8h-2z" />
      <path d="M11 15l1-1.4 1 1.4" />
    </svg>
  );
}

export function IconStopwatch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13V9" />
      <path d="M10 2h4" />
      <path d="M18.5 6.5l1.2-1.2" />
    </svg>
  );
}

export function IconDownload(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4v11" />
      <path d="M7 11l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  );
}

export function IconPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconChevronLeft(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
