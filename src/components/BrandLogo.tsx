import type { CSSProperties } from "react";

const DOTS: { cx: number; cy: number; r: number; fill: string }[] = [
  { cx: 22.5, cy: 74.5, r: 7.11, fill: "#F05A2A" },
  { cx: 38.5, cy: 58.5, r: 6.32, fill: "#DB5536" },
  { cx: 38.5, cy: 90.5, r: 7.95, fill: "#F05A2A" },
  { cx: 54.5, cy: 74.5, r: 6.85, fill: "#DE5635" },
  { cx: 54.5, cy: 42.5, r: 5.17, fill: "#00B2B9" },
  { cx: 54.5, cy: 106.5, r: 8.81, fill: "#F05A2A" },
  { cx: 70.5, cy: 90.5, r: 9.05, fill: "#DE5634" },
  { cx: 70.5, cy: 122.5, r: 9.31, fill: "#F05A2A" },
  { cx: 70.5, cy: 58.5, r: 5.71, fill: "#00B2B9" },
  { cx: 70.5, cy: 26.5, r: 4.33, fill: "#00B2B9" },
  { cx: 86.5, cy: 74.5, r: 9.25, fill: "#C4456A" },
  { cx: 86.5, cy: 106.5, r: 9.45, fill: "#DE5634" },
  { cx: 86.5, cy: 42.5, r: 4.7, fill: "#00B2B9" },
  { cx: 102.5, cy: 90.5, r: 9.24, fill: "#C4456A" },
  { cx: 102.5, cy: 58.5, r: 9.35, fill: "#563587" },
  { cx: 118.5, cy: 106.5, r: 4.85, fill: "#00B2B9" },
  { cx: 118.5, cy: 42.5, r: 9.18, fill: "#3C4691" },
  { cx: 118.5, cy: 74.5, r: 8.92, fill: "#543587" },
  { cx: 134.5, cy: 26.5, r: 9.35, fill: "#2A6494" },
  { cx: 134.5, cy: 58.5, r: 8.84, fill: "#3D4591" },
  { cx: 134.5, cy: 122.5, r: 4.31, fill: "#00B2B9" },
  { cx: 134.5, cy: 90.5, r: 5.7, fill: "#00B2B9" },
  { cx: 150.5, cy: 42.5, r: 8.8, fill: "#2A6494" },
  { cx: 150.5, cy: 106.5, r: 5.15, fill: "#00B2B9" },
  { cx: 150.5, cy: 74.5, r: 6.67, fill: "#00B2B9" },
  { cx: 166.5, cy: 58.5, r: 7.97, fill: "#00B2B9" },
  { cx: 166.5, cy: 90.5, r: 6.04, fill: "#00B2B9" },
  { cx: 182.5, cy: 74.5, r: 7.33, fill: "#00B2B9" },
];

export default function BrandLogo() {
  return (
    <svg
      className="brand-logo"
      viewBox="8 12 190 128"
      role="img"
      aria-label="AssetCues"
    >
      {DOTS.map((d, i) => {
        const delay = 0.04 + ((d.cx - 22.5) / 160) * 0.55 + (i % 3) * 0.03;
        return (
          <g
            key={`${d.cx}-${d.cy}`}
            className="dot-logo-pop"
            style={{ "--d": `${delay}s` } as CSSProperties}
          >
            <circle
              className="dot-logo-node"
              cx={d.cx}
              cy={d.cy}
              r={d.r}
              fill={d.fill}
              style={{ "--b": `${2.4 + (i % 6) * 0.22}s`, "--bd": `${delay + 0.75}s` } as CSSProperties}
            />
          </g>
        );
      })}
    </svg>
  );
}
