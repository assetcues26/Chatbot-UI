import { useCallback, useRef, useState } from "react";
import BrandLogo from "./BrandLogo";

export default function BrandStage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: py * -8, y: px * 10 });
  }, []);

  const onLeave = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  return (
    <div
      ref={stageRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="brand-stage relative z-10 flex h-[42vh] w-full shrink-0 flex-col items-center justify-center overflow-hidden border-b border-portal-border md:h-auto md:min-h-screen md:w-1/2 md:border-b-0 md:border-r"
    >
      <div className="pointer-events-none absolute inset-0 brand-stage-grid" />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <div
          className="logo-rig"
          style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
        >
          <div className="brand-logo-scene">
            <BrandLogo />
          </div>
        </div>
        <div className="logo-shadow" />
        <div className="mt-6 text-center">
          <div className="logo-wordmark font-display text-4xl font-semibold tracking-[-0.06em] md:text-5xl">
            AssetCues
          </div>
          <div className="mt-2 text-[11px] uppercase tracking-[0.38em] text-portal-muted">Portal</div>
        </div>
      </div>
      <p className="relative z-10 hidden px-10 pb-10 text-center text-[11px] text-portal-muted md:block">
        Minimal · Black &amp; white · Knowledge
      </p>
    </div>
  );
}
