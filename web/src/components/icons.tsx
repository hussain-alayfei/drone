/**
 * أيقونات SVG خطية مخصصة — سماكة موحدة 1.5، اللون من currentColor.
 * مرسومة يدوياً لهوية «عين»؛ لا مكتبات أيقونات ولا إيموجي (DESIGN_SPEC §5).
 */
import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 32 32",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function DroneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="12" y="13" width="8" height="6" rx="1.5" />
      <path d="M12 15 L6 10 M20 15 L26 10 M12 17.5 L6 22.5 M20 17.5 L26 22.5" />
      <path d="M3 9.5 H9 M23 9.5 H29 M3 23 H9 M23 23 H29" />
      <path d="M16 19 V22" />
      <circle cx="16" cy="24" r="1.4" />
    </svg>
  );
}

export function SensorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="8" y="11" width="16" height="10" rx="5" />
      <path d="M12 11 V8.5 M20 11 V8.5" />
      <path d="M13 25 q3 2.5 6 0" />
      <path d="M11 27.5 q5 3.5 10 0" />
      <circle cx="16" cy="16" r="2" />
    </svg>
  );
}

export function ChipIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="9" y="9" width="14" height="14" rx="2" />
      <path d="M13 9 V5 M19 9 V5 M13 23 V27 M19 23 V27 M9 13 H5 M9 19 H5 M23 13 H27 M23 19 H27" />
      <path d="M13.5 16 h2 l1.5 -2.5 l1.5 5 l1 -2.5 h1.5" />
    </svg>
  );
}

export function BulletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M16 3.5 C21 9 22.5 14 22.5 19.5 A6.5 6.5 0 0 1 9.5 19.5 C9.5 14 11 9 16 3.5 Z" />
      <ellipse cx="16" cy="19.5" rx="3" ry="3.8" />
      <path d="M16 26 c0 2 1 2.8 2.5 3" />
    </svg>
  );
}

export function LeafIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M8 24 C8 13 15 7 26 6 C25 17 19 24 8 24 Z" />
      <path d="M8 24 C13 19 18 14 23 9" />
      <path d="M8 24 c-1.5 1.5 -2.5 3 -3 4.5" />
    </svg>
  );
}

export function RadiationIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="16" cy="18" r="2" />
      <path d="M9 25 a10 10 0 0 1 14 0" />
      <path d="M6 28 a14 14 0 0 1 20 0" transform="rotate(180 16 18)" />
      <path d="M10 11 a8.5 8.5 0 0 1 12 0" />
      <path d="M7 8 a12.5 12.5 0 0 1 18 0" />
    </svg>
  );
}

export function MineralIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M16 5 L25 12 L21.5 26 H10.5 L7 12 Z" />
      <path d="M16 5 L13 12 L16 26 M16 5 L19.5 12 M7 12 H25 M13 12 L10.5 26 M19.5 12 L21.5 26" />
    </svg>
  );
}

export function DropletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M16 4 C21 10.5 24 15 24 19.5 a8 8 0 0 1 -16 0 C8 15 11 10.5 16 4 Z" />
      <path d="M12.5 19.5 a3.5 3.5 0 0 0 3 3.5" />
    </svg>
  );
}

export function SoilLayersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12 h22 M5 19 h22" />
      <rect x="5" y="5" width="22" height="22" rx="2" />
      <path d="M9 8.5 h.01 M15 9.5 h.01 M21 8 h.01 M11 15.5 h.01 M18 16 h.01 M24 15 h.01 M8 23 h.01 M14 24 h.01 M22 22.5 h.01" strokeWidth="2.2" />
    </svg>
  );
}

export function SaltIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M16 5 L28 26 H4 Z" />
      <path d="M16 13 V19.5" />
      <path d="M16 23 h.01" strokeWidth="2.4" />
    </svg>
  );
}

export function ArrowDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M16 6 V26 M8 18 l8 8 8 -8" />
    </svg>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M6 17 l7 7 L26 9" />
    </svg>
  );
}
