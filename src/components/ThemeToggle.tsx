import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-2 ${compact ? "" : "w-full"}`}
      title={dark ? "Switch to light" : "Switch to dark"}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={dark}
    >
      <span className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-portal-border bg-portal-muted-bg p-0.5">
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-portal-invert shadow-sm transition-transform duration-300 ease-out ${
            dark ? "translate-x-6" : "translate-x-0"
          }`}
        />
        <span
          className={`relative z-10 grid h-6 w-6 place-items-center ${
            dark ? "text-portal-invert" : "text-portal-invert-text"
          }`}
        >
          <Sun size={12} />
        </span>
        <span
          className={`relative z-10 grid h-6 w-6 place-items-center ${
            dark ? "text-portal-invert-text" : "text-portal-invert"
          }`}
        >
          <Moon size={12} />
        </span>
      </span>
      {!compact && (
        <span className="text-[11px] font-medium text-portal-muted">{dark ? "Dark" : "Light"}</span>
      )}
    </button>
  );
}
