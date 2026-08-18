export default function AmbientField({ className = "" }: { className?: string }) {
  return (
    <div className={`ambient-field pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="ambient-orb ambient-orb-a" />
      <div className="ambient-orb ambient-orb-b" />
      <div className="ambient-orb ambient-orb-c" />
      <div className="ambient-grid" />
      <div className="ambient-dust">
        {Array.from({ length: 28 }).map((_, i) => (
          <span key={i} className="ambient-dot" style={{ ["--i" as string]: String(i) }} />
        ))}
      </div>
      <div className="ambient-ring" />
    </div>
  );
}
