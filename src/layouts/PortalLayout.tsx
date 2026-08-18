import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import {
  CheckSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Users,
  UserCircle,
  X,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AmbientField from "@/components/AmbientField";
import { useAuth } from "@/context/AuthContext";
import { getActiveTeamName } from "@/lib/storage";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/teams", label: "Teams", icon: Users },
  { to: "/profile", label: "Profile", icon: UserCircle },
];

export default function PortalLayout() {
  const { fastApiUser, signOut } = useAuth();
  const teamName = getActiveTeamName();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!fastApiUser) return null;

  const sidebar = (
    <>
      <div className="border-b border-white/10 px-4 py-4">
        <div className="text-lg font-semibold tracking-tight text-portal-text">AssetCues</div>
        <div className="mt-0.5 text-[11px] text-neutral-400">Portal</div>
        <div className="mt-3 h-1 w-8 rounded-full bg-white/80" />
        {teamName && (
          <div className="glass mt-3 rounded-lg px-2 py-1 text-[11px] text-neutral-300">
            Team · {teamName}
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) => cn("nav-tab", isActive && "nav-tab-active")}
          >
            <span className="nav-tab-bar" />
            <Icon size={16} className="nav-tab-icon" />
            <span className="nav-tab-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <ThemeToggle />
        <div className="mt-3 truncate text-xs font-medium text-portal-text">{fastApiUser.full_name}</div>
        <div className="truncate text-[10px] text-neutral-400">{fastApiUser.email}</div>
        <button
          type="button"
          onClick={() => signOut()}
          className="glass mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs text-portal-muted transition hover:bg-white/15 hover:text-portal-text pressable"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="moon-shell relative flex h-screen overflow-hidden bg-portal-bg text-portal-text">
      <AmbientField />
      <aside className="glass relative z-10 hidden w-56 shrink-0 flex-col border-r border-white/10 md:flex">
        {sidebar}
      </aside>

      {menuOpen && (
        <div className="absolute inset-0 z-30 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="glass relative z-10 flex h-full w-64 flex-col border-r border-white/10">
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg p-1 text-portal-muted"
              onClick={() => setMenuOpen(false)}
              aria-label="Close"
            >
              <X size={16} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="glass flex items-center gap-2 border-b border-white/10 px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-lg p-2 text-portal-text"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1 truncate text-sm font-semibold">AssetCues</div>
          <ThemeToggle compact />
        </div>
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="pointer-events-none absolute inset-0 moon-grid opacity-40" />
          <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto chat-scroll">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
